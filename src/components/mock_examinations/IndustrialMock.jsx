'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import {
  INDUSTRIAL_TRADE_SERIES,
  TECHNICAL_INDUSTRIAL_CATALOG,
  ALL_SUBJECTS_LIST
} from '../../../app/admin-dashboard/page';
import { calculateGradeFrom100, isPassingGrade } from './mockExamService';

const IDB_NAME = 'ClassLogsTechnicalIndustrialMockDB';
const IDB_STORE = 'tech_ind_mock_cache';

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

function normalizeTrade(val) {
  const s = String(val || '').trim();
  if (!s || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NONE') return '';
  return s;
}

// Single Source of Truth lookup map built directly from imported ALL_SUBJECTS_LIST
const SUBJECT_CATALOG_MAP = (() => {
  const map = new Map();
  if (Array.isArray(ALL_SUBJECTS_LIST)) {
    ALL_SUBJECTS_LIST.forEach((item) => {
      if (item?.name) {
        map.set(String(item.name).toLowerCase().trim(), String(item.category || '').trim());
      }
    });
  }
  return map;
})();

// Classifies strictly from imported ALL_SUBJECTS_LIST category + database `coeff`:
// - 'SPECIALTY': Subject is in "Industrial Subjects" category OR has coeff >= 4 (while not a low-coeff general paper)
// - 'RELATED': Supporting "General Core Subjects" / technical science with coeff >= 3
// - 'GENERAL': Remaining general core subjects
function classifyIndustrialSubject(subjectName, coeff = 1) {
  const cleanName = String(subjectName || '').toLowerCase().trim();
  const numCoeff = Number(coeff) || 1;
  const catalogCategory = SUBJECT_CATALOG_MAP.get(cleanName) || '';

  if (catalogCategory === 'Industrial Subjects') {
    return 'SPECIALTY';
  }

  if (catalogCategory === 'General Core Subjects') {
    return numCoeff >= 3 ? 'RELATED' : 'GENERAL';
  }

  // Custom school-created subject in class_coefficients: coeff >= 4 is Specialty
  return numCoeff >= 4 ? 'SPECIALTY' : 'RELATED';
}

function isAdvancedIndustrialLevel(examLevel) {
  const lvl = String(examLevel || '').toLowerCase();
  return (
    lvl.includes('sixth') ||
    lvl.includes('proind') ||
    lvl.includes('bacind') ||
    lvl.includes('advanced')
  );
}

function resolveIndustrialGrade(numericVal, isAdvanced) {
  if (typeof calculateGradeFrom100 === 'function') {
    const res = calculateGradeFrom100(numericVal, 'Technical Industrial', isAdvanced);
    if (res) return res;
  }
  if (isAdvanced) {
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

function checkIndustrialPassing(grade, isAdvanced) {
  if (!grade) return false;
  if (typeof isPassingGrade === 'function') {
    return Boolean(isPassingGrade(grade, 'Technical Industrial', isAdvanced));
  }
  const g = String(grade).toUpperCase().trim();
  if (isAdvanced) return ['A', 'B', 'C', 'D', 'E'].includes(g);
  return ['A', 'B', 'C'].includes(g);
}

export default function TechnicalMock({
  schoolId,
  userId,
  schoolDetails = {},
  studentsList,
  canEnterMarks = true,
  onClose
}) {
  // Build class level options directly from imported TECHNICAL_INDUSTRIAL_CATALOG
  const levelOptions = useMemo(() => {
    const catalog = Array.isArray(TECHNICAL_INDUSTRIAL_CATALOG)
      ? TECHNICAL_INDUSTRIAL_CATALOG
      : [];

    const examClasses = catalog.filter((cls) => {
      const lower = String(cls || '').toLowerCase();
      return (
        lower.includes('fourth') ||
        lower.includes('fifth') ||
        lower.includes('sixth') ||
        lower.includes('cap') ||
        lower.includes('pro') ||
        lower.includes('bac')
      );
    });

    const sourceList = examClasses.length > 0 ? examClasses : catalog;
    const fourthClass = sourceList.find((c) => String(c).toLowerCase().includes('fourth'));
    const fifthClass = sourceList.find((c) => String(c).toLowerCase().includes('fifth'));

    const options = sourceList.map((cls) => ({
      value: cls,
      label: cls,
      matchClasses: [cls]
    }));

    if (fourthClass && fifthClass) {
      const insertIdx = options.findIndex((o) => o.value === fifthClass) + 1;
      options.splice(insertIdx, 0, {
        value: 'COMBINED_F4_F5_IND',
        label: `${fourthClass} & ${fifthClass} (Both)`,
        matchClasses: [fourthClass, fifthClass]
      });
    }

    return options;
  }, []);

  const [examType, setExamType] = useState('MOCK'); // 'PRE_MOCK' or 'MOCK'
  const [examLevel, setExamLevel] = useState(() => levelOptions[0]?.value || '');
  const [selectedTrade, setSelectedTrade] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [viewMode, setViewMode] = useState('compiled'); // 'compiled' or 'grid'
  const [showMinsecPreview, setShowMinsecPreview] = useState(false);

  const [dbStudents, setDbStudents] = useState([]);
  const [coeffRows, setCoeffRows] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [draftInputs, setDraftInputs] = useState({});
  const [tenantDetails, setTenantDetails] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'queued'
  const [lastSaveError, setLastSaveError] = useState('');

  const saveTimersRef = useRef({});
  const gridScrollRef = useRef(null);

  useEffect(() => {
    if (!examLevel && levelOptions.length > 0) {
      setExamLevel(levelOptions[0].value);
    }
  }, [examLevel, levelOptions]);

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);
  const sectionName = 'Technical Industrial';
  const dbSectionCandidates = useMemo(
    () => ['Technical Industrial', 'Technical Industrial (IND)'],
    []
  );

  const activeLevelOption = useMemo(() => {
    return levelOptions.find((o) => o.value === examLevel) || levelOptions[0] || null;
  }, [levelOptions, examLevel]);

  const isAdvanced = useMemo(
    () => isAdvancedIndustrialLevel(activeLevelOption?.label || examLevel),
    [activeLevelOption, examLevel]
  );

  // Strict multi-tenant school identifier resolution
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

  const allowedTenantIds = useMemo(() => {
    const set = new Set();
    requestedSchoolIds.forEach((id) => set.add(id));
    if (tenantDetails?.id) set.add(String(tenantDetails.id));
    if (tenantDetails?.school_id) set.add(String(tenantDetails.school_id));
    if (schoolDetails?.id) set.add(String(schoolDetails.id));
    if (schoolDetails?.school_id) set.add(String(schoolDetails.school_id));
    return Array.from(set);
  }, [requestedSchoolIds, tenantDetails, schoolDetails]);

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

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const tenantCacheKey = `cl_techind_tenant_${effectiveSchoolId}`;
    const cachedTenant = readLocalJson(tenantCacheKey, null);
    if (cachedTenant && !tenantDetails) {
      setTenantDetails(cachedTenant);
    }
  }, [effectiveSchoolId, tenantDetails]);

  // Fetch exact tenant row from `school_details`
  useEffect(() => {
    let active = true;
    async function loadCurrentTenantDetails() {
      let lookupIds = [...requestedSchoolIds];

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
          // Offline fallback
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
            writeLocalJson(`cl_techind_tenant_${bySchoolId.school_id || bySchoolId.id}`, bySchoolId);
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
            writeLocalJson(`cl_techind_tenant_${byRowId.school_id || byRowId.id}`, byRowId);
            return;
          }
        } catch (_) {
          // Offline fallback
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
      'Technical Examination Board'
    );
  }, [tenantDetails, schoolDetails]);

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

    const stuCacheKey = `cl_techind_students_${effectiveSchoolId}`;
    const coeffCacheKey = `cl_techind_coeffs_${effectiveSchoolId}`;
    const marksCacheKey = `cl_techind_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;
    const hlCacheKey = `cl_techind_highlights_${effectiveSchoolId}`;
    const queueKey = `cl_techind_pending_queue_${effectiveSchoolId}`;

    const localStu = readLocalJson(stuCacheKey, null);
    setDbStudents(Array.isArray(localStu) ? localStu : []);

    const localCoeff = readLocalJson(coeffCacheKey, null);
    setCoeffRows(Array.isArray(localCoeff) ? localCoeff : []);

    const localMarks = readLocalJson(marksCacheKey, null);
    setMarksData(localMarks && typeof localMarks === 'object' ? localMarks : {});

    const localHl = readLocalJson(hlCacheKey, null);
    if (Array.isArray(localHl)) {
      setHighlightedIds(localHl);
    }

    const pendingQueue = readLocalJson(queueKey, []);
    if (Array.isArray(pendingQueue) && pendingQueue.length > 0) {
      setSyncStatus('queued');
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

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const hlCacheKey = `cl_techind_highlights_${effectiveSchoolId}`;
    writeLocalJson(hlCacheKey, highlightedIds);
    idbSet(hlCacheKey, highlightedIds);
  }, [effectiveSchoolId, highlightedIds]);

  // 2. Fetch Students & Allocated Subjects strictly filtered by active tenant IDs
  useEffect(() => {
    if (!effectiveSchoolId || allowedTenantIds.length === 0) return;
    let active = true;

    async function syncSchoolRecords() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

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
            .in('section', dbSectionCandidates)
            .in('school_id', allowedTenantIds)
        ]);

        if (!active) return;

        if (!stuRes.error && Array.isArray(stuRes.data)) {
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
          const stuCacheKey = `cl_techind_students_${effectiveSchoolId}`;
          writeLocalJson(stuCacheKey, cleanStudents);
          idbSet(stuCacheKey, cleanStudents);
        }

        if (!coeffRes.error && Array.isArray(coeffRes.data)) {
          const tenantIdSet = new Set(allowedTenantIds);
          const cleanCoeffs = coeffRes.data.filter(
            (c) => !c.school_id || tenantIdSet.has(String(c.school_id))
          );
          setCoeffRows(cleanCoeffs);
          const coeffCacheKey = `cl_techind_coeffs_${effectiveSchoolId}`;
          writeLocalJson(coeffCacheKey, cleanCoeffs);
          idbSet(coeffCacheKey, cleanCoeffs);
        }
      } catch (err) {
        console.warn('Offline fallback active for Industrial students/coefficients:', err);
      }
    }

    syncSchoolRecords();
    return () => {
      active = false;
    };
  }, [effectiveSchoolId, allowedTenantIds, studentsList, dbSectionCandidates]);

  const enqueueOfflineMark = useCallback(
    async (payload) => {
      if (!effectiveSchoolId) return;
      const queueKey = `cl_techind_pending_queue_${effectiveSchoolId}`;
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

  // Core writer on `mockmarks`: native `.upsert()` + verified `.delete()`
  const writeSingleMarkToDatabase = useCallback(async (payload, marksCacheKey) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, error: 'Device is offline — stored in local queue' };
    }

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
              'Supabase RLS blocked DELETE on mockmarks. Ensure DELETE policy is enabled.'
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
        error: err?.message || 'Offline — saved locally until connection returns'
      };
    }
  }, []);

  const flushPendingQueue = useCallback(async () => {
    if (!effectiveSchoolId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('queued');
      return;
    }

    const queueKey = `cl_techind_pending_queue_${effectiveSchoolId}`;
    let queue = readLocalJson(queueKey, null);
    if (!Array.isArray(queue)) {
      queue = await idbGet(queueKey);
    }
    if (!Array.isArray(queue) || queue.length === 0) {
      setSyncStatus('synced');
      setLastSaveError('');
      return;
    }

    setSyncStatus('saving');

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
      const cacheKey = `cl_techind_marks_${effectiveSchoolId}_${normalizedItem.academic_year}_${normalizedItem.exam_type}`;
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
    } else {
      setSyncStatus('queued');
    }
  }, [effectiveSchoolId, writeSingleMarkToDatabase]);

  // Automatic Online / Offline Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      flushPendingQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushPendingQueue]);

  // 3. Fetch & Realtime Sync on `mockmarks`
  const fetchLatestMockMarks = useCallback(async () => {
    if (!effectiveSchoolId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('queued');
      return;
    }

    const marksCacheKey = `cl_techind_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

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
        .in('section', dbSectionCandidates)
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

        const queueKey = `cl_techind_pending_queue_${effectiveSchoolId}`;
        const pendingQueue = readLocalJson(queueKey, []);
        if (Array.isArray(pendingQueue)) {
          pendingQueue.forEach((item) => {
            if (item.exam_type === examType && item.academic_year === currentAcademicYear) {
              const k = `${item.student_id}_${item.subject_name}`;
              if (item._delete) {
                delete map[k];
              } else {
                map[k] = item;
              }
            }
          });
        }

        setMarksData(map);
        writeLocalJson(marksCacheKey, map);
        idbSet(marksCacheKey, map);
        await flushPendingQueue();
      }
    } catch (err) {
      console.warn('Using cached Industrial mockmarks offline:', err);
    }
  }, [effectiveSchoolId, currentAcademicYear, examType, dbSectionCandidates, flushPendingQueue]);

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const marksCacheKey = `cl_techind_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

    fetchLatestMockMarks();

    const channel = supabase
      .channel(`mockmarks_techind_${effectiveSchoolId}_${examType}`)
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
          if (!row || !dbSectionCandidates.includes(row.section) || row.exam_type !== examType) {
            return;
          }
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
  }, [effectiveSchoolId, currentAcademicYear, examType, dbSectionCandidates, fetchLatestMockMarks]);

  const persistMarkToDatabase = useCallback(
    async (student, subjectName, numericVal) => {
      if (!canEnterMarks || !effectiveSchoolId) return;

      const marksCacheKey = `cl_techind_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

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
          setLastSaveError(isOnline ? res.error : '');
        }
        return;
      }

      if (Number.isNaN(Number(numericVal))) return;

      const cleanScore = Math.min(100, Math.max(0, Number(numericVal)));
      const grade = resolveIndustrialGrade(cleanScore, isAdvanced);
      const classLvl =
        student.classLevel ||
        student.class_name ||
        activeLevelOption?.matchClasses?.[0] ||
        examLevel;
      const tradeVal = normalizeTrade(student.trades_series || student.series) || null;
      const matriculeVal = student.unique_code || student.matricule || '';

      setSyncStatus('saving');
      setLastSaveError('');

      let validUpdatedBy = userId || null;
      if (isOnline) {
        try {
          await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
        } catch (_) {
          // Optional database RPC
        }

        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            validUpdatedBy = authData.user.id;
          }
        } catch (_) {
          // Keep passed userId
        }
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
        trades_series: tradeVal,
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
        setLastSaveError(isOnline ? res.error : '');
      }
    },
    [
      canEnterMarks,
      effectiveSchoolId,
      isAdvanced,
      activeLevelOption,
      examLevel,
      currentAcademicYear,
      examType,
      userId,
      isOnline,
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
      const marksCacheKey = `cl_techind_marks_${effectiveSchoolId}_${currentAcademicYear}_${examType}`;

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

      const grade = resolveIndustrialGrade(numericVal, isAdvanced);

      setMarksData((prev) => {
        const next = {
          ...prev,
          [key]: {
            ...prev[key],
            school_id: effectiveSchoolId,
            academic_year: currentAcademicYear,
            exam_type: examType,
            section: sectionName,
            classLevel:
              student.classLevel ||
              student.class_name ||
              activeLevelOption?.matchClasses?.[0] ||
              examLevel,
            student_id: student.id,
            matricule: student.unique_code || student.matricule || '',
            subject_name: subjectName,
            trades_series: normalizeTrade(student.trades_series || student.series) || null,
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
      isAdvanced,
      effectiveSchoolId,
      currentAcademicYear,
      examType,
      activeLevelOption,
      examLevel,
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

  const matchesSelectedLevel = useCallback(
    (rawClassVal) => {
      if (!activeLevelOption) return false;
      const rawLower = String(rawClassVal || '').toLowerCase().trim();
      const norm = normalizeClassName(rawClassVal);
      if (!rawLower && !norm) return false;

      return activeLevelOption.matchClasses.some((targetCls) => {
        const tLower = String(targetCls).toLowerCase().trim();
        const tNorm = normalizeClassName(targetCls);
        return (
          rawLower === tLower ||
          norm === tNorm ||
          rawLower.includes(tNorm) ||
          tNorm.includes(norm)
        );
      });
    },
    [activeLevelOption]
  );

  // Dynamic list of trades from imported INDUSTRIAL_TRADE_SERIES + school records
  const availableTrades = useMemo(() => {
    const set = new Set();
    if (Array.isArray(INDUSTRIAL_TRADE_SERIES)) {
      INDUSTRIAL_TRADE_SERIES.forEach((t) => {
        if (t) set.add(String(t).trim());
      });
    }
    coeffRows.forEach((row) => {
      if (!matchesSelectedLevel(row.classLevel || row.class_level)) return;
      const tr = normalizeTrade(row.trades_series);
      if (tr) set.add(tr);
    });
    sourceStudents.forEach((s) => {
      if (!matchesSelectedLevel(s.classLevel || s.class_level || s.class_name || s.class)) return;
      const tr = normalizeTrade(s.trades_series || s.series);
      if (tr) set.add(tr);
    });
    return Array.from(set).sort();
  }, [coeffRows, sourceStudents, matchesSelectedLevel]);

  const candidates = useMemo(() => {
    if (!Array.isArray(sourceStudents) || sourceStudents.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();

    return sourceStudents
      .filter((s) => {
        const rawCls = s.classLevel || s.class_level || s.class_name || s.class || '';
        if (!matchesSelectedLevel(rawCls)) return false;

        if (selectedTrade !== 'ALL') {
          const stuTrade = normalizeTrade(s.trades_series || s.series);
          if (stuTrade.toLowerCase() !== selectedTrade.toLowerCase()) return false;
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
  }, [sourceStudents, matchesSelectedLevel, selectedTrade, searchQuery]);

  // Extract allocated subjects from school's `class_coefficients` + classify via imported `ALL_SUBJECTS_LIST`
  const { allocatedSubjects, classTradeSubjectMap, subjectMetaMap } = useMemo(() => {
    const subjectMap = new Map();
    const perClassTradeMap = new Map();
    const metaLookup = new Map();

    coeffRows.forEach((row) => {
      if (!matchesSelectedLevel(row.classLevel || row.class_level)) return;

      const rowTrade = normalizeTrade(row.trades_series);
      if (
        selectedTrade !== 'ALL' &&
        rowTrade &&
        rowTrade.toLowerCase() !== selectedTrade.toLowerCase()
      ) {
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

      const normRowClass = normalizeClassName(row.classLevel || row.class_level);
      const tradeKey = rowTrade.toLowerCase();
      const classTradeKey = `${normRowClass}::${tradeKey}`;

      if (!perClassTradeMap.has(classTradeKey)) {
        perClassTradeMap.set(classTradeKey, new Set());
      }
      if (!perClassTradeMap.has(`*::${tradeKey}`)) {
        perClassTradeMap.set(`*::${tradeKey}`, new Set());
      }

      const exactSet = perClassTradeMap.get(classTradeKey);
      const tradeFallbackSet = perClassTradeMap.get(`*::${tradeKey}`);

      rawSubs.forEach((item) => {
        const subName = String(
          item.name || item.subject_name || item.subject_code || ''
        ).trim();
        if (!subName) return;

        const coeffVal = Number(item.coeff ?? item.coefficient ?? 1);
        if (!Number.isNaN(coeffVal) && coeffVal <= 0) return;

        const normKey = subName.toLowerCase();
        const moduleType = classifyIndustrialSubject(subName, coeffVal || 1);
        exactSet.add(subName);
        tradeFallbackSet.add(subName);

        if (!subjectMap.has(normKey)) {
          subjectMap.set(normKey, {
            id: normKey,
            name: subName,
            code: item.code || subName,
            coeff: coeffVal || 1,
            moduleType
          });
        } else {
          const existing = subjectMap.get(normKey);
          if ((coeffVal || 1) >= 4 || moduleType === 'SPECIALTY') {
            existing.coeff = Math.max(existing.coeff, coeffVal);
            existing.moduleType = 'SPECIALTY';
          }
        }

        metaLookup.set(`${tradeKey}::${normKey}`, {
          coeff: coeffVal || 1,
          moduleType
        });
      });
    });

    return {
      allocatedSubjects: Array.from(subjectMap.values()),
      classTradeSubjectMap: perClassTradeMap,
      subjectMetaMap: metaLookup
    };
  }, [coeffRows, matchesSelectedLevel, selectedTrade]);

  const isSubjectAllocatedToStudent = useCallback(
    (student, subjectName) => {
      const stuClass = normalizeClassName(
        student.classLevel || student.class_level || student.class_name || ''
      );
      const stuTrade = normalizeTrade(student.trades_series || student.series).toLowerCase();

      const exactSet = classTradeSubjectMap.get(`${stuClass}::${stuTrade}`);
      if (exactSet) {
        for (const s of exactSet) {
          if (s.toLowerCase() === subjectName.toLowerCase()) return true;
        }
        return false;
      }

      const tradeSet = classTradeSubjectMap.get(`*::${stuTrade}`);
      if (tradeSet) {
        for (const s of tradeSet) {
          if (s.toLowerCase() === subjectName.toLowerCase()) return true;
        }
        return false;
      }

      const defaultSet = classTradeSubjectMap.get('*::');
      if (defaultSet) {
        for (const s of defaultSet) {
          if (s.toLowerCase() === subjectName.toLowerCase()) return true;
        }
        return false;
      }

      return false;
    },
    [classTradeSubjectMap]
  );

  // Official MINSEC / TVEE Industrial Grading & Ranking Algorithm
  const rankedCandidates = useMemo(() => {
    const allocatedNames = new Set(allocatedSubjects.map((s) => s.name.toLowerCase()));

    const computed = candidates.map((student) => {
      const stuTrade = normalizeTrade(student.trades_series || student.series);
      const stuTradeKey = stuTrade.toLowerCase();

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
        .filter((m) => checkIndustrialPassing(m.letter_grade, isAdvanced))
        .map((m) => {
          const subNorm = String(m.subject_name || '').toLowerCase();
          const meta =
            subjectMetaMap.get(`${stuTradeKey}::${subNorm}`) ||
            subjectMetaMap.get(`::${subNorm}`);
          const moduleType =
            meta?.moduleType || classifyIndustrialSubject(m.subject_name, meta?.coeff || 1);
          const coeff = meta?.coeff || 1;
          return {
            ...m,
            moduleType,
            coeff
          };
        })
        .sort((a, b) => {
          if (a.moduleType === 'SPECIALTY' && b.moduleType !== 'SPECIALTY') return -1;
          if (a.moduleType !== 'SPECIALTY' && b.moduleType === 'SPECIALTY') return 1;
          return (Number(b.mark_100) || 0) - (Number(a.mark_100) || 0);
        });

      const numPassed = passedSubjects.length;
      const specialtyPassed = passedSubjects.filter((s) => s.moduleType === 'SPECIALTY').length;
      const relatedPassed = passedSubjects.filter((s) => s.moduleType === 'RELATED').length;
      const totalPassedScore = passedSubjects.reduce(
        (sum, item) => sum + (Number(item.mark_100) || 0),
        0
      );

      const isPassed = isAdvanced
        ? numPassed >= 4 && specialtyPassed >= 2 && relatedPassed >= 2
        : numPassed >= 5 && specialtyPassed >= 2 && relatedPassed >= 1;

      return {
        ...student,
        name: student.fullName || student.full_name || student.name || 'Candidate',
        studentClass:
          student.classLevel ||
          student.class_name ||
          activeLevelOption?.matchClasses?.[0] ||
          examLevel,
        studentTrade: stuTrade || 'General Industrial',
        recordedCount: studentMarks.length,
        passedSubjects,
        numPassed,
        specialtyPassed,
        relatedPassed,
        totalPassedScore,
        isPassed
      };
    });

    return computed.sort((a, b) => {
      if (a.isPassed !== b.isPassed) return a.isPassed ? -1 : 1;
      if (b.numPassed !== a.numPassed) return b.numPassed - a.numPassed;
      if (b.specialtyPassed !== a.specialtyPassed) return b.specialtyPassed - a.specialtyPassed;
      if (b.totalPassedScore !== a.totalPassedScore) {
        return b.totalPassedScore - a.totalPassedScore;
      }
      return String(a.name).localeCompare(String(b.name));
    });
  }, [
    candidates,
    marksData,
    isAdvanced,
    allocatedSubjects,
    subjectMetaMap,
    activeLevelOption,
    examLevel
  ]);

  const successfulCandidates = useMemo(
    () => rankedCandidates.filter((s) => s.isPassed),
    [rankedCandidates]
  );

  const groupedByTrade = useMemo(() => {
    const groups = new Map();
    rankedCandidates.forEach((stu) => {
      const key = stu.studentTrade || 'General Industrial';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(stu);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rankedCandidates]);

  const subjectStats = useMemo(() => {
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
          if (checkIndustrialPassing(rec.letter_grade, isAdvanced)) {
            passed += 1;
          }
        }
      });

      const rate = sat > 0 ? ((passed / sat) * 100).toFixed(2) : '0.00';
      return {
        subject: subj.name,
        coeff: subj.coeff,
        moduleType: subj.moduleType,
        sat,
        passed,
        rate
      };
    });
  }, [allocatedSubjects, candidates, marksData, isAdvanced]);

  const totalSat = rankedCandidates.length;
  const totalPassed = successfulCandidates.length;
  const passPercentage =
    totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(2) : '0.00';

  const activeLevelTitle = activeLevelOption?.label || examLevel;

  const handleOneClickDownloadPdf = useCallback(() => {
    if (typeof window === 'undefined') return;
    const examLabel = examType === 'PRE_MOCK' ? 'PRE-MOCK' : 'MOCK';

    const subjectRowsHtml = subjectStats
      .map(
        (st) => `
        <tr>
          <td>${st.subject}${st.moduleType === 'SPECIALTY' ? ' <strong>[Specialty ★]</strong>' : st.moduleType === 'RELATED' ? ' [Related]' : ''}</td>
          <td style="text-align:center;">${st.coeff}</td>
          <td style="text-align:center;">${st.sat}</td>
          <td style="text-align:center;">${st.passed}</td>
          <td style="text-align:center;font-weight:bold;">${st.rate}%</td>
        </tr>`
      )
      .join('');

    const tradeSectionsHtml = groupedByTrade
      .map(([tradeName, tradeCandidates]) => {
        const passedInTrade = tradeCandidates.filter((c) => c.isPassed);
        const listToRender = passedInTrade.length > 0 ? passedInTrade : tradeCandidates;
        const rowsHtml = listToRender
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
              <td>${stu.studentClass}</td>
              <td style="text-align:center;font-weight:bold;">${stu.numPassed} (${stu.specialtyPassed} Spec.)</td>
              <td>${subjectsFormatted}</td>
            </tr>`;
          })
          .join('');

        return `
          <h3>SPECIALTY: ${tradeName.toUpperCase()} — PASSED IN SPECIALTY: ${passedInTrade.length} / ${tradeCandidates.length}</h3>
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:45px;">Rank</th>
                <th>Candidate Name</th>
                <th style="width:165px;">Class</th>
                <th style="text-align:center;width:110px;">Papers Passed</th>
                <th>Passed Subjects (Grade Before Subject)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>`;
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
          <title>${schoolDisplayName} - ${activeLevelTitle} ${examLabel} RESULTS</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; }
            .school-name { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a; }
            .sub-header { font-size: 12px; margin-top: 4px; color: #334155; }
            .result-title { font-size: 16px; font-weight: 700; margin-top: 8px; text-transform: uppercase; }
            .stats-bar { display: flex; justify-content: space-around; background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; margin-bottom: 18px; font-size: 13px; }
            h3 { font-size: 13px; text-transform: uppercase; margin: 18px 0 8px; border-left: 4px solid #1d4ed8; padding-left: 8px; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #e0e7ff; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #1e1b4b; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolDisplayName}</div>
            <div class="sub-header">MINISTRY OF SECONDARY EDUCATION (MINSEC) — TECHNICAL &amp; VOCATIONAL EDUCATION (INDUSTRIAL) | ACADEMIC YEAR: ${currentAcademicYear}</div>
            <div class="result-title">${activeLevelTitle.toUpperCase()} — ${examLabel} BROAD SHEET</div>
          </div>

          <div class="stats-bar">
            <div><strong>TOTAL SAT:</strong> ${totalSat}</div>
            <div><strong>PASSED SPECIALTY:</strong> ${totalPassed}</div>
            <div><strong>OVERALL PERCENTAGE PASSED:</strong> ${passPercentage}%</div>
          </div>

          <h3>Subject Performance Summary (% Passed Per Subject)</h3>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th style="text-align:center;">Coeff</th>
                <th style="text-align:center;">Candidates Sat</th>
                <th style="text-align:center;">Candidates Passed</th>
                <th style="text-align:center;">Percentage Passed (%)</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRowsHtml || '<tr><td colspan="5" style="text-align:center;">No allocated subjects found</td></tr>'}
            </tbody>
          </table>

          ${tradeSectionsHtml || '<p>No candidates available.</p>'}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [
    examType,
    activeLevelTitle,
    subjectStats,
    groupedByTrade,
    schoolDisplayName,
    currentAcademicYear,
    totalSat,
    totalPassed,
    passPercentage
  ]);

  const pillGroupClass =
    'inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner';
  const getSoftToggleBtnClass = (isActive, activeTone = 'indigo') => {
    const base =
      'px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer select-none active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
    if (!isActive) {
      return `${base} text-slate-600 hover:text-slate-950 hover:bg-white/80`;
    }
    if (activeTone === 'teal') {
      return `${base} bg-teal-700 text-white shadow-sm`;
    }
    return `${base} bg-indigo-700 text-white shadow-sm`;
  };

  return (
    <div className="p-6 bg-[#f8fafc] text-slate-900 rounded-2xl shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold text-indigo-900">
              🛠️ Technical Industrial {examType === 'PRE_MOCK' ? 'Pre-Mock' : 'Mock'} Results
            </h2>
            <span
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-colors duration-200 ${
                !isOnline || syncStatus === 'queued'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : syncStatus === 'saving'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                  : 'bg-teal-50 text-teal-800 border-teal-300'
              }`}
            >
              {!isOnline
                ? '● Working Offline (Marks Saved Locally & Auto-Syncs Online)'
                : syncStatus === 'saving'
                ? '● Saving to Database...'
                : syncStatus === 'queued'
                ? '● Offline Edits Queued (Syncing...)'
                : '● Live Database Synced + Offline Ready'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            School: <strong className="text-slate-950">{schoolDisplayName}</strong> | Academic
            Year: <strong className="text-slate-950">{currentAcademicYear}</strong> | Loaded
            Candidates:{' '}
            <strong className="text-indigo-700">{rankedCandidates.length}</strong>
            <span className="ml-2 text-slate-500">
              • MINSEC Rule:{' '}
              {isAdvanced
                ? '≥ 4 papers (incl. ≥ 2 Specialty & ≥ 2 Related)'
                : '≥ 5 papers (incl. ≥ 2 Specialty & ≥ 1 Related)'}
            </span>
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            ✕ Close Dashboard
          </button>
        )}
      </div>

      {/* Sync Status Banner */}
      <div className="mt-3 p-3.5 rounded-xl bg-white text-slate-900 border border-indigo-100 shadow-2xs text-xs flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-indigo-950">Offline &amp; Database Sync:</strong>{' '}
          {!isOnline ? (
            <span className="text-amber-800 font-semibold">
              You are currently offline. Continue entering or editing marks normally — everything is saved to your device and will sync automatically when internet returns.
            </span>
          ) : lastSaveError ? (
            <span className="text-rose-700 font-semibold">
              Marks are safely stored offline and compiled locally. ({lastSaveError})
            </span>
          ) : (
            <span className="text-teal-800 font-semibold">
              Live connected — marks save automatically to Supabase and stay cached offline for uninterrupted access.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={flushPendingQueue}
          className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer shrink-0 shadow-2xs"
        >
          Sync to Database Now
        </button>
      </div>

      {/* TOP STATISTICS & MINSEC ACTION BAR */}
      <div className="mt-4 p-4 bg-white rounded-xl flex flex-wrap items-center justify-between gap-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-slate-500">Total Sat:</span>{' '}
            <strong className="text-slate-950 text-base">{totalSat}</strong>
          </div>
          <div>
            <span className="text-slate-500">Passed Specialty:</span>{' '}
            <strong className="text-teal-700 text-base">{totalPassed}</strong>
          </div>
          <div>
            <span className="text-slate-500">Overall Pass Rate:</span>{' '}
            <strong className="text-indigo-700 text-base">{passPercentage}%</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowMinsecPreview(true)}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            👁️ Preview MINSEC Broad Sheet
          </button>
          <button
            type="button"
            onClick={handleOneClickDownloadPdf}
            className="px-5 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            📄 Download MINSEC Broad Sheet PDF
          </button>
        </div>
      </div>

      {/* Mode, Exam Type, Level & Trade Specialty Filters */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className={pillGroupClass}>
            <button
              type="button"
              onClick={() => setViewMode('compiled')}
              className={getSoftToggleBtnClass(viewMode === 'compiled', 'indigo')}
            >
              MINSEC Specialty Merit
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={getSoftToggleBtnClass(viewMode === 'grid', 'indigo')}
            >
              Enter Marks (/100)
            </button>
          </div>

          <div className={pillGroupClass}>
            <button
              type="button"
              onClick={() => setExamType('PRE_MOCK')}
              className={getSoftToggleBtnClass(examType === 'PRE_MOCK', 'teal')}
            >
              Pre-Mock
            </button>
            <button
              type="button"
              onClick={() => setExamType('MOCK')}
              className={getSoftToggleBtnClass(examType === 'MOCK', 'teal')}
            >
              Mock
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={examLevel}
            onChange={(e) => setExamLevel(e.target.value)}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2 shadow-2xs transition-colors focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            {levelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2 shadow-2xs transition-colors focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Industrial Trades ({availableTrades.length})</option>
            {availableTrades.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search, Highlight & Smooth Horizontal Scroll Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex flex-1 min-w-[220px] items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search industrial candidate by name or matricule..."
            className="w-full max-w-md bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:bg-white focus:border-indigo-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition active:scale-[0.97] cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {viewMode === 'grid' && allocatedSubjects.length > 0 && (
            <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => panTableHorizontally(-320)}
                title="Scroll subjects left"
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-800 font-semibold border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                ‹ Left
              </button>
              <span className="px-1.5 text-[11px] text-slate-500">Shift + Wheel</span>
              <button
                type="button"
                onClick={() => panTableHorizontally(320)}
                title="Scroll subjects right"
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-800 font-semibold border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Right ›
              </button>
            </div>
          )}

          {highlightedIds.length > 0 && (
            <button
              type="button"
              onClick={clearHighlights}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-semibold transition active:scale-[0.97] cursor-pointer"
            >
              Clear Highlights ({highlightedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'compiled' ? (
        <div className="mt-4 max-h-[68vh] overflow-auto scroll-smooth rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-indigo-950 text-white text-xs">
                <th className="sticky top-0 z-20 bg-indigo-950 p-3 w-12 text-center">Pin</th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3">Rank</th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3">Candidate Name</th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3">Class &amp; Trade</th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3 text-center">Papers Passed</th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3">
                  Passed Subjects (Grade Before Subject • ★ = Specialty)
                </th>
                <th className="sticky top-0 z-20 bg-indigo-950 p-3">Specialty Status</th>
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
                      className={`border-b border-slate-200 cursor-pointer transition-colors duration-150 ${
                        isHighlighted
                          ? 'bg-indigo-50/90 hover:bg-indigo-100/80 border-l-4 border-l-indigo-600'
                          : 'hover:bg-slate-50'
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
                          className="accent-indigo-600 cursor-pointer rounded"
                        />
                      </td>
                      <td className="p-3 text-slate-500 font-mono font-semibold">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {student.name}
                        {isHighlighted && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-indigo-700 text-white rounded-md">
                            PINNED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">{student.studentClass}</div>
                        <div className="text-[11px] text-slate-500">{student.studentTrade}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-extrabold text-indigo-800">
                          {student.numPassed} {student.numPassed === 1 ? 'Paper' : 'Papers'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {student.specialtyPassed} Spec. • {student.relatedPassed} Rel.
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {student.passedSubjects.length > 0 ? (
                            student.passedSubjects.map((sub) => (
                              <span
                                key={sub.subject_name}
                                className={`px-2 py-0.5 text-xs rounded-md border ${
                                  sub.moduleType === 'SPECIALTY'
                                    ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-medium'
                                    : sub.moduleType === 'RELATED'
                                    ? 'bg-teal-50 text-teal-900 border-teal-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                <strong>({sub.letter_grade})</strong> {sub.subject_name}
                                {sub.moduleType === 'SPECIALTY' ? ' ★' : ''}
                              </span>
                            ))
                          ) : student.recordedCount > 0 ? (
                            <span className="text-xs text-amber-700 italic">
                              0 papers passed ({student.recordedCount} below pass mark)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              0 papers passed yet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                            student.isPassed
                              ? 'bg-teal-100 text-teal-800 border border-teal-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {student.isPassed ? 'PASSED SPECIALTY' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No industrial candidates found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* LIGHT DAYLIGHT MARK ENTRY GRID WITH 2D STICKY HEADERS */
        <div className="mt-4">
          {!canEnterMarks && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
              Mark entry is restricted because no examination class or subject is assigned.
            </div>
          )}

          {allocatedSubjects.length === 0 ? (
            <div className="p-8 text-center text-amber-900 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              No subjects have been allocated in <strong>Class &amp; Coefficient Settings</strong> for{' '}
              <strong>{activeLevelTitle}</strong>
              {selectedTrade !== 'ALL' ? ` (${selectedTrade})` : ''}.
            </div>
          ) : (
            <div
              ref={gridScrollRef}
              onWheel={handleTableWheel}
              className="w-full max-h-[68vh] overflow-auto scroll-smooth rounded-xl border border-slate-300 bg-white shadow-2xs"
            >
              <table className="min-w-max w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-indigo-950 text-white text-xs">
                    <th className="sticky top-0 left-0 z-30 bg-indigo-950 p-3 border-r border-b border-indigo-800 w-10 text-center">
                      Pin
                    </th>
                    <th className="sticky top-0 left-10 z-30 bg-indigo-950 p-3 border-r border-b border-indigo-800 w-12">
                      N°
                    </th>
                    <th className="sticky top-0 left-[88px] z-30 bg-indigo-950 p-3 border-r border-b border-indigo-800 w-[230px] min-w-[230px] shadow-[4px_0_8px_rgba(15,23,42,0.2)]">
                      Candidate Name
                    </th>
                    <th className="sticky top-0 z-20 bg-indigo-950 p-3 border-r border-b border-indigo-800 min-w-[175px]">
                      Class &amp; Trade
                    </th>
                    {allocatedSubjects.map((subj) => (
                      <th
                        key={subj.id}
                        className="sticky top-0 z-20 bg-indigo-950 p-2.5 border-r border-b border-indigo-800 text-center min-w-[145px]"
                      >
                        <div className="leading-tight font-semibold">
                          {subj.name}
                          {subj.moduleType === 'SPECIALTY' && (
                            <span
                              title="Specialty Subject"
                              className="ml-1 text-amber-300"
                            >
                              ★
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-indigo-200 font-normal mt-0.5">
                          Coeff {subj.coeff} •{' '}
                          {subj.moduleType === 'SPECIALTY'
                            ? 'Specialty'
                            : subj.moduleType === 'RELATED'
                            ? 'Related'
                            : 'General'}
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
                        ? 'bg-indigo-50'
                        : 'bg-white group-hover:bg-slate-50';

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-slate-200 group transition-colors duration-150 ${
                            isHighlighted ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-0 z-10 ${rowBg} p-3 border-r border-slate-200 text-center cursor-pointer`}
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
                              className="accent-indigo-600 cursor-pointer rounded"
                            />
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-10 z-10 ${rowBg} p-3 border-r border-slate-200 text-slate-500 font-mono cursor-pointer`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className={`sticky left-[88px] z-10 ${rowBg} p-3 border-r border-slate-200 font-bold w-[230px] min-w-[230px] shadow-[4px_0_8px_rgba(15,23,42,0.08)] cursor-pointer ${
                              isHighlighted ? 'text-indigo-900' : 'text-slate-900'
                            }`}
                          >
                            {student.fullName || student.full_name || student.name}
                          </td>
                          <td
                            onClick={() => toggleHighlightStudent(student.id)}
                            className="p-3 border-r border-slate-200 text-xs text-slate-600 whitespace-nowrap cursor-pointer"
                          >
                            <div className="font-semibold text-slate-800">
                              {student.classLevel || student.class_name || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {student.trades_series || student.series || '—'}
                            </div>
                          </td>
                          {allocatedSubjects.map((subj) => {
                            const isAllocated = isSubjectAllocatedToStudent(student, subj.name);
                            if (!isAllocated) {
                              return (
                                <td
                                  key={subj.id}
                                  className="p-1.5 border-r border-slate-200 text-center bg-slate-100/70 text-slate-400 text-xs"
                                  title="Not allocated to this class/trade specialty"
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
                                className="p-1.5 border-r border-slate-200 text-center"
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
                                    className="w-16 bg-slate-50 border border-slate-300 rounded-lg text-center py-1 font-mono font-bold text-indigo-900 placeholder-slate-400 transition-colors focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
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
                                      className="text-xs leading-none px-1.5 py-1 rounded-lg bg-slate-200 hover:bg-rose-600 text-slate-700 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer font-bold"
                                    >
                                      ×
                                    </button>
                                  )}
                                  {liveGrade && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        checkIndustrialPassing(liveGrade, isAdvanced)
                                          ? 'text-teal-800 bg-teal-100 border border-teal-300'
                                          : 'text-slate-600 bg-slate-200'
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-slate-200">
            <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-4 mb-5">
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-indigo-950">
                  {schoolDisplayName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  MINSEC — TECHNICAL &amp; VOCATIONAL EDUCATION (INDUSTRIAL) | ACADEMIC YEAR:{' '}
                  {currentAcademicYear}
                </p>
                <p className="text-sm font-bold text-teal-800 mt-1 uppercase">
                  {activeLevelTitle} — {examType === 'PRE_MOCK' ? 'PRE-MOCK' : 'MOCK'} BROAD SHEET
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOneClickDownloadPdf}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow transition-all duration-200 active:scale-[0.97] cursor-pointer"
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

            <div className="grid grid-cols-3 gap-4 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 mb-6 text-center text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase">Total Sat</div>
                <div className="font-extrabold text-lg text-slate-950">{totalSat}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Passed Specialty</div>
                <div className="font-extrabold text-lg text-teal-700">{totalPassed}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Percentage Passed</div>
                <div className="font-extrabold text-lg text-indigo-700">{passPercentage}%</div>
              </div>
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 border-l-4 border-indigo-700 pl-2 mb-2">
              Percentage Passed Per Subject
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-indigo-100 text-indigo-950">
                  <th className="border border-slate-300 p-2 text-left">Subject</th>
                  <th className="border border-slate-300 p-2 text-center">Coeff</th>
                  <th className="border border-slate-300 p-2 text-center">Sat</th>
                  <th className="border border-slate-300 p-2 text-center">Passed</th>
                  <th className="border border-slate-300 p-2 text-center">% Passed</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.length > 0 ? (
                  subjectStats.map((st) => (
                    <tr key={st.subject}>
                      <td className="border border-slate-300 p-2 font-medium">
                        {st.subject}
                        {st.moduleType === 'SPECIALTY' && (
                          <span className="ml-1.5 text-[10px] font-bold text-indigo-700">
                            [Specialty ★]
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">{st.coeff}</td>
                      <td className="border border-slate-300 p-2 text-center">{st.sat}</td>
                      <td className="border border-slate-300 p-2 text-center">{st.passed}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {st.rate}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-slate-300 p-4 text-center text-slate-500"
                    >
                      No allocated subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {groupedByTrade.map(([tradeName, tradeCandidates]) => {
              const passedInTrade = tradeCandidates.filter((c) => c.isPassed);
              const listToRender =
                passedInTrade.length > 0 ? passedInTrade : tradeCandidates;
              return (
                <div key={tradeName} className="mb-6">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 border-l-4 border-teal-700 pl-2 mb-2">
                    SPECIALTY: {tradeName} — PASSED IN SPECIALTY: {passedInTrade.length} /{' '}
                    {tradeCandidates.length}
                  </h3>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-indigo-100 text-indigo-950">
                        <th className="border border-slate-300 p-2 text-center w-12">Rank</th>
                        <th className="border border-slate-300 p-2 text-left">Candidate Name</th>
                        <th className="border border-slate-300 p-2 text-left">Class</th>
                        <th className="border border-slate-300 p-2 text-center w-28">
                          Papers Passed
                        </th>
                        <th className="border border-slate-300 p-2 text-left">
                          Passed Subjects (Grade Before Subject)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {listToRender.map((stu, idx) => (
                        <tr key={stu.id}>
                          <td className="border border-slate-300 p-2 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 p-2 font-bold">{stu.name}</td>
                          <td className="border border-slate-300 p-2">{stu.studentClass}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            {stu.numPassed} ({stu.specialtyPassed} Spec.)
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}