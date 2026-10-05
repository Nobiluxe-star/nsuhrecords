'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../../lib/academicYear';


import { 
  TECHNICAL_INDUSTRIAL_CATALOG, 
  INDUSTRIAL_TRADE_SERIES 
} from '../../page';

export default function TechnicalIndustrialMarkSheet({
  activeSchool,
  classLevel,
  selectedTerm = 'Term 1',
  selectedTrade = 'ALL'
}) {
  const [currentClassLevel, setCurrentClassLevel] = useState(
    classLevel || TECHNICAL_INDUSTRIAL_CATALOG[0] || ''
  );
  const [currentTerm, setCurrentTerm] = useState(selectedTerm);
  const [currentTrade, setCurrentTrade] = useState(selectedTrade);
  const [isBulkCardOpen, setIsBulkCardOpen] = useState(false);
  
  useEffect(() => {
    if (selectedTerm) {
      setCurrentTerm(selectedTerm);
    }
  }, [selectedTerm]);

  const [searchTerm, setSearchTerm] = useState('');
  const [studentsData, setStudentsData] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const academicYear = getCurrentAcademicYear();

  // Offline Caching Utility Keys
  const getCacheKey = useCallback((type) => {
    const schoolId = activeSchool?.id || activeSchool?.school_id || 'default_school';
    return `ind_sheet_${type}_${schoolId}_${currentClassLevel}_${currentTrade}_${currentTerm}_${academicYear}`;
  }, [activeSchool, currentClassLevel, currentTrade, currentTerm, academicYear]);

  // Map term to exact sequence database column names in Supabase
  const getSequenceFields = useCallback((term) => {
    if (term === 'Term 2') return { seqA: 'seq3_mark', seqB: 'seq4_mark' };
    if (term === 'Term 3') return { seqA: 'seq5_mark', seqB: 'seq6_mark' };
    return { seqA: 'seq1_mark', seqB: 'seq2_mark' };
  }, []);

  useEffect(() => {
    if (classLevel) setCurrentClassLevel(classLevel);
    if (selectedTerm) setCurrentTerm(selectedTerm);
    if (selectedTrade) setCurrentTrade(selectedTrade);
  }, [classLevel, selectedTerm, selectedTrade]);

  // Pro-rata evaluation: penalizes no student for missing evaluations
  const calculateProRataSubjectMark = (marksObj, seqAKey, seqBKey) => {
    if (!marksObj) return null;

    const rawA = marksObj[seqAKey];
    const rawB = marksObj[seqBKey];

    const valA = rawA !== undefined && rawA !== null && rawA !== '' ? parseFloat(rawA) : NaN;
    const valB = rawB !== undefined && rawB !== null && rawB !== '' ? parseFloat(rawB) : NaN;

    const hasA = !isNaN(valA);
    const hasB = !isNaN(valB);

    if (hasA && hasB) return (valA + valB) / 2; // Both sequences present
    if (hasA) return valA;                      // Only Sequence A present
    if (hasB) return valB;                      // Only Sequence B present
    
    return null;                                // No sequence entered yet
  };

  const loadIndustrialData = useCallback(async () => {
    const schoolId = activeSchool?.id || activeSchool?.school_id;
    if (!schoolId || !currentClassLevel) return;

    setIsLoading(true);

    // Try reading offline cache first
    try {
      const cachedSubs = localStorage.getItem(getCacheKey('subjects'));
      const cachedStuds = localStorage.getItem(getCacheKey('students'));
      if (cachedSubs) setSubjectsList(JSON.parse(cachedSubs));
      if (cachedStuds) setStudentsData(JSON.parse(cachedStuds));
    } catch (e) {
      console.warn('LocalStorage read warning:', e);
    }

    try { 
      // 1. Fetch subjects/coefficients from JSONB column for Technical Industrial
      let coefQuery = supabase
        .from('class_coefficients')
        .select('subject_coefficients')
        .eq('school_id', schoolId)
        .eq('classLevel', currentClassLevel.trim());

      if (currentTrade && currentTrade !== 'ALL') {
        coefQuery = coefQuery.eq('trades_series', currentTrade);
      } else {
        coefQuery = coefQuery.or('trades_series.eq.N/A,trades_series.is.null,trades_series.eq.FOUNDATIONAL');
      }

      const { data: coefData, error: coefErr } = await coefQuery;
      if (coefErr) throw coefErr;

      // Unpack JSONB subjects array cleanly
      let fetchedSubjects = [];
      if (coefData && coefData.length > 0 && coefData[0].subject_coefficients) {
        const rawSubs = coefData[0].subject_coefficients;
        fetchedSubjects = typeof rawSubs === 'string' ? JSON.parse(rawSubs) : rawSubs;
      }

      // Map fields safely
      const mappedSubjects = fetchedSubjects.map((s, idx) => ({
        id: s.id || `sub_${idx}`,
        subject_name: s.name || s.subject_name || s.subject_code || '',
        coefficient: parseFloat(s.coefficient || s.coef || 1)
      }));

      setSubjectsList(mappedSubjects);
      try { localStorage.setItem(getCacheKey('subjects'), JSON.stringify(mappedSubjects)); } catch (e) {}

      // 2. Fetch Technical Industrial (IND) students directly by school_id & classLevel
      let studentQuery = supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('classLevel', currentClassLevel.trim());

      // Filter by trade/specialty if selected
      if (currentTrade && currentTrade !== 'ALL') {
        studentQuery = studentQuery.eq('trades_series', currentTrade);
      }

      const { data: students, error: studErr } = await studentQuery.order('fullName', { ascending: true });
      if (studErr) throw studErr;

      // 3. Fetch marks
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

        if (markErr) console.warn('Notice loading industrial marks:', markErr.message);
        marksData = marks || [];
      }

      // Map marks to student objects
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
      try { localStorage.setItem(getCacheKey('students'), JSON.stringify(structuredStudents)); } catch (e) {}
    } catch (err) {
      console.error('Error loading Technical Industrial Mark Sheet:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSchool, currentClassLevel, currentTerm, currentTrade, academicYear, getCacheKey]);

  useEffect(() => {
    loadIndustrialData();
  }, [loadIndustrialData]);

  // Handle live mark input & instant save to Supabase
  const handleMarkChange = async (student, subjectName, seqColumn, rawVal) => {
    const schoolId = activeSchool?.id || activeSchool?.school_id;
    if (!schoolId) return;

    const parsedVal = rawVal === '' ? null : Math.min(20, Math.max(0, parseFloat(rawVal) || 0));

    // Update local UI state instantaneously
    setStudentsData((prev) => {
      const updated = prev.map((s) => {
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
      try { localStorage.setItem(getCacheKey('students'), JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    // Persist sequence mark row into Supabase marks table
    try {
      await supabase.from('marks').upsert(
        {
          school_id: schoolId,
          student_id: student.id,
          subject_name: subjectName,
          term: currentTerm,
          academic_year: academicYear,
          [seqColumn]: parsedVal
        },
        {
          onConflict: 'school_id,student_id,subject_name,term,academic_year'
        }
      );
    } catch (err) {
      console.error('Error persisting industrial mark:', err);
    }
  };

  const filteredStudents = studentsData.filter((st) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return st.fullName.toLowerCase().includes(q) || st.uniqueCode.toLowerCase().includes(q);
  });

  // Calculate dynamic subject stats and overall class average
  const computeClassStats = () => {
    if (!filteredStudents.length || !subjectsList.length) return { subjectStats: {}, classAvg: '-' };

    const { seqA, seqB } = getSequenceFields(currentTerm);
    const subjectStats = {};
    let totalStudentAveragesSum = 0;
    let studentsWithAvgCount = 0;

    // 1. Compute stats per subject
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

    // 2. Compute general class average across all students
    filteredStudents.forEach((st) => {
      let studentWeightedSum = 0;
      let studentCoefSum = 0;

      subjectsList.forEach((sub) => {
        const sName = sub.subject_name || sub.subject_code;
        const coef = parseFloat(sub.coefficient || 1);
        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
        const avg = calculateProRataSubjectMark(mRecord, seqA, seqB);

        if (avg !== null) {
          studentWeightedSum += avg * coef;
          studentCoefSum += coef;
        }
      });

      if (studentCoefSum > 0) {
        totalStudentAveragesSum += studentWeightedSum / studentCoefSum;
        studentsWithAvgCount += 1;
      }
    });

    const classAvg = studentsWithAvgCount > 0 
      ? (totalStudentAveragesSum / studentsWithAvgCount).toFixed(2) 
      : '-';

    return { subjectStats, classAvg };
  };

  // Calculate per-student metrics and specific status categories
  const studentsWithMetrics = (() => {
    const { seqA, seqB } = getSequenceFields(currentTerm);

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

    // Dynamic class ranking
    const sorted = [...calculated]
      .filter((s) => s.studentAvg !== null)
      .sort((a, b) => b.studentAvg - a.studentAvg);

    return calculated.map((st) => {
      if (st.studentAvg === null) return { ...st, rank: '-' };
      const rankIndex = sorted.findIndex((s) => s.id === st.id) + 1;
      return { ...st, rank: `${rankIndex}${getOrdinalSuffix(rankIndex)}` };
    });
  })();

  function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  const { subjectStats, classAvg } = computeClassStats();
  const { seqA, seqB } = getSequenceFields(currentTerm);

  // Excel Export Handler with Full Unclipped Subject Names
  // HTML-based Excel Exporter matching UI structure (2-level headers & summary rows)
  const downloadExcelSheet = () => {
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
              <th rowspan="2">Trade/Specialty</th>
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
        tableHtml += `<td>${st.trades_series || 'FOUNDATIONAL'}</td>`;

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
      tableHtml += `<td colspan="4" style="text-align: right;">Subject Average</td>`;

      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code;
        const stats = subjectStats[sName];
        const avgDisplay = stats && stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '-';
        tableHtml += `<td colspan="2" style="text-align: center;">${avgDisplay}</td>`;
      });

      tableHtml += `<td colspan="4"></td></tr>`;

      // Row 2: % Passed (>= 10/20)
      tableHtml += `<tr style="background-color: #0F172A; color: #10B981; font-weight: bold;">`;
      tableHtml += `<td colspan="4" style="text-align: right;">% Passed (&ge;10/20)</td>`;

      subjectsList.forEach(sub => {
        const sName = sub.subject_name || sub.subject_code;
        const stats = subjectStats[sName];
        const passPctDisplay = stats && stats.count > 0 ? `${((stats.passed / stats.count) * 100).toFixed(0)}%` : '-';
        tableHtml += `<td colspan="2" style="text-align: center;">${passPctDisplay}</td>`;
      });

      tableHtml += `<td colspan="4"></td></tr>`;

      // 4. Overall Class Average Footer Row
      const overallClassAvgDisplay = validStudentCount > 0 ? (classTotalAvg / validStudentCount).toFixed(2) : '-';
      const totalColumns = 4 + (subjectsList.length * 2) + 4;

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
      const fileName = `IndustrialMarkSheet_${(currentClassLevel || 'Class').replace(/[^a-zA-Z0-9]/g, '_')}_${(currentTerm || 'Term').replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.xls`;

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

  // Compute Top Student per Subject
  const subjectChampions = useMemo(() => {
    const champions = {};
    subjectsList.forEach((sub) => {
      const sName = sub.subject_name || sub.subject_code;
      let highestScore = -1;
      let topStudent = null;

      studentsWithMetrics.forEach((st) => {
        const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};
        const score = calculateProRataSubjectMark(mRecord, seqA, seqB);
        if (score !== null && score > highestScore) {
          highestScore = score;
          topStudent = { name: st.fullName, score: score.toFixed(2) };
        }
      });

      if (topStudent) {
        champions[sName] = topStudent;
      }
    });
    return champions;
  }, [subjectsList, studentsWithMetrics, seqA, seqB]);

  // Compute 2 Lowest Performing Students in Class
  const lowestPerformers = useMemo(() => {
    return [...studentsWithMetrics]
      .filter((st) => st.totalCoef > 0 && st.status !== 'Pending' && st.studentAvg !== null)
      .sort((a, b) => a.studentAvg - b.studentAvg)
      .slice(0, 2);
  }, [studentsWithMetrics]);

  // Compute Overall Annual Champion across all 3 Terms
  const annualAnalytics = useMemo(() => {
    if (currentTerm !== 'Term 3') return null;

    const overallChampion = [...studentsWithMetrics]
      .filter((st) => st.totalCoef > 0 && st.status !== 'Pending' && st.studentAvg !== null)
      .sort((a, b) => b.studentAvg - a.studentAvg)[0] || null;

    return { overallChampion };
  }, [currentTerm, studentsWithMetrics]);

  return (
    <div className="p-6 bg-[#0F172A] rounded-xl border border-gray-800 text-white space-y-4">
      {/* Header & Single-Source Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#10B981]">Technical Industrial Master Mark Sheet</h2>
          <p className="text-xs text-gray-400">
            Class: <span className="text-white font-medium">{currentClassLevel}</span> | Term: <span className="text-white font-medium">{currentTerm}</span> | Class Avg: <span className="text-[#10B981] font-bold">{classAvg}/20</span>
          </p>
        </div>

        {/* Dynamic Academic Year Display */}
        <div className="px-4 py-2 border-2 border-[#10B981] rounded-lg bg-emerald-950/30 text-[#10B981] font-semibold text-xs tracking-wide">
          Academic Year: {academicYear}
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={currentTerm}
            onChange={(e) => setCurrentTerm(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-xs text-white focus:border-[#10B981]"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>

          <select
            value={currentClassLevel}
            onChange={(e) => setCurrentClassLevel(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-xs text-white focus:border-[#10B981]"
          >
            {TECHNICAL_INDUSTRIAL_CATALOG.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <select
            value={currentTrade}
            onChange={(e) => setCurrentTrade(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-xs text-white focus:border-[#10B981]"
          >
            <option value="ALL">All Industrial Trades</option>
            {INDUSTRIAL_TRADE_SERIES.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-xs text-white focus:outline-none focus:border-[#10B981]"
          />

          <button
            onClick={downloadExcelSheet}
            className="px-3 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-md transition-colors"
          >
            📊 Download Excel
          </button>
        </div>
      </div>

      {/* Marks Table */}
      {isLoading ? (
        <p className="text-gray-400 text-sm py-4">Loading Technical Industrial mark sheet records...</p>
      ) : (
        <div className="overflow-x-auto max-h-[600px] border border-gray-800 rounded-lg relative">
          <table className="w-full text-left border-collapse text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 bg-[#1E293B] text-[#10B981] z-30">
              <tr>
                {/* Fixed Column 1: N° */}
                <th className="p-2.5 border border-gray-700 min-w-[45px] text-center sticky left-0 z-40 bg-[#1E293B]">
                  N°
                </th>
                {/* Fixed Column 2: Student Name */}
                <th className="p-2.5 border border-gray-700 min-w-[200px] sticky left-[45px] z-40 bg-[#1E293B] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  Student Name
                </th>
                <th className="p-2.5 border border-gray-700 min-w-[100px]">Matricule</th>
                <th className="p-2.5 border border-gray-700 min-w-[110px]">Trade/Specialty</th>
                {subjectsList.map((sub, subIdx) => (
                  <th key={sub.id || sub.subject_name || `sub_th_${subIdx}`} className="p-2 border border-gray-700 text-center min-w-[120px]">
                    <div>{sub.subject_name || sub.subject_code}</div>
                    <div className="text-[10px] text-gray-400">Coeff: {sub.coefficient || 1}</div>
                  </th>
                ))}
                {/* Summary Metric Columns */}
                <th className="p-2 border border-gray-700 text-center min-w-[90px] bg-[#1E293B] text-amber-400">
                  Total Coeff
                </th>
                <th className="p-2 border border-gray-700 text-center min-w-[90px] bg-[#1E293B] text-emerald-400">
                  Student Avg
                </th>
                <th className="p-2 border border-gray-700 text-center min-w-[80px] bg-[#1E293B] text-purple-400">
                  Rank
                </th>
                <th className="p-2 border border-gray-700 text-center min-w-[100px] bg-[#1E293B] text-sky-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4 + subjectsList.length + 4} className="p-6 text-center text-gray-400">
                    No Technical Industrial student records found for {currentClassLevel}.
                  </td>
                </tr>
              ) : (
                studentsWithMetrics.map((st, idx) => (
                  <tr key={st.id || `st_row_${idx}`} className="border-b border-gray-800 hover:bg-gray-800/50 group">
                    {/* Sticky N° Column */}
                    <td className="p-2 border border-gray-800 text-center text-gray-400 sticky left-0 z-20 bg-[#0F172A] group-hover:bg-[#1E293B]">
                      {idx + 1}
                    </td>
                    {/* Sticky Student Name Column */}
                    <td className="p-2 border border-gray-800 font-medium text-white sticky left-[45px] z-20 bg-[#0F172A] group-hover:bg-[#1E293B] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      {st.fullName}
                    </td>
                    <td className="p-2 border border-gray-800 text-gray-400">{st.uniqueCode}</td>
                    <td className="p-2 border border-gray-800 text-emerald-400 font-semibold">{st.trades_series || 'FOUNDATIONAL'}</td>

                    {subjectsList.map((sub, subIdx) => {
                      const sName = sub.subject_name || sub.subject_code;
                      const mRecord = st.marks?.find((m) => m.subject_name === sName) || {};

                      return (
                        <td key={sub.id ? `${sub.id}_${subIdx}` : `${sName}_${subIdx}`} className="p-1 border border-gray-800 text-center">
                          <div className="flex space-x-1 justify-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              placeholder={currentTerm === 'Term 1' ? 'S1' : currentTerm === 'Term 2' ? 'S3' : 'S5'}
                              value={mRecord[seqA] ?? ''}
                              onChange={(e) => handleMarkChange(st, sName, seqA, e.target.value)}
                              className="w-11 p-1 bg-gray-900 border border-gray-700 rounded text-center text-white focus:border-[#10B981] focus:outline-none"
                            />
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              placeholder={currentTerm === 'Term 1' ? 'S2' : currentTerm === 'Term 2' ? 'S4' : 'S6'}
                              value={mRecord[seqB] ?? ''}
                              onChange={(e) => handleMarkChange(st, sName, seqB, e.target.value)}
                              className="w-11 p-1 bg-gray-900 border border-gray-700 rounded text-center text-white focus:border-[#10B981] focus:outline-none"
                            />
                          </div>
                        </td>
                      );
                    })}
                    {/* Summary Metric Cells */}
                    <td className="p-2 border border-gray-700 text-center font-medium text-amber-400 bg-gray-900/40">
                      {st.totalCoef}
                    </td>
                    <td className="p-2 border border-gray-700 text-center font-bold text-emerald-400 bg-gray-900/40">
                      {st.formattedAvg}
                    </td>
                    <td className="p-2 border border-gray-700 text-center font-medium text-purple-300 bg-gray-900/40">
                      {st.rank}
                    </td>
                    <td className="p-2 border border-gray-700 text-center bg-gray-900/40">
                      {st.status === 'Passed' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-600/50">
                          Passed
                        </span>
                      )}
                      {st.status === 'Failed' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-950/80 text-red-400 border border-red-600/50">
                          Failed
                        </span>
                      )}
                      {st.status === 'Pending' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-600/50">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#1E293B] font-semibold text-[#10B981] border-t-2 border-[#10B981]">
              {/* Subject Average Row */}
              <tr>
                <td colSpan={2} className="p-2 border border-gray-700 text-right text-gray-300 sticky left-0 z-20 bg-[#1E293B] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  Subject Average
                </td>
                <td colSpan={2} className="p-2 border border-gray-700 bg-[#1E293B]"></td>
                {subjectsList.map((sub, subIdx) => {
                  const sName = sub.subject_name || sub.subject_code;
                  return (
                    <td key={sub.id ? `foot_avg_${sub.id}_${subIdx}` : `foot_avg_${sName}_${subIdx}`} className="p-2 border border-gray-700 text-center">
                      {subjectStats[sName]?.avg || '-'}
                    </td>
                  );
                })}
                <td colSpan={4} className="p-2 border border-gray-700 bg-gray-900/50"></td>
              </tr>

              {/* % Passed Row */}
              <tr>
                <td colSpan={2} className="p-2 border border-gray-700 text-right text-gray-300 sticky left-0 z-20 bg-[#1E293B] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  % Passed (&ge;10/20)
                </td>
                <td colSpan={2} className="p-2 border border-gray-700 bg-[#1E293B]"></td>
                {subjectsList.map((sub, subIdx) => {
                  const sName = sub.subject_name || sub.subject_code;
                  return (
                    <td key={sub.id ? `foot_pass_${sub.id}_${subIdx}` : `foot_pass_${sName}_${subIdx}`} className="p-2 border border-gray-700 text-center text-blue-400">
                      {subjectStats[sName]?.passPct || '-'}
                    </td>
                  );
                })}
                <td colSpan={4} className="p-2 border border-gray-700 bg-gray-900/50"></td>
              </tr>

              {/* Overall Class Average Row */}
              <tr className="text-white bg-slate-800/80">
                <td colSpan={4 + subjectsList.length + 4} className="p-2 border border-gray-700 text-center text-sm font-bold text-[#10B981]">
                  Overall Class Average: {classAvg} / 20
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Dedicated Class Analytics & Risk Warnings Container */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Subject Champions Grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-[#10B981] flex items-center gap-2">
              🏆 Term Subject Champions
            </h3>
            <span className="text-xs text-slate-400">Best Mark per Subject</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {subjectsList.map((sub, subIdx) => {
              const sName = sub.subject_name || sub.subject_code;
              const champ = subjectChampions[sName];
              return (
                <div key={sub.id ? `champ_${sub.id}_${subIdx}` : `champ_${sName}_${subIdx}`} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
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
              ⚠️ Academic Risk Warnings
            </h3>
            <span className="text-xs text-amber-500/80 font-medium">Lowest 2 Averages</span>
          </div>

          {lowestPerformers.length > 0 ? (
            <div className="space-y-3">
              {lowestPerformers.map((st, i) => (
                <div key={st.id || `risk_${i}`} className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{st.fullName || st.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Rank: <span className="text-amber-300 font-semibold">{st.rank}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-400">{st.formattedAvg} / 20</span>
                    <span className="block text-[10px] text-red-500 font-semibold uppercase tracking-wider">Intervene</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No low-performing data available yet.</p>
          )}
        </div>

        {/* Term 3 Annual Summary & Sequential Progression View */}
        {currentTerm === 'Term 3' && (
          <div className="lg:col-span-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/50 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                  🎓 Annual Class Distinction & Progression (End of Year)
                </h3>
                <p className="text-xs text-slate-400">
                  Overall performance & sequential trend across Sequence 1 to Sequence 6
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-full">
                Annual View
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Overall Annual Class Champion Card */}
              <div className="bg-slate-900/80 border border-indigo-500/30 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    Overall Annual Champion
                  </span>
                  <p className="text-lg font-extrabold text-white mt-2">
                    {annualAnalytics?.overallChampion?.fullName || annualAnalytics?.overallChampion?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Rank 1 • Full Year Cumulative</p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Annual Average:</span>
                  <span className="text-2xl font-black text-[#10B981]">
                    {annualAnalytics?.overallChampion?.formattedAvg || '0.00'}/20
                  </span>
                </div>
              </div>

              {/* 2. Sequential Progression Chart (Seq 1 - Seq 6) */}
              <div className="md:col-span-2 bg-slate-900/80 border border-indigo-500/30 rounded-lg p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    Sequential Average Trajectory (Seq 1 - Seq 6)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">--- Passing Target: 10/20</span>
                </div>

                {/* Sequence Graph Visualization */}
                <div className="h-28 w-full flex items-end justify-between gap-2 pt-3 px-2 relative">
                  {/* 10/20 Target Passing Line */}
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-emerald-500/30 z-0"></div>

                  {['seq1_mark', 'seq2_mark', 'seq3_mark', 'seq4_mark', 'seq5_mark', 'seq6_mark'].map((seqKey, idx) => {
                    const label = `Seq ${idx + 1}`;
                    const totalSeqMarks = studentsWithMetrics.reduce((acc, st) => {
                      let sum = 0;
                      let cnt = 0;
                      (st.marks || []).forEach((m) => {
                        const val = parseFloat(m[seqKey]);
                        if (!isNaN(val)) {
                          sum += val;
                          cnt += 1;
                        }
                      });
                      return cnt > 0 ? acc + (sum / cnt) : acc;
                    }, 0);

                    const countSeqMarks = studentsWithMetrics.filter((st) =>
                      (st.marks || []).some((m) => !isNaN(parseFloat(m[seqKey])))
                    ).length;

                    const seqAvg = countSeqMarks > 0 ? totalSeqMarks / countSeqMarks : 0;
                    const displayAvg = seqAvg > 0 ? seqAvg.toFixed(1) : '-';
                    const heightPercent = seqAvg > 0 ? Math.min((seqAvg / 20) * 100, 100) : 0;

                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1 z-10 h-full justify-end">
                        <span className="text-[10px] font-bold text-[#10B981]">{displayAvg}</span>
                        <div className="w-full bg-slate-800/80 rounded-t h-16 flex items-end">
                          <div
                            style={{ height: heightPercent + '%' }}
                            className={
                              'w-full rounded-t transition-all duration-500 ' +
                              (seqAvg >= 10 ? 'bg-[#10B981]' : 'bg-amber-500')
                            }
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}