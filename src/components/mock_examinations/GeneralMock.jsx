'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import { calculateGradeFrom100, isPassingGrade } from './mockExamService';

const IDB_NAME = 'ClassLogsGeneralMockDB';
const IDB_STORE = 'mock_cache';

function openMockIDB() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const db = await openMockIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const db = await openMockIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });
}

function readLocalJson(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Ignore storage quota errors
  }
}

function normalizeClassName(val) {
  return String(val || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSeries(val) {
  const s = String(val || '').trim();
  if (!s || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NONE') return '';
  return s.toUpperCase();
}

function resolveGrade(numericVal, isALevel) {
  if (typeof calculateGradeFrom100 === 'function') {
    const res = calculateGradeFrom100(numericVal, 'General Education', isALevel);
    if (res) return res;
  }
  if (isALevel) {
    if (numericVal >= 80) return 'A';
    if (numericVal >= 70) return 'B';
    if (numericVal >= 60) return 'C';
    if (numericVal >= 50) return 'D';
    if (numericVal >= 40) return 'E';
    if (numericVal >= 35) return 'O';
    return 'F';
  }
  if (numericVal >= 80) return 'A';
  if (numericVal >= 65) return 'B';
  if (numericVal >= 50) return 'C';
  if (numericVal >= 40) return 'D';
  if (numericVal >= 30) return 'E';
  return 'U';
}

function checkIsPassing(grade, isALevel) {
  if (!grade) return false;
  if (typeof isPassingGrade === 'function') {
    return Boolean(isPassingGrade(grade, 'General Education', isALevel));
  }
  const g = String(grade).toUpperCase().trim();
  if (isALevel) return ['A', 'B', 'C', 'D', 'E'].includes(g);
  return ['A', 'B', 'C'].includes(g);
}

export default function GeneralMock({
  schoolId,
  userId,
  schoolDetails = {},
  studentsList,
  canEnterMarks = true,
  onClose
}) {
  const [examType, setExamType] = useState('MOCK'); // 'PRE_MOCK' or 'MOCK'
  const [examLevel, setExamLevel] = useState('O_LEVEL'); // 'O_LEVEL' or 'A_LEVEL'
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [viewMode, setViewMode] = useState('compiled'); // 'compiled' or 'grid'
  const [showMinsecPreview, setShowMinsecPreview] = useState(false);

  const [dbStudents, setDbStudents] = useState([]);
  const [coeffRows, setCoeffRows] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [draftInputs, setDraftInputs] = useState({});
  const [tenantDetails, setTenantDetails] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'queued'
  const [lastSaveError, setLastSaveError] = useState('');

  const saveTimersRef = useRef({});
  const gridScrollRef = useRef(null);

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);
  const sectionName = 'General Education';

  // Strict multi-tenant school identifier resolution (NEVER picks another tenant's row)
  const requestedSchoolIds = useMemo(() => {
    const list = [];
    const pushId = (v) => {
      if (v && typeof v === 'string' && v.trim() && !list.includes(v.trim())) {
        list.push(v.trim());
      }
    };
    pushId(schoolId);
    pushId(schoolDetails?.school_id);
    pushId(schoolDetails?.id);
    if (Array.isArray(studentsList) && studentsList.length > 0 && studentsList[0]?.school_id) {
      pushId(studentsList[0].school_id);
    }
    if (typeof window !== 'undefined') {
      pushId(window.localStorage.getItem('active_school_id'));
      pushId(window.localStorage.getItem('school_id'));
      pushId(window.localStorage.getItem('user_school_id'));
    }
    return list;
  }, [schoolId, schoolDetails, studentsList]);

  // All valid identifiers belonging ONLY to the current school (both school_details.id and school_details.school_id)
  const allowedTenantIds = useMemo(() => {
    const set = new Set();
    requestedSchoolIds.forEach((id) => set.add(id));
    if (tenantDetails?.id) set.add(String(tenantDetails.id));
    if (tenantDetails?.school_id) set.add(String(tenantDetails.school_id));
    if (schoolDetails?.id) set.add(String(schoolDetails.id));
    if (schoolDetails?.school_id) set.add(String(schoolDetails.school_id));
    return Array.from(set);
  }, [requestedSchoolIds, tenantDetails, schoolDetails]);

  // Primary school_id used when writing to mockmarks
  const effectiveSchoolId = useMemo(() => {
    return (
      (tenantDetails?.school_id && String(tenantDetails.school_id)) ||
      (schoolDetails?.school_id && String(schoolDetails.school_id)) ||
      (schoolId && String(schoolId)) ||
      (tenantDetails?.id && String(tenantDetails.id)) ||
      (schoolDetails?.id && String(schoolDetails.id)) ||
      requestedSchoolIds[0] ||
      ''
    );
  }, [tenantDetails, schoolDetails, schoolId, requestedSchoolIds]);

  // Fetch exact tenant row from `school_details` (never defaults to row[0] of another school)
  useEffect(() => {
    let active = true;
    async function loadCurrentTenantDetails() {
      let lookupIds = [...requestedSchoolIds];

      // If no school ID was passed in props/localStorage, resolve from the signed-in user's profile
      if (lookupIds.length === 0) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const uid = userId || authData?.user?.id;
          if (uid) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('school_id')
              .eq('id', uid)
              .maybeSingle();
            if (prof?.school_id) {
              lookupIds.push(String(prof.school_id));
            }
          }
        } catch (_) {
          // Ignore auth lookup error
        }
      }

      if (lookupIds.length === 0) return;

      for (const candidateId of lookupIds) {
        try {
          const { data: bySchoolId } = await supabase
            .from('school_details')
            .select('id, school_id, name')
            .eq('school_id', candidateId)
            .maybeSingle();

          if (!active) return;
          if (bySchoolId) {
            setTenantDetails(bySchoolId);
            return;
          }

          const { data: byRowId } = await supabase
            .from('school_details')
            .select('id, school_id, name')
            .eq('id', candidateId)
            .maybeSingle();

          if (!active) return;
          if (byRowId) {
            setTenantDetails(byRowId);
            return;
          }
        } catch (_) {
          // Try next candidateId
        }
      }
    }

    loadCurrentTenantDetails();
    return () => {
      active = false;
    };
  }, [requestedSchoolIds, userId]);

  const schoolDisplayName = useMemo(() => {
    return (
      tenantDetails?.name ||
      schoolDetails?.name ||
      schoolDetails?.school_name ||
      (typeof window !== 'undefined' && window.localStorage.getItem('school_name')) ||
      'School Examination Board'
    );
  }, [tenantDetails, schoolDetails]);

  const targetClasses = useMemo(() => {
    return examLevel === 'O_LEVEL'
      ? ['Form 5A (F5A)', 'Form 5B (F5B)']
      : ['Upper Sixth Arts (U6A)', 'Upper Sixth Science (U6S)'];
  }, [examLevel]);

  useEffect(() => {
    setSelectedClassFilter('ALL');
    setSelectedSeriesFilter('ALL');
  }, [examLevel]);

  useEffect(() => {
    setDraftInputs({});
  }, [examType, examLevel]);

  const toggleHighlightStudent = useCallback((studentId) => {
    setHighlightedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedIds([]);
  }, []);

  // International-standard desktop horizontal scroll: Shift + Mouse Wheel + Quick-Pan Buttons
  const handleTableWheel = useCallback((e) => {
    const container = gridScrollRef.current;
    if (!container) return;
    if (e.shiftKey && Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, []);

  const panTableHorizontally = useCallback((deltaPx) => {
    const container = gridScrollRef.current;
    if (!container) return;
    container.scrollBy({ left: deltaPx, behavior: 'smooth' });
  }, []);

  // 1. Offline-First Hydration scoped strictly to `effectiveSchoolId`
  useEffect(() => {
    if (!effectiveSchoolId) return;
    let active = true;

    const stuCacheKey = `cl_genmock_students_${effectiveSchoolId}`;
    const coeffCacheKey = `cl_genmock_coeffs_${effectiveSchoolId}`;
    const marksCacheKey = `cl_genmock_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;
    const hlCacheKey = `cl_genmock_highlights_${effectiveSchoolId}`;

    const localStu = readLocalJson(stuCacheKey, null);
    if (Array.isArray(localStu) && localStu.length > 0) {
      setDbStudents(localStu);
    } else {
      setDbStudents([]);
    }

    const localCoeff = readLocalJson(coeffCacheKey, null);
    if (Array.isArray(localCoeff) && localCoeff.length > 0) {
      setCoeffRows(localCoeff);
    } else {
      setCoeffRows([]);
    }

    const localMarks = readLocalJson(marksCacheKey, null);
    if (localMarks && typeof localMarks === 'object') {
      setMarksData(localMarks);
    } else {
      setMarksData({});
    }

    const localHl = readLocalJson(hlCacheKey, null);
    if (Array.isArray(localHl)) {
      setHighlightedIds(localHl);
    }

    (async () => {
      const [idbStu, idbCoeff, idbMarks, idbHl] = await Promise.all([
        idbGet(stuCacheKey),
        idbGet(coeffCacheKey),
        idbGet(marksCacheKey),
        idbGet(hlCacheKey)
      ]);
      if (!active) return;

      if (Array.isArray(idbStu) && idbStu.length > 0 && (!localStu || localStu.length === 0)) {
        setDbStudents(idbStu);
      }
      if (Array.isArray(idbCoeff) && idbCoeff.length > 0 && (!localCoeff || localCoeff.length === 0)) {
        setCoeffRows(idbCoeff);
      }
      if (idbMarks && typeof idbMarks === 'object' && (!localMarks || Object.keys(localMarks).length === 0)) {
        setMarksData(idbMarks);
      }
      if (Array.isArray(idbHl) && !localHl) {
        setHighlightedIds(idbHl);
      }
    })();

    return () => {
      active = false;
    };
  }, [effectiveSchoolId, currentAcademicYear, examType]);

  // Persist highlighted students locally + IndexedDB per school
  useEffect(() => {
    if (!effectiveSchoolId) return;
    const hlCacheKey = `cl_genmock_highlights_${effectiveSchoolId}`;
    writeLocalJson(hlCacheKey, highlightedIds);
    idbSet(hlCacheKey, highlightedIds);
  }, [effectiveSchoolId, highlightedIds]);

  // 2. Fetch Students & Allocated Subjects strictly filtered by the active school's tenant IDs
  useEffect(() => {
    if (!effectiveSchoolId || allowedTenantIds.length === 0) return;
    let active = true;

    async function syncSchoolRecords() {
      try {
        await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
      } catch (_) {
        // Optional database RPC
      }

      try {
        const hasPropStudents = Array.isArray(studentsList) && studentsList.length > 0;

        const [stuRes, coeffRes] = await Promise.all([
          hasPropStudents
            ? Promise.resolve({ data: studentsList, error: null })
            : supabase
                .from('students')
                .select('*')
                .in('school_id', allowedTenantIds),
          supabase
            .from('class_coefficients')
            .select('*')
            .eq('section', sectionName)
            .in('school_id', allowedTenantIds)
        ]);

        if (!active) return;

        if (!stuRes.error && Array.isArray(stuRes.data)) {
          // Double-guard: strictly filter to active tenant IDs and deduplicate by id
          const tenantIdSet = new Set(allowedTenantIds);
          const uniqueMap = new Map();
          stuRes.data.forEach((s) => {
            if (s.school_id && !tenantIdSet.has(String(s.school_id))) return;
            if (s.id && !uniqueMap.has(String(s.id))) {
              uniqueMap.set(String(s.id), s);
            }
          });
          const cleanStudents = Array.from(uniqueMap.values());
          setDbStudents(cleanStudents);
          const stuCacheKey = `cl_genmock_students_${effectiveSchoolId}`;
          writeLocalJson(stuCacheKey, cleanStudents);
          idbSet(stuCacheKey, cleanStudents);
        }

        if (!coeffRes.error && Array.isArray(coeffRes.data)) {
          const tenantIdSet = new Set(allowedTenantIds);
          const cleanCoeffs = coeffRes.data.filter(
            (c) => !c.school_id || tenantIdSet.has(String(c.school_id))
          );
          setCoeffRows(cleanCoeffs);
          const coeffCacheKey = `cl_genmock_coeffs_${effectiveSchoolId}`;
          writeLocalJson(coeffCacheKey, cleanCoeffs);
          idbSet(coeffCacheKey, cleanCoeffs);
        }
      } catch (err) {
        console.warn('Offline fallback active for students/coefficients:', err);
      }
    }

    syncSchoolRecords();
    return () => {
      active = false;
    };
  }, [effectiveSchoolId, allowedTenantIds, studentsList]);

  const enqueueOfflineMark = useCallback(
    async (payload) => {
      if (!effectiveSchoolId) return;
      const queueKey = `cl_genmock_pending_queue_${effectiveSchoolId}`;
      const existingQueue = readLocalJson(queueKey, []);
      const filteredQueue = (Array.isArray(existingQueue) ? existingQueue : []).filter(
        (item) =>
          !(
            item.student_id === payload.student_id &&
            item.subject_name === payload.subject_name &&
            item.exam_type === payload.exam_type &&
            item.academic_year === payload.academic_year
          )
      );
      filteredQueue.push(payload);
      writeLocalJson(queueKey, filteredQueue);
      await idbSet(queueKey, filteredQueue);
    },
    [effectiveSchoolId]
  );

  // Core writer on `mockmarks`:
  // - `.upsert(..., { onConflict: 'school_id,student_id,subject_name,exam_type,academic_year' })` prevents duplicate key collisions
  // - `.delete().select()` permanently removes cleared marks from Supabase
  const writeSingleMarkToDatabase = useCallback(async (payload, marksCacheKey) => {
    try {
      if (payload._delete) {
        const { data: deletedRows, error: delErr } = await supabase
          .from('mockmarks')
          .delete()
          .eq('school_id', payload.school_id)
          .eq('student_id', payload.student_id)
          .eq('subject_name', payload.subject_name)
          .eq('exam_type', payload.exam_type)
          .eq('academic_year', payload.academic_year)
          .select('id');

        if (delErr) {
          throw new Error(delErr.message);
        }

        if (!deletedRows || deletedRows.length === 0) {
          const { data: checkRows } = await supabase
            .from('mockmarks')
            .select('id')
            .eq('school_id', payload.school_id)
            .eq('student_id', payload.student_id)
            .eq('subject_name', payload.subject_name)
            .eq('exam_type', payload.exam_type)
            .eq('academic_year', payload.academic_year);

          if (Array.isArray(checkRows) && checkRows.length > 0) {
            throw new Error(
              'Supabase RLS blocked DELETE on mockmarks. Ensure DELETE policy is enabled on mockmarks.'
            );
          }
        }

        setMarksData((prev) => {
          const next = { ...prev };
          delete next[`${payload.student_id}_${payload.subject_name}`];
          writeLocalJson(marksCacheKey, next);
          idbSet(marksCacheKey, next);
          return next;
        });

        return { ok: true, error: '' };
      }

      const conflictTarget = 'school_id,student_id,subject_name,exam_type,academic_year';
      let savedRow = null;

      const { data: upsertData, error: upsertErr } = await supabase
        .from('mockmarks')
        .upsert(payload, { onConflict: conflictTarget })
        .select()
        .single();

      if (upsertErr) {
        if (upsertErr.message && upsertErr.message.includes('updated_by')) {
          const { updated_by, ...noUserPayload } = payload;
          const { data: retryData, error: retryErr } = await supabase
            .from('mockmarks')
            .upsert(noUserPayload, { onConflict: conflictTarget })
            .select()
            .single();
          if (retryErr) throw new Error(retryErr.message);
          savedRow = retryData;
        } else {
          throw new Error(upsertErr.message);
        }
      } else {
        savedRow = upsertData;
      }

      if (savedRow) {
        setMarksData((prev) => {
          const next = {
            ...prev,
            [`${payload.student_id}_${payload.subject_name}`]: savedRow
          };
          writeLocalJson(marksCacheKey, next);
          idbSet(marksCacheKey, next);
          return next;
        });
      }

      return { ok: true, error: '' };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || 'Database write to mockmarks failed'
      };
    }
  }, []);

  const flushPendingQueue = useCallback(async () => {
    if (!effectiveSchoolId) return;
    const queueKey = `cl_genmock_pending_queue_${effectiveSchoolId}`;
    const queue = readLocalJson(queueKey, []);
    if (!Array.isArray(queue) || queue.length === 0) return;

    try {
      await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
    } catch (_) {
      // Optional database RPC
    }

    const remaining = [];
    for (const rawItem of queue) {
      const normalizedItem = {
        ...rawItem,
        school_id: effectiveSchoolId
      };
      const cacheKey = `cl_genmock_marks_${effectiveSchoolId}_${normalizedItem.academic_year}_${normalizedItem.exam_type}`;
      const res = await writeSingleMarkToDatabase(normalizedItem, cacheKey);
      if (!res.ok) {
        remaining.push(normalizedItem);
      }
    }

    writeLocalJson(queueKey, remaining);
    await idbSet(queueKey, remaining);
    if (remaining.length === 0) {
      setSyncStatus('synced');
      setLastSaveError('');
    }
  }, [effectiveSchoolId, writeSingleMarkToDatabase]);

  // 3. Fetch & Realtime Sync on `mockmarks` strictly for `effectiveSchoolId`
  const fetchLatestMockMarks = useCallback(async () => {
    if (!effectiveSchoolId) return;
    const marksCacheKey = `cl_genmock_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

    try {
      await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
    } catch (_) {
      // Optional database RPC
    }

    try {
      const { data, error } = await supabase
        .from('mockmarks')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .eq('section', sectionName)
        .eq('exam_type', examType)
        .eq('academic_year', currentAcademicYear);

      if (error) {
        setLastSaveError(error.message);
        return;
      }

      if (Array.isArray(data)) {
        const map = {};
        data.forEach((row) => {
          if (
            row.student_id &&
            row.subject_name &&
            row.mark_100 !== null &&
            row.mark_100 !== undefined &&
            row.mark_100 !== ''
          ) {
            map[`${row.student_id}_${row.subject_name}`] = row;
          }
        });
        setMarksData(map);
        writeLocalJson(marksCacheKey, map);
        idbSet(marksCacheKey, map);
        await flushPendingQueue();
      }
    } catch (err) {
      console.warn('Using cached mockmarks:', err);
    }
  }, [effectiveSchoolId, currentAcademicYear, examType, flushPendingQueue]);

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const marksCacheKey = `cl_genmock_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

    fetchLatestMockMarks();

    const channel = supabase
      .channel(`mockmarks_live_${effectiveSchoolId}_${examType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mockmarks',
          filter: `school_id=eq.${effectiveSchoolId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old;
            if (oldRow?.student_id && oldRow?.subject_name) {
              setMarksData((prev) => {
                const next = { ...prev };
                delete next[`${oldRow.student_id}_${oldRow.subject_name}`];
                writeLocalJson(marksCacheKey, next);
                idbSet(marksCacheKey, next);
                return next;
              });
            }
            return;
          }

          const row = payload.new;
          if (!row || row.section !== sectionName || row.exam_type !== examType) return;
          if (row.academic_year && row.academic_year !== currentAcademicYear) return;

          setMarksData((prev) => {
            const next = { ...prev };
            if (row.mark_100 === null || row.mark_100 === undefined || row.mark_100 === '') {
              delete next[`${row.student_id}_${row.subject_name}`];
            } else {
              next[`${row.student_id}_${row.subject_name}`] = row;
            }
            writeLocalJson(marksCacheKey, next);
            idbSet(marksCacheKey, next);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveSchoolId, currentAcademicYear, examType, fetchLatestMockMarks]);

  const persistMarkToDatabase = useCallback(
    async (student, subjectName, numericVal) => {
      if (!canEnterMarks || !effectiveSchoolId) return;

      const marksCacheKey = `cl_genmock_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

      if (numericVal === '' || numericVal === undefined || numericVal === null) {
        setSyncStatus('saving');
        setLastSaveError('');

        const deletePayload = {
          _delete: true,
          school_id: effectiveSchoolId,
          academic_year: currentAcademicYear,
          exam_type: examType,
          student_id: student.id,
          subject_name: subjectName
        };

        const res = await writeSingleMarkToDatabase(deletePayload, marksCacheKey);
        if (res.ok) {
          setSyncStatus('synced');
          setLastSaveError('');
        } else {
          await enqueueOfflineMark(deletePayload);
          setSyncStatus('queued');
          setLastSaveError(res.error);
        }
        return;
      }

      if (Number.isNaN(Number(numericVal))) return;

      const cleanScore = Math.min(100, Math.max(0, Number(numericVal)));
      const isALevel = examLevel === 'A_LEVEL';
      const grade = resolveGrade(cleanScore, isALevel);
      const classLvl = student.classLevel || student.class_name || targetClasses[0];
      const seriesVal = normalizeSeries(student.trades_series || student.series) || null;
      const matriculeVal = student.unique_code || student.matricule || '';

      setSyncStatus('saving');
      setLastSaveError('');

      try {
        await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
      } catch (_) {
        // Optional database RPC
      }

      let validUpdatedBy = userId || null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          validUpdatedBy = authData.user.id;
        }
      } catch (_) {
        // Keep passed userId
      }

      const payload = {
        school_id: effectiveSchoolId,
        academic_year: currentAcademicYear,
        exam_type: examType,
        section: sectionName,
        classLevel: classLvl,
        student_id: student.id,
        matricule: matriculeVal,
        subject_name: subjectName,
        trades_series: seriesVal,
        mark_100: cleanScore,
        letter_grade: grade,
        updated_by: validUpdatedBy,
        updated_at: new Date().toISOString()
      };

      const res = await writeSingleMarkToDatabase(payload, marksCacheKey);
      if (res.ok) {
        setSyncStatus('synced');
        setLastSaveError('');
        await flushPendingQueue();
      } else {
        await enqueueOfflineMark(payload);
        setSyncStatus('queued');
        setLastSaveError(res.error);
      }
    },
    [
      canEnterMarks,
      effectiveSchoolId,
      examLevel,
      targetClasses,
      currentAcademicYear,
      examType,
      userId,
      writeSingleMarkToDatabase,
      flushPendingQueue,
      enqueueOfflineMark
    ]
  );

  const handleScoreChange = useCallback(
    (student, subjectName, rawValue) => {
      if (!canEnterMarks || !effectiveSchoolId) return;

      const strVal = String(rawValue ?? '');
      if (strVal !== '' && !/^\d*\.?\d*$/.test(strVal)) {
        return;
      }

      const key = `${student.id}_${subjectName}`;
      const marksCacheKey = `cl_genmock_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

      if (saveTimersRef.current[key]) {
        clearTimeout(saveTimersRef.current[key]);
      }

      if (strVal.trim() === '') {
        setDraftInputs((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        setMarksData((prev) => {
          const next = { ...prev };
          delete next[key];
          writeLocalJson(marksCacheKey, next);
          idbSet(marksCacheKey, next);
          return next;
        });

        saveTimersRef.current[key] = setTimeout(() => {
          persistMarkToDatabase(student, subjectName, '');
        }, 200);
        return;
      }

      setDraftInputs((prev) => ({ ...prev, [key]: strVal }));

      const parsed = Number(strVal);
      if (Number.isNaN(parsed)) return;

      const numericVal = Math.min(100, Math.max(0, parsed));
      if (parsed > 100) {
        setDraftInputs((prev) => ({ ...prev, [key]: '100' }));
      }

      const isALevel = examLevel === 'A_LEVEL';
      const grade = resolveGrade(numericVal, isALevel);

      setMarksData((prev) => {
        const next = {
          ...prev,
          [key]: {
            ...prev[key],
            school_id: effectiveSchoolId,
            academic_year: currentAcademicYear,
            exam_type: examType,
            section: sectionName,
            classLevel: student.classLevel || student.class_name || targetClasses[0],
            student_id: student.id,
            matricule: student.unique_code || student.matricule || '',
            subject_name: subjectName,
            trades_series: normalizeSeries(student.trades_series || student.series) || null,
            mark_100: numericVal,
            letter_grade: grade
          }
        };
        writeLocalJson(marksCacheKey, next);
        idbSet(marksCacheKey, next);
        return next;
      });

      saveTimersRef.current[key] = setTimeout(() => {
        persistMarkToDatabase(student, subjectName, numericVal);
      }, 250);
    },
    [
      canEnterMarks,
      examLevel,
      effectiveSchoolId,
      currentAcademicYear,
      examType,
      targetClasses,
      persistMarkToDatabase
    ]
  );

  const handleScoreBlur = useCallback(
    (student, subjectName) => {
      if (!canEnterMarks) return;
      const key = `${student.id}_${subjectName}`;
      if (saveTimersRef.current[key]) {
        clearTimeout(saveTimersRef.current[key]);
        delete saveTimersRef.current[key];
      }

      const draftVal = draftInputs[key];
      setDraftInputs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      if (draftVal === undefined) {
        const rec = marksData[key];
        const currentMark =
          rec && rec.mark_100 !== null && rec.mark_100 !== undefined && rec.mark_100 !== ''
            ? rec.mark_100
            : '';
        persistMarkToDatabase(student, subjectName, currentMark);
        return;
      }

      const trimmed = String(draftVal).trim();
      persistMarkToDatabase(student, subjectName, trimmed === '' ? '' : Number(trimmed));
    },
    [canEnterMarks, draftInputs, marksData, persistMarkToDatabase]
  );

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Deduplicated, tenant-isolated student list
  const sourceStudents = useMemo(() => {
    const rawList =
      Array.isArray(studentsList) && studentsList.length > 0 ? studentsList : dbStudents;
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const tenantIdSet = new Set(allowedTenantIds);
    const seenIds = new Set();
    const seenKeys = new Set();
    const result = [];

    for (const s of rawList) {
      if (!s) continue;
      if (tenantIdSet.size > 0 && s.school_id && !tenantIdSet.has(String(s.school_id))) {
        continue;
      }

      const idKey = s.id ? String(s.id) : '';
      if (idKey) {
        if (seenIds.has(idKey)) continue;
        seenIds.add(idKey);
      }

      const normName = String(s.fullName || s.full_name || s.name || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      const normCls = normalizeClassName(
        s.classLevel || s.class_level || s.class_name || s.class || ''
      );
      const codeKey = String(s.unique_code || s.matricule || '').trim().toLowerCase();
      const compositeKey = codeKey
        ? `${codeKey}::${normCls}`
        : `${normName}::${normCls}`;

      if (compositeKey !== '::' && seenKeys.has(compositeKey)) continue;
      seenKeys.add(compositeKey);

      result.push(s);
    }

    return result;
  }, [studentsList, dbStudents, allowedTenantIds]);

  const availableSeries = useMemo(() => {
    const set = new Set();
    const allowedNorm = targetClasses.map(normalizeClassName);

    coeffRows.forEach((row) => {
      const rowNorm = normalizeClassName(row.classLevel || row.class_level);
      if (!allowedNorm.includes(rowNorm)) return;
      if (selectedClassFilter !== 'ALL' && rowNorm !== normalizeClassName(selectedClassFilter)) return;
      const ser = normalizeSeries(row.trades_series);
      if (ser) set.add(ser);
    });

    return Array.from(set).sort();
  }, [coeffRows, targetClasses, selectedClassFilter]);

  const candidates = useMemo(() => {
    if (!Array.isArray(sourceStudents) || sourceStudents.length === 0) return [];

    const allowedClean =
      examLevel === 'O_LEVEL'
        ? ['form 5a', 'form 5b', 'f5a', 'f5b']
        : ['upper sixth arts', 'upper sixth science', 'u6a', 'u6s'];

    const q = searchQuery.trim().toLowerCase();

    return sourceStudents
      .filter((s) => {
        const rawCls = String(
          s.classLevel || s.class_level || s.class_name || s.class || ''
        ).trim();
        const normCls = normalizeClassName(rawCls);

        if (!allowedClean.includes(rawCls.toLowerCase()) && !allowedClean.includes(normCls)) {
          return false;
        }

        if (
          selectedClassFilter !== 'ALL' &&
          normCls !== normalizeClassName(selectedClassFilter)
        ) {
          return false;
        }

        if (selectedSeriesFilter !== 'ALL') {
          const stuSeries = normalizeSeries(s.trades_series || s.series);
          if (stuSeries !== selectedSeriesFilter) return false;
        }

        if (q) {
          const nameStr = String(s.fullName || s.full_name || s.name || '').toLowerCase();
          const codeStr = String(s.unique_code || s.matricule || s.code || '').toLowerCase();
          if (!nameStr.includes(q) && !codeStr.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aName = String(a.fullName || a.full_name || a.name || '').toLowerCase();
        const bName = String(b.fullName || b.full_name || b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
  }, [sourceStudents, examLevel, selectedClassFilter, selectedSeriesFilter, searchQuery]);

  const { allocatedSubjects, classSeriesSubjectMap } = useMemo(() => {
    const allowedNorm = targetClasses.map(normalizeClassName);
    const subjectMap = new Map();
    const perClassSeries = new Map();

    coeffRows.forEach((row) => {
      const rowNorm = normalizeClassName(row.classLevel || row.class_level);
      if (!allowedNorm.includes(rowNorm)) return;

      if (
        selectedClassFilter !== 'ALL' &&
        rowNorm !== normalizeClassName(selectedClassFilter)
      ) {
        return;
      }

      const rowSeries = normalizeSeries(row.trades_series);
      if (selectedSeriesFilter !== 'ALL' && rowSeries && rowSeries !== selectedSeriesFilter) {
        return;
      }

      let rawSubs = row.subject_coefficients;
      if (typeof rawSubs === 'string') {
        try {
          rawSubs = JSON.parse(rawSubs);
        } catch (_) {
          rawSubs = [];
        }
      }
      if (!Array.isArray(rawSubs)) return;

      const bucketKey = `${rowNorm}::${rowSeries}`;
      if (!perClassSeries.has(bucketKey)) {
        perClassSeries.set(bucketKey, new Set());
      }
      const bucketSet = perClassSeries.get(bucketKey);

      rawSubs.forEach((item) => {
        const subName = String(
          item.name || item.subject_name || item.subject_code || ''
        ).trim();
        if (!subName) return;

        const coeffVal = Number(item.coeff ?? item.coefficient ?? 1);
        if (!Number.isNaN(coeffVal) && coeffVal <= 0) return;

        const normKey = subName.toLowerCase();
        bucketSet.add(subName);

        if (!subjectMap.has(normKey)) {
          subjectMap.set(normKey, {
            id: normKey,
            name: subName,
            code: item.code || subName,
            coeff: coeffVal || 1
          });
        }
      });
    });

    return {
      allocatedSubjects: Array.from(subjectMap.values()),
      classSeriesSubjectMap: perClassSeries
    };
  }, [coeffRows, targetClasses, selectedClassFilter, selectedSeriesFilter]);

  const isSubjectAllocatedToStudent = useCallback(
    (student, subjectName) => {
      const normCls = normalizeClassName(
        student.classLevel || student.class_level || student.class_name || ''
      );
      const stuSeries = normalizeSeries(student.trades_series || student.series);

      const exactSet = classSeriesSubjectMap.get(`${normCls}::${stuSeries}`);
      if (exactSet) {
        for (const s of exactSet) {
          if (s.toLowerCase() === subjectName.toLowerCase()) return true;
        }
        return false;
      }

      const defaultSet = classSeriesSubjectMap.get(`${normCls}::`);
      if (defaultSet) {
        for (const s of defaultSet) {
          if (s.toLowerCase() === subjectName.toLowerCase()) return true;
        }
        return false;
      }

      for (const [k, sSet] of classSeriesSubjectMap.entries()) {
        if (k.startsWith(`${normCls}::`)) {
          for (const s of sSet) {
            if (s.toLowerCase() === subjectName.toLowerCase()) return true;
          }
        }
      }
      return false;
    },
    [classSeriesSubjectMap]
  );

  const rankedCandidates = useMemo(() => {
    const isALevel = examLevel === 'A_LEVEL';
    const allocatedNames = new Set(allocatedSubjects.map((s) => s.name.toLowerCase()));

    const computed = candidates.map((student) => {
      const studentMarks = Object.keys(marksData)
        .filter((k) => k.startsWith(`${student.id}_`))
        .map((k) => marksData[k])
        .filter(
          (m) =>
            m &&
            m.mark_100 !== '' &&
            m.mark_100 !== undefined &&
            m.mark_100 !== null &&
            (allocatedNames.size === 0 ||
              allocatedNames.has(String(m.subject_name || '').toLowerCase()))
        );

      const passedSubjects = studentMarks
        .filter((m) => checkIsPassing(m.letter_grade, isALevel))
        .sort((a, b) => (Number(b.mark_100) || 0) - (Number(a.mark_100) || 0));

      const numPassed = passedSubjects.length;
      const totalPassedScore = passedSubjects.reduce(
        (sum, item) => sum + (Number(item.mark_100) || 0),
        0
      );
      const isPassed = isALevel ? numPassed >= 2 : numPassed >= 4;

      return {
        ...student,
        name: student.fullName || student.full_name || student.name || 'Candidate',
        studentClass: student.classLevel || student.class_name || targetClasses[0],
        studentSeries: normalizeSeries(student.trades_series || student.series),
        recordedCount: studentMarks.length,
        passedSubjects,
        numPassed,
        totalPassedScore,
        isPassed
      };
    });

    return computed.sort((a, b) => {
      if (b.numPassed !== a.numPassed) return b.numPassed - a.numPassed;
      if (b.totalPassedScore !== a.totalPassedScore) {
        return b.totalPassedScore - a.totalPassedScore;
      }
      return String(a.name).localeCompare(String(b.name));
    });
  }, [candidates, marksData, examLevel, allocatedSubjects, targetClasses]);

  const successfulCandidates = useMemo(
    () => rankedCandidates.filter((s) => s.isPassed),
    [rankedCandidates]
  );

  const subjectStats = useMemo(() => {
    const isALevel = examLevel === 'A_LEVEL';
    const candidateIds = new Set(candidates.map((c) => c.id));

    return allocatedSubjects.map((subj) => {
      let sat = 0;
      let passed = 0;

      candidates.forEach((stu) => {
        const rec = marksData[`${stu.id}_${subj.name}`];
        if (
          rec &&
          rec.mark_100 !== '' &&
          rec.mark_100 !== undefined &&
          rec.mark_100 !== null &&
          candidateIds.has(stu.id)
        ) {
          sat += 1;
          if (checkIsPassing(rec.letter_grade, isALevel)) {
            passed += 1;
          }
        }
      });

      const rate = sat > 0 ? ((passed / sat) * 100).toFixed(2) : '0.00';
      return {
        subject: subj.name,
        sat,
        passed,
        rate
      };
    });
  }, [allocatedSubjects, candidates, marksData, examLevel]);

  const totalSat = rankedCandidates.length;
  const totalPassed = successfulCandidates.length;
  const passPercentage =
    totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(2) : '0.00';

  const handleOneClickDownloadPdf = useCallback(() => {
    if (typeof window === 'undefined') return;
    const examLabel = examType === 'PRE_MOCK' ? 'PRE-MOCK' : 'MOCK';
    const levelLabel =
      examLevel === 'O_LEVEL'
        ? 'GCE ORDINARY LEVEL (FORM 5)'
        : 'GCE ADVANCED LEVEL (UPPER SIXTH)';

    const subjectRowsHtml = subjectStats
      .map(
        (st) => `
        <tr>
          <td>${st.subject}</td>
          <td style="text-align:center;">${st.sat}</td>
          <td style="text-align:center;">${st.passed}</td>
          <td style="text-align:center;font-weight:bold;">${st.rate}%</td>
        </tr>`
      )
      .join('');

    const meritListSource =
      successfulCandidates.length > 0 ? successfulCandidates : rankedCandidates;

    const meritRowsHtml = meritListSource
      .map((stu, idx) => {
        const subjectsFormatted =
          stu.passedSubjects.length > 0
            ? stu.passedSubjects
                .map((sub) => `<strong>(${sub.letter_grade})</strong> ${sub.subject_name}`)
                .join(', ')
            : '<em>0 papers passed</em>';
        return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;">${stu.name}</td>
          <td>${stu.studentClass}${stu.studentSeries ? ` (${stu.studentSeries})` : ''}</td>
          <td style="text-align:center;font-weight:bold;">${stu.numPassed}</td>
          <td>${subjectsFormatted}</td>
        </tr>`;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${schoolDisplayName} - ${levelLabel} ${examLabel} RESULTS</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
            .school-name { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .sub-header { font-size: 12px; margin-top: 4px; color: #333; }
            .result-title { font-size: 16px; font-weight: 700; margin-top: 8px; text-transform: uppercase; }
            .stats-bar { display: flex; justify-content: space-around; background: #f3f4f6; border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 18px; font-size: 13px; }
            h3 { font-size: 14px; text-transform: uppercase; margin: 18px 0 8px; border-left: 4px solid #047857; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
            th { background: #e2e8f0; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolDisplayName}</div>
            <div class="sub-header">MINISTRY OF SECONDARY EDUCATION (MINSEC) — GENERAL EDUCATION SECTION | ACADEMIC YEAR: ${currentAcademicYear}</div>
            <div class="result-title">${levelLabel} ${examLabel} EXAMINATION RESULTS</div>
          </div>

          <div class="stats-bar">
            <div><strong>TOTAL SAT:</strong> ${totalSat}</div>
            <div><strong>TOTAL PASSED:</strong> ${totalPassed}</div>
            <div><strong>OVERALL PERCENTAGE PASSED:</strong> ${passPercentage}%</div>
          </div>

          <h3>Subject Performance Summary (% Passed Per Subject)</h3>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th style="text-align:center;">Candidates Sat</th>
                <th style="text-align:center;">Candidates Passed</th>
                <th style="text-align:center;">Percentage Passed (%)</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRowsHtml || '<tr><td colspan="4" style="text-align:center;">No allocated subjects found</td></tr>'}
            </tbody>
          </table>

          <h3>NAMES OF SUCCESSFUL CANDIDATES IN ORDER OF MERIT</h3>
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:45px;">Rank</th>
                <th>Candidate Name</th>
                <th>Class / Series</th>
                <th style="text-align:center;width:85px;">Papers Passed</th>
                <th>Passed Subjects (Grade Before Subject)</th>
              </tr>
            </thead>
            <tbody>
              ${meritRowsHtml || '<tr><td colspan="5" style="text-align:center;">No candidates available</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [
    examType,
    examLevel,
    subjectStats,
    successfulCandidates,
    rankedCandidates,
    schoolDisplayName,
    currentAcademicYear,
    totalSat,
    totalPassed,
    passPercentage
  ]);

  const pillGroupClass =
    'inline-flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/70 shadow-inner';
  const getSoftToggleBtnClass = (isActive, activeTone = 'emerald') => {
    const base =
      'px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer select-none active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-400/40';
    if (!isActive) {
      return `${base} text-slate-300 hover:text-white hover:bg-slate-700/60`;
    }
    if (activeTone === 'blue') {
      return `${base} bg-blue-600/90 text-white shadow-sm shadow-blue-950/50`;
    }
    return `${base} bg-emerald-600/90 text-white shadow-sm shadow-emerald-950/50`;
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-emerald-400">
              🎓 General Education {examType === 'PRE_MOCK' ? 'Pre-Mock' : 'Mock'} Results
            </h2>
            <span
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-colors duration-200 ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : syncStatus === 'saving'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : 'bg-rose-950/80 text-rose-300 border-rose-700'
              }`}
            >
              {syncStatus === 'synced'
                ? '● Live Database Synced + Offline Ready'
                : syncStatus === 'saving'
                ? '● Saving to Database...'
                : '● Saved Offline (Will Sync to Database)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            School: <strong className="text-white">{schoolDisplayName}</strong> | Academic
            Year: <strong className="text-white">{currentAcademicYear}</strong> | Loaded
            Candidates:{' '}
            <strong className="text-emerald-300">{rankedCandidates.length}</strong>
            {highlightedIds.length > 0 && (
              <span className="ml-2 text-amber-300">
                | Highlighted: <strong>{highlightedIds.length}</strong>
              </span>
            )}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            ✕ Close Dashboard
          </button>
        )}
      </div>

      {/* WHITE BACKGROUND Database Sync Banner */}
      <div className="mt-3 p-3.5 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-sm text-xs flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-slate-950">Offline &amp; Database Sync:</strong>{' '}
          {lastSaveError ? (
            <span className="text-rose-700 font-semibold">
              Marks are safely stored offline and compiled locally. ({lastSaveError})
            </span>
          ) : (
            <span className="text-emerald-800 font-semibold">
              Live connected — marks save automatically to Supabase and update in real time across devices.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={flushPendingQueue}
          className="px-4 py-1.5 bg-[#064e3b] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer shrink-0 shadow-sm"
        >
          Sync to Database Now
        </button>
      </div>

      {/* TOP STATISTICS & MINSEC ACTION BAR */}
      <div className="mt-4 p-4 bg-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-slate-700/70">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-slate-400">Total Sat:</span>{' '}
            <strong className="text-white text-base">{totalSat}</strong>
          </div>
          <div>
            <span className="text-slate-400">Total Passed:</span>{' '}
            <strong className="text-emerald-400 text-base">{totalPassed}</strong>
          </div>
          <div>
            <span className="text-slate-400">Overall Pass Rate:</span>{' '}
            <strong className="text-blue-400 text-base">{passPercentage}%</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowMinsecPreview(true)}
            className="px-4 py-2 text-xs font-semibold bg-slate-700/80 hover:bg-slate-600/90 text-white rounded-xl border border-slate-600/80 transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            👁️ Preview MINSEC Broad Sheet
          </button>
          <button
            type="button"
            onClick={handleOneClickDownloadPdf}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            📄 Download MINSEC Broad Sheet PDF
          </button>
        </div>
      </div>

      {/* Soft Mode, Exam Type, Level & Class/Series Filters */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className={pillGroupClass}>
            <button
              type="button"
              onClick={() => setViewMode('compiled')}
              className={getSoftToggleBtnClass(viewMode === 'compiled', 'emerald')}
            >
              GCE Results Order
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={getSoftToggleBtnClass(viewMode === 'grid', 'emerald')}
            >
              Enter Marks (/100)
            </button>
          </div>

          <div className={pillGroupClass}>
            <button
              type="button"
              onClick={() => setExamType('PRE_MOCK')}
              className={getSoftToggleBtnClass(examType === 'PRE_MOCK', 'emerald')}
            >
              Pre-Mock
            </button>
            <button
              type="button"
              onClick={() => setExamType('MOCK')}
              className={getSoftToggleBtnClass(examType === 'MOCK', 'emerald')}
            >
              Mock
            </button>
          </div>

          <div className={pillGroupClass}>
            <button
              type="button"
              onClick={() => setExamLevel('O_LEVEL')}
              className={getSoftToggleBtnClass(examLevel === 'O_LEVEL', 'blue')}
            >
              Form 5 (F5A + F5B)
            </button>
            <button
              type="button"
              onClick={() => setExamLevel('A_LEVEL')}
              className={getSoftToggleBtnClass(examLevel === 'A_LEVEL', 'blue')}
            >
              Upper Sixth (U6A + U6S)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-white rounded-xl px-3.5 py-2 transition-colors duration-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">
              All {examLevel === 'O_LEVEL' ? 'Form 5 Classes' : 'Upper Sixth Classes'}
            </option>
            {targetClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {availableSeries.length > 0 && (
            <select
              value={selectedSeriesFilter}
              onChange={(e) => setSelectedSeriesFilter(e.target.value)}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-white rounded-xl px-3.5 py-2 transition-colors duration-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Series ({availableSeries.join(', ')})</option>
              {availableSeries.map((ser) => (
                <option key={ser} value={ser}>
                  Series {ser}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Student Search, Multi-Highlight & Smooth Horizontal Scroll Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-1 min-w-[220px] items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search student by name or matricule..."
            className="w-full max-w-md bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 text-xs bg-slate-700/80 hover:bg-slate-600 rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {viewMode === 'grid' && allocatedSubjects.length > 0 && (
            <div className="inline-flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1">
              <button
                type="button"
                onClick={() => panTableHorizontally(-320)}
                title="Scroll subjects left"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition active:scale-95 cursor-pointer"
              >
                ‹ Left
              </button>
              <span className="px-1.5 text-[11px] text-slate-400">
                Shift + Wheel
              </span>
              <button
                type="button"
                onClick={() => panTableHorizontally(320)}
                title="Scroll subjects right"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition active:scale-95 cursor-pointer"
              >
                Right ›
              </button>
            </div>
          )}

          {highlightedIds.length > 0 && (
            <button
              type="button"
              onClick={clearHighlights}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Clear Highlights ({highlightedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'compiled' ? (
        <div className="mt-4 max-h-[68vh] overflow-auto scroll-smooth rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-300 text-xs border-b border-slate-700">
                <th className="sticky top-0 z-20 bg-slate-800 p-3 w-12 text-center">Pin</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3">Rank</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3">Candidate Name</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3">Class</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3 text-center">Total Passed</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3">Passed Subjects (Grade Before Subject)</th>
                <th className="sticky top-0 z-20 bg-slate-800 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rankedCandidates.length > 0 ? (
                rankedCandidates.map((student, idx) => {
                  const isHighlighted = highlightedIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleHighlightStudent(student.id)}
                      className={`border-b border-slate-800 cursor-pointer transition-colors duration-150 ${
                        isHighlighted
                          ? 'bg-[#08382b] hover:bg-[#0a4636] border-l-4 border-l-emerald-400 ring-1 ring-inset ring-emerald-400/70'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isHighlighted}
                          onChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHighlightStudent(student.id);
                          }}
                          aria-label={`Highlight ${student.name}`}
                          className="accent-emerald-400 cursor-pointer rounded"
                        />
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">
                        {student.name}
                        {isHighlighted && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-400 text-slate-950 rounded-md">
                            HIGHLIGHTED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">
                        {student.studentClass}
                        {student.studentSeries ? ` (${student.studentSeries})` : ''}
                      </td>
                      <td className="p-3 font-bold text-center text-amber-300">
                        {student.numPassed} {student.numPassed === 1 ? 'Paper' : 'Papers'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {student.passedSubjects.length > 0 ? (
                            student.passedSubjects.map((sub) => (
                              <span
                                key={sub.subject_name}
                                className="px-2 py-0.5 text-xs bg-emerald-950 text-emerald-300 rounded-md border border-emerald-800"
                              >
                                <strong>({sub.letter_grade})</strong> {sub.subject_name}
                              </span>
                            ))
                          ) : student.recordedCount > 0 ? (
                            <span className="text-xs text-amber-300/80 italic">
                              0 papers passed ({student.recordedCount} below pass mark)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              0 papers passed yet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                            student.isPassed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {student.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No examination candidates found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* MARK ENTRY GRID: 2D STICKY HEADERS (TOP SUBJECTS + LEFT STUDENT NAMES) */
        <div className="mt-4">
          {!canEnterMarks && (
            <div className="mb-3 p-3 rounded-xl bg-amber-950/50 border border-amber-700/60 text-xs text-amber-200">
              Mark entry is restricted because no examination class or subject is assigned.
            </div>
          )}

          {allocatedSubjects.length === 0 ? (
            <div className="p-8 text-center text-amber-300 bg-slate-800/50 rounded-xl border border-slate-700 text-xs">
              No subjects have been allocated in <strong>Class &amp; Coefficient Settings</strong> for{' '}
              <strong>
                {selectedClassFilter === 'ALL'
                  ? targetClasses.join(' / ')
                  : selectedClassFilter}
              </strong>
              .
            </div>
          ) : (
            <div
              ref={gridScrollRef}
              onWheel={handleTableWheel}
              className="w-full max-h-[68vh] overflow-auto scroll-smooth rounded-xl border border-slate-700/80"
            >
              <table className="min-w-max w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-xs border-b border-slate-700">
                    <th className="sticky top-0 left-0 z-30 bg-slate-800 p-3 border-r border-b border-slate-700 w-10 text-center">
                      Pin
                    </th>
                    <th className="sticky top-0 left-10 z-30 bg-slate-800 p-3 border-r border-b border-slate-700 w-12">
                      N°
                    </th>
                    <th className="sticky top-0 left-[88px] z-30 bg-slate-800 p-3 border-r border-b border-slate-700 w-[230px] min-w-[230px] shadow-[4px_0_8px_rgba(0,0,0,0.35)]">
                      Candidate Name
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-800 p-3 border-r border-b border-slate-700 min-w-[135px]">
                      Class
                    </th>
                    {allocatedSubjects.map((subj) => (
                      <th
                        key={subj.id}
                        className="sticky top-0 z-20 bg-slate-800 p-2.5 border-r border-b border-slate-700 text-center min-w-[140px]"
                      >
                        <div className="leading-tight">{subj.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Coeff {subj.coeff}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.length > 0 ? (
                    candidates.map((student, idx) => {
                      const isHighlighted = highlightedIds.includes(student.id);
                      const rowBg = isHighlighted
                        ? 'bg-[#08382b]'
                        : 'bg-slate-900 group-hover:bg-slate-800';

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-slate-800 group transition-colors duration-150 ${
                            isHighlighted
                              ? 'bg-[#08382b] ring-1 ring-inset ring-emerald-400/70'
                              : 'hover:bg-slate-800/60'
                          }`}
                        >
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-0 z-10 ${rowBg} p-3 border-r border-slate-700 text-center cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              checked={isHighlighted}
                              onChange={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHighlightStudent(student.id);
                              }}
                              aria-label={`Highlight ${student.fullName || student.name}`}
                              className="accent-emerald-400 cursor-pointer rounded"
                            />
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-10 z-10 ${rowBg} p-3 border-r border-slate-700 text-slate-400 cursor-pointer`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-[88px] z-10 ${rowBg} p-3 border-r border-slate-700 font-semibold w-[230px] min-w-[230px] shadow-[4px_0_8px_rgba(0,0,0,0.35)] cursor-pointer ${
                              isHighlighted ? 'text-emerald-200' : 'text-white'
                            }`}
                          >
                            {student.fullName || student.full_name || student.name}
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className="p-3 border-r border-slate-700 text-xs text-slate-400 whitespace-nowrap cursor-pointer"
                          >
                            {student.classLevel || student.class_name || '—'}
                          </td>
                          {allocatedSubjects.map((subj) => {
                            const isAllocated = isSubjectAllocatedToStudent(student, subj.name);
                            if (!isAllocated) {
                              return (
                                <td
                                  key={subj.id}
                                  className="p-1.5 border-r border-slate-700 text-center bg-slate-950/40 text-slate-600 text-xs"
                                  title="Not allocated to this class/series"
                                >
                                  —
                                </td>
                              );
                            }

                            const cellKey = `${student.id}_${subj.name}`;
                            const record = marksData[cellKey];
                            const hasDraft = Object.prototype.hasOwnProperty.call(
                              draftInputs,
                              cellKey
                            );
                            const hasSavedMark =
                              record &&
                              record.mark_100 !== '' &&
                              record.mark_100 !== undefined &&
                              record.mark_100 !== null;

                            const displayVal = hasDraft
                              ? draftInputs[cellKey]
                              : hasSavedMark
                              ? String(record.mark_100)
                              : '';

                            const hasAnyMark = displayVal !== '';
                            const liveGrade = hasSavedMark ? record?.letter_grade || '' : '';

                            return (
                              <td
                                key={subj.id}
                                className="p-1.5 border-r border-slate-700 text-center"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    disabled={!canEnterMarks}
                                    value={displayVal}
                                    onChange={(e) =>
                                      handleScoreChange(student, subj.name, e.target.value)
                                    }
                                    onBlur={() => handleScoreBlur(student, subj.name)}
                                    placeholder="/100"
                                    className="w-16 bg-slate-950 border border-slate-700/90 rounded-lg text-center py-1 font-mono text-emerald-400 transition-colors focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                                  />
                                  {hasAnyMark && canEnterMarks && (
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleScoreChange(student, subj.name, '');
                                      }}
                                      title="Clear mark back to unfilled (/100)"
                                      className="text-xs leading-none px-1.5 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-600 text-slate-300 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer font-bold"
                                    >
                                      ×
                                    </button>
                                  )}
                                  {liveGrade && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        checkIsPassing(liveGrade, examLevel === 'A_LEVEL')
                                          ? 'text-emerald-400 bg-emerald-950/80'
                                          : 'text-slate-400 bg-slate-800'
                                      }`}
                                    >
                                      {liveGrade}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={allocatedSubjects.length + 4}
                        className="p-8 text-center text-slate-500 text-xs"
                      >
                        No candidates found matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MINSEC Broad Sheet Preview Modal */}
      {showMinsecPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-5">
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-950">
                  {schoolDisplayName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  MINSEC — GENERAL EDUCATION | ACADEMIC YEAR: {currentAcademicYear}
                </p>
                <p className="text-sm font-bold text-emerald-800 mt-1 uppercase">
                  {examLevel === 'O_LEVEL'
                    ? 'GCE ORDINARY LEVEL (FORM 5)'
                    : 'GCE ADVANCED LEVEL (UPPER SIXTH)'}{' '}
                  {examType === 'PRE_MOCK' ? 'PRE-MOCK' : 'MOCK'} RESULTS SLIP
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOneClickDownloadPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all duration-200 active:scale-[0.97] cursor-pointer"
                >
                  📄 Download / Print PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowMinsecPreview(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-100 border border-slate-300 rounded-xl p-3 mb-6 text-center text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase">Total Sat</div>
                <div className="font-extrabold text-lg">{totalSat}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Total Passed</div>
                <div className="font-extrabold text-lg text-emerald-700">
                  {totalPassed}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Percentage Passed</div>
                <div className="font-extrabold text-lg text-blue-700">
                  {passPercentage}%
                </div>
              </div>
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2 mb-2">
              Percentage Passed Per Subject
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-slate-200 text-slate-900">
                  <th className="border border-slate-300 p-2 text-left">Subject</th>
                  <th className="border border-slate-300 p-2 text-center">Sat</th>
                  <th className="border border-slate-300 p-2 text-center">Passed</th>
                  <th className="border border-slate-300 p-2 text-center">
                    % Passed
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.length > 0 ? (
                  subjectStats.map((st) => (
                    <tr key={st.subject}>
                      <td className="border border-slate-300 p-2 font-medium">
                        {st.subject}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {st.sat}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {st.passed}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {st.rate}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-slate-300 p-4 text-center text-slate-500"
                    >
                      No allocated subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2 mb-2">
              NAMES OF SUCCESSFUL CANDIDATES IN ORDER OF MERIT
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-900">
                  <th className="border border-slate-300 p-2 text-center w-12">Rank</th>
                  <th className="border border-slate-300 p-2 text-left">
                    Candidate Name
                  </th>
                  <th className="border border-slate-300 p-2 text-left">Class</th>
                  <th className="border border-slate-300 p-2 text-center w-24">
                    Papers Passed
                  </th>
                  <th className="border border-slate-300 p-2 text-left">
                    Subjects &amp; Grades (Grade Before Subject)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(successfulCandidates.length > 0
                  ? successfulCandidates
                  : rankedCandidates
                ).map((stu, idx) => (
                  <tr key={stu.id}>
                    <td className="border border-slate-300 p-2 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 p-2 font-bold">
                      {stu.name}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {stu.studentClass}
                      {stu.studentSeries ? ` (${stu.studentSeries})` : ''}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold">
                      {stu.numPassed}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {stu.passedSubjects.length > 0 ? (
                        stu.passedSubjects.map((sub, i) => (
                          <span key={sub.subject_name}>
                            <strong>({sub.letter_grade})</strong> {sub.subject_name}
                            {i < stu.passedSubjects.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-400">
                          No paper passed yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}