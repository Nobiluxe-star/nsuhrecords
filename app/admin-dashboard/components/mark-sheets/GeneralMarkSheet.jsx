'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../../lib/academicYear';

import { 
  GENERAL_CLASSES_CATALOG, 
  GENERAL_SERIES_CATALOG 
} from '../../page';

export default function GeneralMarkSheet({
  activeSchool,
  classLevel,
  selectedTerm = 'Term 1',
  mockComponent,
  selectedSeries = 'N/A'
}) {
  const schoolId = activeSchool?.id || activeSchool?.school_id || '';
  const academicYear = getCurrentAcademicYear();
  const [showMockModal, setShowMockModal] = useState(false);

  // LocalStorage Key Helpers - Strict multi-tenant prefixing
  const STORAGE_KEY_PREFIX = `nsuh_marksheet_${schoolId}_`;

  const [currentClassLevel, setCurrentClassLevel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}class`) || classLevel || GENERAL_CLASSES_CATALOG[0] || '';
    }
    return classLevel || GENERAL_CLASSES_CATALOG[0] || '';
  });

  const [currentTerm, setCurrentTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}term`) || selectedTerm;
    }
    return selectedTerm;
  });

  const isSixthForm = useMemo(() => {
    const lvl = currentClassLevel.toLowerCase();
    return lvl.includes('sixth') || lvl.includes('l6') || lvl.includes('u6');
  }, [currentClassLevel]);

 const [currentSeries, setCurrentSeries] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}series`);
      if (saved !== null) return saved;
    }
    return isSixthForm ? (selectedSeries !== 'N/A' ? selectedSeries : 'ALL') : 'N/A';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedRow, setHighlightedRow] = useState(null);

  // Cached state initializers to prevent blank screen flicker
  const [studentsData, setStudentsData] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}students_${currentClassLevel}_${currentSeries}_${currentTerm}`);
      if (cached) {
        try { return JSON.parse(cached); } catch (e) { /* ignore parse err */ }
      }
    }
    return [];
  });

  const [subjectsList, setSubjectsList] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}subjects_${currentClassLevel}_${currentSeries}`);
      if (cached) {
        try { return JSON.parse(cached); } catch (e) { /* ignore parse err */ }
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);

  // Synchronize base filter state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && schoolId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}class`, currentClassLevel);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}term`, currentTerm);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}series`, currentSeries);
    }
  }, [currentClassLevel, currentTerm, currentSeries, schoolId, STORAGE_KEY_PREFIX]);

  // Sequence dynamic resolution
  const getSequenceFields = useCallback((term) => {
    if (term === 'Term 2') return { seqA: 'seq3_mark', seqB: 'seq4_mark' };
    if (term === 'Term 3') return { seqA: 'seq5_mark', seqB: 'seq6_mark' };
    return { seqA: 'seq1_mark', seqB: 'seq2_mark' };
  }, []);

  const handleClassChange = (newClass) => {
    setCurrentClassLevel(newClass);
    const sixth = newClass.toLowerCase().includes('sixth') || 
                  newClass.toLowerCase().includes('l6') || 
                  newClass.toLowerCase().includes('u6');
    if (!sixth) {
      setCurrentSeries('N/A');
    } else if (currentSeries === 'N/A') {
      setCurrentSeries('');
    }
  };

  const calculateProRataSubjectMark = (marksObj, seqAKey, seqBKey) => {
    if (!marksObj) return null;

    const rawA = marksObj[seqAKey];
    const rawB = marksObj[seqBKey];

    const valA = rawA !== undefined && rawA !== null && rawA !== '' ? parseFloat(rawA) : NaN;
    const valB = rawB !== undefined && rawB !== null && rawB !== '' ? parseFloat(rawB) : NaN;

    const hasA = !isNaN(valA);
    const hasB = !isNaN(valB);

    if (hasA && hasB) return (valA + valB) / 2;
    if (hasA) return valA;
    if (hasB) return valB;
    
    return null;
  };

  const loadMarkSheetData = useCallback(async () => {
    // Strict Multi-tenancy Guard: Require active schoolId
    if (!schoolId || !currentClassLevel) {
      setSubjectsList([]);
      setStudentsData([]);
      return;
    }


    if (studentsData.length === 0) {
      setIsLoading(true);
    }

    try {
      // 1. Fetch subjects/coefficients from JSONB column
      let coefQuery = supabase
        .from('class_coefficients')
        .select('subject_coefficients')
        .eq('school_id', schoolId)
        .eq('classLevel', currentClassLevel.trim());

     if (isSixthForm && currentSeries && currentSeries !== 'ALL') {
  coefQuery = coefQuery.eq('trades_series', currentSeries);
} else if (!isSixthForm) {
  coefQuery = coefQuery.or('trades_series.eq.N/A,trades_series.is.null');
}
      const { data: coefData, error: coefErr } = await coefQuery;
      if (coefErr) throw coefErr;

      // Unpack JSONB subjects array cleanly
      let fetchedSubjects = [];
      if (coefData && coefData.length > 0 && coefData[0].subject_coefficients) {
        const rawSubs = coefData[0].subject_coefficients;
        fetchedSubjects = typeof rawSubs === 'string' ? JSON.parse(rawSubs) : rawSubs;
      }

      const mappedSubjects = fetchedSubjects.map((s, idx) => ({
        id: s.id || `sub_${idx}`,
        subject_name: s.name || s.subject_name || s.subject_code || '',
        coefficient: parseFloat(s.coefficient || s.coef || 1)
      }));

      setSubjectsList(mappedSubjects);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}subjects_${currentClassLevel}_${currentSeries}`, JSON.stringify(mappedSubjects));

      // 2. Fetch students (Strict Multi-tenancy filter by school_id)
      let studentQuery = supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('classLevel', currentClassLevel.trim());

      if (isSixthForm && currentSeries && currentSeries !== 'ALL') {
        studentQuery = studentQuery.eq('trades_series', currentSeries);
      }

      const { data: students, error: studErr } = await studentQuery.order('fullName', { ascending: true });
      if (studErr) throw studErr;

      // 3. Fetch marks (Strict Multi-tenancy filter by school_id & academic_year)
      const studentIds = (students || []).map((s) => s.id);
      let marksData = [];

      if (studentIds.length > 0) {
        const { data: marks, error: markErr } = await supabase
          .from('marks')
          .select('*')
          .eq('school_id', schoolId)
          .eq('academic_year', academicYear)
          .eq('term', currentTerm)
          .in('student_id', studentIds);

        if (markErr) console.warn("Notice loading marks:", markErr.message);
        marksData = marks || [];
      }

      const marksMap = new Map();
      marksData.forEach((m) => {
        if (!m.student_id) return;
        if (!marksMap.has(m.student_id)) marksMap.set(m.student_id, []);
        marksMap.get(m.student_id).push(m);
      });

      const structuredStudents = (students || []).map((st) => ({
        ...st,
        fullName: st.fullName || st.full_name || '',
        uniqueCode: st.unique_code || '—',
        marks: marksMap.get(st.id) || []
      }));

      setStudentsData(structuredStudents);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}students_${currentClassLevel}_${currentSeries}_${currentTerm}`, JSON.stringify(structuredStudents));
    } catch (err) {
      console.error('Error loading General Mark Sheet:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, currentClassLevel, currentTerm, currentSeries, isSixthForm, academicYear, STORAGE_KEY_PREFIX, studentsData.length]);

  useEffect(() => {
    loadMarkSheetData();
  }, [loadMarkSheetData]);

  // Real-time Supabase Subscription for live automatic updates without page refresh
  useEffect(() => {
    if (!schoolId) return;

    const channel = supabase
      .channel(`realtime_marks_${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marks',
          filter: `school_id=eq.${schoolId}`
        },
        () => {
          loadMarkSheetData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, loadMarkSheetData]);

  const handleMarkChange = async (student, subjectName, seqColumn, rawVal) => {
    if (!schoolId) return;

    const parsedVal = rawVal === '' ? null : Math.min(20, Math.max(0, parseFloat(rawVal) || 0));

    const updatedStudents = studentsData.map((s) => {
      if (s.id === student.id) {
        const currentMarks = [...(s.marks || [])];
        const markIndex = currentMarks.findIndex((m) => m.subject_name === subjectName);

        if (markIndex > -1) {
          currentMarks[markIndex] = { ...currentMarks[markIndex], [seqColumn]: parsedVal };
        } else {
          currentMarks.push({
            school_id: schoolId,
            student_id: student.id,
            subject_name: subjectName,
            term: currentTerm,
            academic_year: academicYear,
            [seqColumn]: parsedVal
          });
        }
        return { ...s, marks: currentMarks };
      }
      return s;
    });

    // Offline Read/Write Cache Persistence
    setStudentsData(updatedStudents);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}students_${currentClassLevel}_${currentSeries}_${currentTerm}`, JSON.stringify(updatedStudents));

    try {
      await supabase.from('marks').upsert({
        school_id: schoolId,
        student_id: student.id,
        subject_name: subjectName,
        term: currentTerm,
        academic_year: academicYear,
        [seqColumn]: parsedVal
      }, {
        onConflict: 'school_id,student_id,subject_name,term,academic_year'
      });
    } catch (err) {
      console.error('Error persisting mark to server:', err);
    }
  };

  const filteredStudents = studentsData.filter((st) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return st.fullName.toLowerCase().includes(q) || st.uniqueCode.toLowerCase().includes(q);
  });

  const { seqA, seqB } = getSequenceFields(currentTerm);

  const seriesList = useMemo(() => {
    const catalog = GENERAL_SERIES_CATALOG?.series || GENERAL_SERIES_CATALOG || {};
    const isArts = currentClassLevel.toLowerCase().includes('art');
    
    const targetGroup = isArts ? catalog.ARTS : catalog.SCIENCE;
    if (!targetGroup) return [];

    return targetGroup.map(s => (typeof s === 'object' ? s.code || s.name : s)).filter(Boolean);
  }, [currentClassLevel]);

  function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  const computeClassStats = () => {
    if (!filteredStudents?.length || !subjectsList?.length) {
      return { subjectStats: {}, classAvg: '-', studentsWithMetrics: [] };
    }

    const { seqA, seqB } = getSequenceFields(currentTerm);
    const subjectStats = {};

    subjectsList.forEach((sub) => {
      const sName = sub.subject_name || sub.subject_code;
      let sum = 0;
      let count = 0;
      let passCount = 0;

      filteredStudents.forEach((st) => {
        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
        const avg = calculateProRataSubjectMark(mRecord, seqA, seqB);
        if (avg !== null) {
          sum += avg;
          count += 1;
          if (avg >= 10) passCount += 1;
        }
      });

      subjectStats[sName] = {
        avg: count > 0 ? (sum / count).toFixed(2) : '-',
        passPct: count > 0 ? Math.round((passCount / count) * 100) + '%' : '-'
      };
    });

    const calculated = filteredStudents.map((st) => {
      let totalCoef = 0;
      let weightedSum = 0;
      let entriesCount = 0;

      subjectsList.forEach((sub) => {
        const sName = sub.subject_name || sub.subject_code;
        const coef = parseFloat(sub.coefficient || 1);
        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
        const avg = calculateProRataSubjectMark(mRecord, seqA, seqB);

        if (avg !== null) {
          weightedSum += avg * coef;
          totalCoef += coef;
          entriesCount += 1;
        }
      });

      const studentAvg = totalCoef > 0 ? weightedSum / totalCoef : null;

      let status = 'Pending';
      if (entriesCount > 0 && studentAvg !== null) {
        status = studentAvg >= 10 ? 'Passed' : 'Failed';
      }

      return {
        ...st,
        totalCoef,
        studentAvg,
        formattedAvg: studentAvg !== null ? studentAvg.toFixed(2) : '-',
        status
      };
    });

    const sorted = [...calculated]
      .filter((s) => s.studentAvg !== null)
      .sort((a, b) => b.studentAvg - a.studentAvg);

    const studentsWithMetrics = calculated.map((st) => {
      if (st.studentAvg === null) return { ...st, rank: '-' };
      const rankIndex = sorted.findIndex((s) => s.id === st.id) + 1;
      return { ...st, rank: `${rankIndex}${getOrdinalSuffix(rankIndex)}` };
    });

    const validStudentsWithAvg = studentsWithMetrics.filter((s) => s.studentAvg !== null);
    const overallClassAvgSum = validStudentsWithAvg.reduce((acc, s) => acc + s.studentAvg, 0);
    const classAvg = validStudentsWithAvg.length > 0 
      ? (overallClassAvgSum / validStudentsWithAvg.length).toFixed(2) 
      : '-';

    return { subjectStats, classAvg, studentsWithMetrics };
  };

  const { subjectStats, classAvg, studentsWithMetrics } = useMemo(() => {
    return computeClassStats();
  }, [filteredStudents, subjectsList, currentTerm]);

  // Top 3 Students overall in Class
  const top3Students = useMemo(() => {
    const list = Array.isArray(studentsWithMetrics) ? studentsWithMetrics : [];
    return [...list]
      .filter((st) => st.studentAvg !== null)
      .sort((a, b) => b.studentAvg - a.studentAvg)
      .slice(0, 3);
  }, [studentsWithMetrics]);

  const subjectChampions = useMemo(() => {
    const champions = {};
    const studentsList = Array.isArray(studentsWithMetrics) ? studentsWithMetrics : [];
    const { seqA, seqB } = getSequenceFields(currentTerm);

    subjectsList.forEach((sub) => {
      const sName = sub.subject_name || sub.subject_code;
      let highestScore = -1;
      let topStudent = null;

      studentsList.forEach((st) => {
        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
        const avg = calculateProRataSubjectMark(mRecord, seqA, seqB);

        if (avg !== null && avg > highestScore) {
          highestScore = avg;
          topStudent = { name: st.fullName, score: avg.toFixed(2) };
        }
      });

      if (topStudent) {
        champions[sName] = topStudent;
      }
    });
    return champions;
  }, [subjectsList, studentsWithMetrics, currentTerm, getSequenceFields]);

  const lowestPerformers = useMemo(() => {
    const studentsList = Array.isArray(studentsWithMetrics) ? studentsWithMetrics : [];

    return [...studentsList]
      .filter((st) => st.totalCoef > 0 && st.status !== 'Pending' && st.studentAvg !== null)
      .sort((a, b) => a.studentAvg - b.studentAvg)
      .slice(0, 2);
  }, [studentsWithMetrics]);

  const annualAnalytics = useMemo(() => {
    if (currentTerm !== 'Term 3') return null;

    const studentsList = Array.isArray(studentsWithMetrics) ? studentsWithMetrics : [];

    const overallChampion = [...studentsList]
      .filter((st) => st.totalCoef > 0 && st.status !== 'Pending' && st.studentAvg !== null)
      .sort((a, b) => b.studentAvg - a.studentAvg)[0] || null;

    return { overallChampion };
  }, [currentTerm, studentsWithMetrics]);

 // HTML-based Excel Exporter matching UI structure (2-level headers & summary rows)
  const exportToExcel = () => {
    try {
      if (!studentsWithMetrics || studentsWithMetrics.length === 0) {
        alert('No data available in the current table to download.');
        return;
      }

      const { seqA: exportSeqA, seqB: exportSeqB } = getSequenceFields(currentTerm);

      const seqALabel = exportSeqA ? exportSeqA.toUpperCase() : 'SEQ A';
      const seqBLabel = exportSeqB ? exportSeqB.toUpperCase() : 'SEQ B';

      // 1. Build Top Header Row
      let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
        <table border="1">
          <thead>
            <tr style="background-color: #0F172A; color: #FFFFFF; font-weight: bold;">
              <th rowspan="2">N°</th>
              <th rowspan="2">Student Name</th>
              <th rowspan="2">Matricule</th>
      `;

      // Subject Headers (Colspan = 2 for sequence columns)
      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code || '';
        const coef = sub.coefficient || 1;
        tableHtml += `<th colspan="2" style="text-align: center;">${sName}<br/><span style="font-size: 10px;">Coeff: ${coef}</span></th>`;
      });

      tableHtml += `
              <th rowspan="2">Total Coeff</th>
              <th rowspan="2">Student Avg</th>
              <th rowspan="2">Rank</th>
              <th rowspan="2">Status</th>
            </tr>
            <tr style="background-color: #1E293B; color: #10B981; font-weight: bold; text-align: center;">
      `;

      // Sub-headers for Sequence marks
      subjectsList.forEach(() => {
        tableHtml += `<th>${seqALabel}</th><th>${seqBLabel}</th>`;
      });

      tableHtml += `</tr></thead><tbody>`;

      // Structure to dynamically compute subject statistics
      const subjectStats = {};
      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code;
        subjectStats[sName] = { total: 0, count: 0, passed: 0 };
      });

      let classTotalAvg = 0;
      let validStudentCount = 0;

      // 2. Build Student Data Rows
      studentsWithMetrics.forEach((st, idx) => {
        tableHtml += `<tr>`;
        tableHtml += `<td style="text-align: center;">${idx + 1}</td>`;
        tableHtml += `<td>${st.fullName || ''}</td>`;
        tableHtml += `<td>${st.uniqueCode || ''}</td>`;

        if (st.numericAvg !== undefined && !isNaN(st.numericAvg)) {
          classTotalAvg += parseFloat(st.numericAvg);
          validStudentCount++;
        }

        subjectsList.forEach(sub => {
          const sName = sub.subject_name || sub.subject_code;
          const mRecord = st.marks?.find(m => m.subject_name === sName) || {};
          
          const markA = exportSeqA && mRecord[exportSeqA] !== undefined && mRecord[exportSeqA] !== null ? mRecord[exportSeqA] : '-';
          const markB = exportSeqB && mRecord[exportSeqB] !== undefined && mRecord[exportSeqB] !== null ? mRecord[exportSeqB] : '-';

          // Track subject mark averages
          const subjAvg = calculateProRataSubjectMark(mRecord, exportSeqA, exportSeqB);
          if (subjAvg !== null && !isNaN(subjAvg)) {
            subjectStats[sName].total += subjAvg;
            subjectStats[sName].count += 1;
            if (subjAvg >= 10) {
              subjectStats[sName].passed += 1;
            }
          }

          tableHtml += `<td style="text-align: center;">${markA}</td>`;
          tableHtml += `<td style="text-align: center;">${markB}</td>`;
        });

        tableHtml += `<td style="text-align: center;">${st.totalCoef ?? 0}</td>`;
        tableHtml += `<td style="text-align: center; font-weight: bold;">${st.formattedAvg ?? '-'}</td>`;
        tableHtml += `<td style="text-align: center;">${st.rank || '-'}</td>`;
        tableHtml += `<td style="text-align: center;">${st.status || '-'}</td>`;
        tableHtml += `</tr>`;
      });

      // 3. Subject Summary Rows (Subject Average & % Passed)
      // Row 1: Subject Average
      tableHtml += `<tr style="background-color: #0F172A; color: #10B981; font-weight: bold;">`;
      tableHtml += `<td colspan="3" style="text-align: right;">Subject Average</td>`;

      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code;
        const stats = subjectStats[sName];
        const avgDisplay = stats && stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '-';
        tableHtml += `<td colspan="2" style="text-align: center;">${avgDisplay}</td>`;
      });

      tableHtml += `<td colspan="4"></td></tr>`;

      // Row 2: % Passed (>= 10/20)
      tableHtml += `<tr style="background-color: #0F172A; color: #10B981; font-weight: bold;">`;
      tableHtml += `<td colspan="3" style="text-align: right;">% Passed (&ge;10/20)</td>`;

      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code;
        const stats = subjectStats[sName];
        const passPctDisplay = stats && stats.count > 0 ? `${((stats.passed / stats.count) * 100).toFixed(0)}%` : '-';
        tableHtml += `<td colspan="2" style="text-align: center;">${passPctDisplay}</td>`;
      });

      tableHtml += `<td colspan="4"></td></tr>`;

      // 4. Overall Class Average Footer Row
      const overallClassAvgDisplay = validStudentCount > 0 ? (classTotalAvg / validStudentCount).toFixed(2) : '-';
      const totalColumns = 3 + (subjectsList.length * 2) + 4;

      tableHtml += `
        <tr style="background-color: #062019; color: #10B981; font-weight: bold; font-size: 14px;">
          <td colspan="${totalColumns}" style="text-align: center; padding: 8px;">
            Overall Class Average: ${overallClassAvgDisplay} / 20
          </td>
        </tr>
      `;

      tableHtml += `</tbody></table></body></html>`;

      // Download trigger using Blob
      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const fileName = `MasterMarkSheet_${(currentClassLevel || 'Class').replace(/[^a-zA-Z0-9]/g, '_')}_${(currentTerm || 'Term').replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.xls`;

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, fileName);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 200);
      }
    } catch (error) {
      console.error('Download execution error:', error);
      alert(`Could not generate download: ${error.message}`);
    }
  };
  return (
    <div className="p-[#10B981] rounded-xl border border-gray-800 text-white space-y-4">
      {/* Top Header Block matching the exact design layout */}
      {/* Top Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-[#10B981]">General Education Master Mark Sheet</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Class: <span className="text-white font-medium">{currentClassLevel}</span> | Term: <span className="text-white font-medium">{currentTerm}</span>
          </p>
        </div>
      {/* PreMock / Mock Dashboard Launch Button */}
  <button
    type="button"
    onClick={() => setShowMockModal(true)}
    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
  >
    <span>🏆</span> PreMock / Mock Results
  </button>
        {/* Top-Right Badge & Action Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Academic Year Badge */}
          <div className="px-2.5 py-1 bg-[#062019] border border-[#10B981] text-[#10B981] text-[11px] font-semibold rounded-md">
            Academic Year: {academicYear}
          </div>

          {/* Download Excel Button */}
          <button
            type="button"
            onClick={exportToExcel}
            className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#0ea5e9] text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <span>📊</span> Download Excel
          </button>
        </div>
      </div>

      {/* Filter Controls Grid (Mobile Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
        {/* Term Selector */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Term</label>
          <select
            value={currentTerm}
            onChange={(e) => setCurrentTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:border-[#10B981] focus:outline-none"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Class Level</label>
          <select
            value={currentClassLevel}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:border-[#10B981] focus:outline-none"
          >
            {GENERAL_CLASSES_CATALOG.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

       {/* Series Selector */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Series</label>
          <select
            disabled={!isSixthForm}
            value={currentSeries}
            onChange={(e) => setCurrentSeries(e.target.value)}
            className={`w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:border-[#10B981] focus:outline-none ${!isSixthForm ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {!isSixthForm ? (
              <option value="N/A">Series: N/A</option>
            ) : (
              <>
                <option value="ALL">🌐 All Series (Combined Master)</option>
                {seriesList.map((s) => (
                  <option key={s.code || s} value={s.code || s}>{s.code ? `${s.code} - ${s.name}` : s}</option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Student</label>
          <input
            type="text"
            placeholder="Search student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:border-[#10B981] focus:outline-none"
          />
        </div>
      </div>

    {isLoading && studentsData.length === 0 ? (
  <p className="text-gray-400 text-sm py-4">Loading mark sheet records...</p>
) : (
  <div className="overflow-x-auto touch-pan-x max-h-[600px] border border-gray-800 rounded-lg relative">

         {/* MOBILE-OPTIMIZED LANDSCAPE-FRIENDLY MARK ENTRY (FOREST GREEN & WHITE BEIGE) */}
         <div className="block md:hidden overflow-x-auto bg-[#FDFBF7] -mx-4 w-[calc(100%+2rem)] border-y border-[#064e3b]">
            <div className="text-[10px] text-[#064e3b] font-bold pb-1.5 text-center border-b border-[#064e3b]/20 mb-2">
              💡 Rotate phone to landscape for optimal multi-student view
            </div>
            
            <table className="w-full text-left border-collapse text-xs bg-[#FDFBF7] text-slate-900 min-w-[650px]">
              <thead>
                <tr className="bg-[#064e3b] text-[#FDFBF7]">
                  <th className="p-2 border border-[#064e3b] text-center w-[30px]">N°</th>
                  <th className="p-2 border border-[#064e3b] font-bold min-w-[130px]">Student Name</th>
                  <th className="p-2 border border-[#064e3b] text-center min-w-[80px]">Matricule</th>
                  {subjectsList.map((sub, idx) => (
                    <th key={sub.id || idx} className="p-1.5 border border-[#064e3b] text-center text-[10px] min-w-[90px]">
                      <div className="font-bold truncate">{sub.subject_name || sub.subject_code}</div>
                      <div className="text-[9px] text-emerald-200 font-normal">Coef: {sub.coefficient || 1}</div>
                    </th>
                  ))}
                  <th className="p-2 border border-[#064e3b] text-center font-bold min-w-[60px] text-amber-300">Avg</th>
                  <th className="p-2 border border-[#064e3b] text-center font-bold min-w-[50px] text-emerald-200">Rank</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5 + subjectsList.length} className="p-4 text-center text-slate-500 italic">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  studentsWithMetrics.map((st, idx) => (
                    <tr key={st.id || idx} className="border-b border-[#064e3b]/20 hover:bg-[#064e3b]/5">
                      <td className="p-1 border border-[#064e3b]/30 text-center font-mono text-[10px] text-slate-600">{idx + 1}</td>
                      <td className="p-1 border border-[#064e3b]/30 font-bold text-[#064e3b] truncate max-w-[130px]">{st.fullName}</td>
                      <td className="p-1 border border-[#064e3b]/30 text-center font-mono text-[9px] text-slate-500">{st.uniqueCode}</td>
                      
                      {subjectsList.map((sub, subIdx) => {
                        const sName = sub.subject_name || sub.subject_code;
                        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
                        return (
                          <td key={sub.id || subIdx} className="p-1 border border-[#064e3b]/30 text-center">
                            <div className="flex gap-1 justify-center">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                placeholder="S1"
                                value={mRecord[seqA] ?? ''}
                                onChange={(e) => handleMarkChange(st, sName, seqA, e.target.value)}
                                className="w-9 p-1 bg-[#FDFBF7] border border-[#064e3b]/60 rounded text-center text-[#064e3b] font-bold text-xs focus:ring-2 focus:ring-[#064e3b] outline-none"
                              />
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                placeholder="S2"
                                value={mRecord[seqB] ?? ''}
                                onChange={(e) => handleMarkChange(st, sName, seqB, e.target.value)}
                                className="w-9 p-1 bg-[#FDFBF7] border border-[#064e3b]/60 rounded text-center text-[#064e3b] font-bold text-xs focus:ring-2 focus:ring-[#064e3b] outline-none"
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-1 border border-[#064e3b]/30 text-center font-black text-[#064e3b]">{st.formattedAvg}</td>
                      <td className="p-1 border border-[#064e3b]/30 text-center font-bold text-[#064e3b]">{st.rank}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#064e3b] text-[#FDFBF7] font-bold border-t-2 border-[#064e3b]">
                <tr>
                  <td colSpan={3} className="p-2 border border-[#064e3b] text-right text-emerald-100">
                    Subject Average
                  </td>
                  {subjectsList.map((sub, idx) => {
                    const sName = sub.subject_name || sub.subject_code;
                    return (
                      <td key={sub.id || idx} className="p-2 border border-[#064e3b] text-center font-mono">
                        {subjectStats[sName]?.avg || '-'}
                      </td>
                    );
                  })}
                  <td colSpan={2} className="p-2 border border-[#064e3b]"></td>
                </tr>

                <tr>
                  <td colSpan={3} className="p-2 border border-[#064e3b] text-right text-emerald-100">
                    % Passed (&ge;10/20)
                  </td>
                  {subjectsList.map((sub, idx) => {
                    const sName = sub.subject_name || sub.subject_code;
                    return (
                      <td key={sub.id || idx} className="p-2 border border-[#064e3b] text-center text-amber-300 font-mono">
                        {subjectStats[sName]?.passPct || '-'}
                      </td>
                    );
                  })}
                  <td colSpan={2} className="p-2 border border-[#064e3b]"></td>
                </tr>

                <tr className="bg-[#043e2f] text-white">
                  <td colSpan={5 + subjectsList.length} className="p-2.5 border border-[#064e3b] text-center text-xs font-black text-emerald-200 uppercase tracking-wide">
                    Overall Class Average: {classAvg} / 20
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
           {/* DESKTOP MASTER MARK SHEET (FOREST GREEN & WHITE BEIGE THEME) */}
          <table className="hidden md:table w-full text-left border-collapse text-xs bg-[#FDFBF7] text-slate-900 border-2 border-[#064e3b]">
           <thead className="sticky top-0 bg-[#064e3b] text-[#FDFBF7] z-30 shadow-md">
              <tr className="bg-[#064e3b]">
                {/* Fixed Sticky Headers */}
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 w-[40px] text-center sticky left-0 bg-[#064e3b] text-[#FDFBF7] z-30 font-bold">N°</th>
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 min-w-[180px] sticky left-[40px] bg-[#064e3b] text-[#FDFBF7] z-30 font-bold text-left">Student Name</th>
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 min-w-[110px] sticky left-[220px] bg-[#064e3b] text-[#FDFBF7] z-30 font-bold text-center">Matricule</th>

                {/* Dynamic Subject Headers with Screenshot 2 Column Divider Box Styling */}
                {subjectsList.map((sub, idx) => (
                  <th key={sub.id || sub.subject_code || sub.subject_name || `sub-${idx}`} className="p-3 border-r border-b border-[#FDFBF7]/20 text-center min-w-[120px] bg-[#064e3b]">
                    <div className="font-bold text-white text-xs tracking-wide">{sub.subject_name || sub.subject_code || `Subject ${idx + 1}`}</div>
                    <div className="text-[10px] text-emerald-200 font-medium mt-0.5">Coeff: {sub.coefficient || 1}</div>
                  </th>
                ))}
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 text-center min-w-[90px] bg-[#064e3b] text-amber-300 font-bold">
                  Total Coeff
                </th>
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 text-center min-w-[90px] bg-[#064e3b] text-emerald-200 font-bold">
                  Student Avg
                </th>
                <th className="p-3 border-r border-b border-[#FDFBF7]/20 text-center min-w-[80px] bg-[#064e3b] text-amber-200 font-bold">
                  Rank
                </th>
                <th className="p-3 border-b border-[#FDFBF7]/20 text-center min-w-[100px] bg-[#064e3b] text-slate-100 font-bold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7 + subjectsList.length} className="p-6 text-center text-slate-500 italic">
                    No student records found for {currentClassLevel}.
                  </td>
                </tr>
              ) : (
                studentsWithMetrics.map((st, idx) => {
                  const isHighlighted = highlightedRow === st.id;
                  const rowClass = isHighlighted 
                    ? 'bg-emerald-100/70 border-b border-[#064e3b]/40' 
                    : 'border-b border-[#064e3b]/20 hover:bg-[#064e3b]/5';

                  const stickyCellBg = isHighlighted ? 'bg-emerald-100' : 'bg-[#FDFBF7]';

                  return (
                    <tr 
                      key={st.id || idx} 
                      className={`${rowClass} transition-colors duration-150 cursor-pointer`}
                      onClick={() => setHighlightedRow(isHighlighted ? null : st.id)}
                    >
                      {/* Sticky Identifiers */}
                      <td className={`p-2 border border-[#064e3b]/30 text-center text-slate-600 sticky left-0 ${stickyCellBg} z-20 font-mono text-[11px]`}>
                        {idx + 1}
                      </td>
                      <td className={`p-2 border border-[#064e3b]/30 font-bold text-[#064e3b] sticky left-[40px] ${stickyCellBg} z-20 truncate max-w-[180px]`}>
                        {st.fullName}
                      </td>
                      <td className={`p-2 border border-[#064e3b]/30 text-slate-500 sticky left-[220px] ${stickyCellBg} z-20 font-mono text-[10px]`}>
                        {st.uniqueCode}
                      </td>

                      {/* Marks Input Cells */}
                      {subjectsList.map((sub, subIdx) => {
                        const sName = sub.subject_name || sub.subject_code;
                        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};

                        return (
                          <td key={sub.id || sName || `sub-cell-${subIdx}`} className="p-1 border border-[#064e3b]/30 text-center">
                            <div className="flex space-x-1 justify-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                placeholder={currentTerm === 'Term 1' ? 'S1' : currentTerm === 'Term 2' ? 'S3' : 'S5'}
                                value={mRecord[seqA] ?? ''}
                                onChange={(e) => handleMarkChange(st, sName, seqA, e.target.value)}
                                className="w-11 p-1 bg-[#FDFBF7] border border-[#064e3b]/60 rounded text-center text-[#064e3b] font-bold focus:ring-2 focus:ring-[#064e3b] focus:outline-none text-xs"
                              />
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                placeholder={currentTerm === 'Term 1' ? 'S2' : currentTerm === 'Term 2' ? 'S4' : 'S6'}
                                value={mRecord[seqB] ?? ''}
                                onChange={(e) => handleMarkChange(st, sName, seqB, e.target.value)}
                                className="w-11 p-1 bg-[#FDFBF7] border border-[#064e3b]/60 rounded text-center text-[#064e3b] font-bold focus:ring-2 focus:ring-[#064e3b] focus:outline-none text-xs"
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-2 border border-[#064e3b]/30 text-center font-bold text-amber-800 bg-[#064e3b]/5">
                        {st.totalCoef}
                      </td>
                      <td className="p-2 border border-[#064e3b]/30 text-center font-black text-[#064e3b] bg-[#064e3b]/5 text-sm">
                        {st.formattedAvg}
                      </td>
                      <td className="p-2 border border-[#064e3b]/30 text-center font-bold text-slate-700 bg-[#064e3b]/5">
                        {st.rank}
                      </td>
                      <td className="p-2 border border-[#064e3b]/30 text-center bg-[#064e3b]/5">
                        {st.status === 'Passed' && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-700 text-white border border-emerald-800">
                            Passed
                          </span>
                        )}
                        {st.status === 'Failed' && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-700 text-white border border-rose-800">
                            Failed
                          </span>
                        )}
                        {st.status === 'Pending' && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-400">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Summary Footer Rows */}
            <tfoot className="bg-[#064e3b] font-bold text-[#FDFBF7] border-t-2 border-[#064e3b]">
              <tr>
                <td colSpan={3} className="p-2 border border-[#064e3b] text-right text-emerald-100 sticky left-0 bg-[#064e3b] z-20">
                  Subject Average
                </td>
                {subjectsList.map((sub, idx) => {
                  const sName = sub.subject_name || sub.subject_code;
                  return (
                    <td key={sub.id || sName || `foot-avg-${idx}`} className="p-2 border border-[#064e3b] text-center font-mono">
                      {subjectStats[sName]?.avg || '-'}
                    </td>
                  );
                })}
                <td colSpan={4} className="p-2 border border-[#064e3b] bg-[#043e2f]"></td>
              </tr>

              <tr>
                <td colSpan={3} className="p-2 border border-[#064e3b] text-right text-emerald-100 sticky left-0 bg-[#064e3b] z-20">
                  % Passed (&ge;10/20)
                </td>
                {subjectsList.map((sub, idx) => {
                  const sName = sub.subject_name || sub.subject_code;
                  return (
                    <td key={sub.id || sName || `foot-pass-${idx}`} className="p-2 border border-[#064e3b] text-center text-amber-300 font-mono">
                      {subjectStats[sName]?.passPct || '-'}
                    </td>
                  );
                })}
                <td colSpan={4} className="p-2 border border-[#064e3b] bg-[#043e2f]"></td>
              </tr>
              <tr className="bg-[#043e2f] text-white">
                <td colSpan={3 + subjectsList.length + 4} className="p-2.5 border border-[#064e3b] text-center text-sm font-black text-emerald-200 uppercase tracking-wide">
                  Overall Class Average: {classAvg} / 20
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Analytics Container */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top 3 Students Podium */}
        <div className="lg:col-span-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-800/40 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-[#10B981] flex items-center gap-2">
              🥇 Top 3 Overall Performers (Class Podium)
            </h3>
            <span className="text-xs text-slate-400">Class Rank Leaderboard</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3Students.length > 0 ? (
              top3Students.map((st, index) => {
                const badges = [
                  { label: '1st Place', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '🥇' },
                  { label: '2nd Place', color: 'bg-slate-400/20 text-slate-200 border-slate-400/40', icon: '🥈' },
                  { label: '3rd Place', color: 'bg-amber-700/20 text-amber-500 border-amber-700/40', icon: '🥉' }
                ];
                const badge = badges[index] || badges[2];

                return (
                  <div key={st.id || index} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between shadow-md">
                    <div className="flex items-start justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color} flex items-center gap-1`}>
                        {badge.icon} {badge.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{st.uniqueCode}</span>
                    </div>

                    <div className="my-3">
                      <p className="text-base font-bold text-white truncate">{st.fullName}</p>
                      <p className="text-xs text-slate-400">Status: <span className="text-[#10B981] font-semibold">{st.status}</span></p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Term Average:</span>
                      <span className="text-xl font-extrabold text-[#10B981]">{st.formattedAvg} / 20</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 italic col-span-3">No student averages available to establish leaderboard.</p>
            )}
          </div>
        </div>

        {/* Subject Champions Grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-[#10B981] flex items-center gap-2">
              🏆 Term Subject Champions
            </h3>
            <span className="text-xs text-slate-400">Best Mark per Subject</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {subjectsList.map((sub, idx) => {
              const sName = sub.subject_name || sub.subject_code;
              const champ = subjectChampions ? subjectChampions[sName] : null;
              return (
                <div 
                  key={sub.id || sName || `champ-${idx}`} 
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3"
                >
                  <span className="text-xs font-semibold text-slate-400 block truncate">{sName}</span>
                  {champ ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-white truncate">{champ.name}</p>
                      <p className="text-xs font-semibold text-[#10B981] mt-0.5">{champ.score} / 20</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">No marks yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Academic Risk Warnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-amber-400 flex items-center gap-2">
              ⚠️ Academic Support Needed
            </h3>
            <span className="text-xs text-slate-400">Lowest Term Performers</span>
          </div>

          <div className="space-y-3">
            {lowestPerformers.length > 0 ? (
              lowestPerformers.map((st) => (
                <div key={st.id} className="bg-slate-800/60 border border-amber-900/40 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{st.fullName}</p>
                    <p className="text-xs text-slate-400 font-mono">{st.uniqueCode}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-400">{st.formattedAvg} / 20</span>
                    <span className="block text-[10px] text-red-400 font-semibold">{st.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No students currently flagged for academic risk.</p>
            )}
          </div>

          {/* Annual Champion Highlight (Term 3 Only) */}
          {annualAnalytics?.overallChampion && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block mb-1">
                👑 Annual Champion (Term 3 Overall)
              </span>
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{annualAnalytics.overallChampion.fullName}</p>
                  <p className="text-[10px] text-emerald-400/80 font-mono">{annualAnalytics.overallChampion.uniqueCode}</p>
                </div>
                <span className="text-sm font-extrabold text-emerald-300">
                  {annualAnalytics.overallChampion.formattedAvg} / 20
                </span>
              </div>
            </div>
          
          )}
        </div>

      </div>
        {/* Touch & Mobile Friendly PreMock / Mock Dashboard Overlay Modal */}
{showMockModal && (
  <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
    <div className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] overflow-y-auto bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-2 sm:p-6">
      <div className="sticky top-0 z-50 flex justify-end pb-2 bg-slate-900/90 backdrop-blur-sm">
        <button
          onClick={() => setShowMockModal(false)}
          className="text-slate-300 hover:text-white text-xs sm:text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 shadow-md active:scale-95 transition"
        >
          ✕ Close Dashboard
        </button>
      </div>
    {mockComponent}
    </div>
  </div>
)}
    </div>
  );
}