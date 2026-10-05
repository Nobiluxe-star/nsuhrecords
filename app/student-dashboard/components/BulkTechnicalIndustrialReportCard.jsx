'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { TECHNICAL_INDUSTRIAL_CATALOG, INDUSTRIAL_TRADE_SERIES } from '../../admin-dashboard/page';

function getOrdinalSuffix(i) {
  if (!i || isNaN(i)) return '—';
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
}

function getOrdinalTermWord(termNumber) {
  switch (Number(termNumber)) {
    case 1: return 'First Term';
    case 2: return 'Second Term';
    case 3: return 'Third Term';
    default: return `${termNumber}th Term`;
  }
}

function calculateIndustrialGrade(score) {
  if (score === undefined || score === null || isNaN(Number(score))) return '—';
  const val = Number(score);
  if (val >= 16) return 'A';
  if (val >= 14) return 'B';
  if (val >= 12) return 'C';
  if (val >= 10) return 'D';
  return 'F';
}

function normalizeClass(cls) {
  if (!cls) return '';
  return cls.toLowerCase().replace(/\(.*?\)/g, '').trim();
}

export default function BulkTechnicalIndustrialReportCard({
  isOpen,
  onClose,
  activeClass = 'First Year Industrial (Y1Ind)',
  activeTrade = 'ALL',
  activeTerm = 'Term 1',
  schoolInfo = {},
  onTrackChange = () => {}
}) {
  const [selectedClass, setSelectedClass] = useState(activeClass || 'First Year Industrial (Y1Ind)');
  const [selectedTrade, setSelectedTrade] = useState(activeTrade || 'ALL');
  const [selectedTerm, setSelectedTerm] = useState(activeTerm || 'Term 1');
  const [selectedTrack, setSelectedTrack] = useState('industrial');
  const [viewMode, setViewMode] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [studentsList, setStudentsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [processedDataMap, setProcessedDataMap] = useState({});
  const [schoolData, setSchoolData] = useState({});
  const [classAverage, setClassAverage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const effectiveSchoolId = useMemo(() => {
    return (
      schoolInfo?.school_id ||
      schoolInfo?.id ||
      schoolInfo?.active_school_id ||
      (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : '') ||
      ''
    );
  }, [schoolInfo]);

  useEffect(() => {
    if (isOpen) {
      if (activeClass) setSelectedClass(activeClass);
      if (activeTrade) setSelectedTrade(activeTrade);
      if (activeTerm) setSelectedTerm(activeTerm);
      setCurrentIndex(0);
    }
  }, [isOpen, activeClass, activeTrade, activeTerm]);

  const availableTrades = useMemo(() => {
    return ['ALL', ...(INDUSTRIAL_TRADE_SERIES || [])];
  }, []);

  // ==============================================================================
  // HIGH-SPEED TRADE-PRIORITIZED MASTER FETCH & CALCULATION ENGINE
  // ==============================================================================
  const fetchAndCalculateBulkData = useCallback(async () => {
    if (!isOpen || !effectiveSchoolId || !selectedClass) return;

    const cacheKey = `bi_cache_${effectiveSchoolId}_${normalizeClass(selectedClass)}_${selectedTrade}_${selectedTerm}`;

    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setSchoolData(parsed.schoolData || {});
          setStudentsList(parsed.studentsList || []);
          setSubjectsList(parsed.subjectsList || []);
          setProcessedDataMap(parsed.processedDataMap || {});
          setClassAverage(parsed.classAverage || null);
          setIsLoading(false);
        } catch (e) {
          console.warn('Cache parsing error:', e);
        }
      } else {
        setIsLoading(true);
      }
    }

    try {
      if (effectiveSchoolId) {
        await supabase.rpc('set_active_school', { school_id: effectiveSchoolId });
      }

      let studentQuery = supabase
        .from('students')
        .select('*')
        .eq('school_id', effectiveSchoolId);

      let schoolQuery = supabase
        .from('school_details')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .maybeSingle();

      let coeffQuery = supabase
        .from('class_coefficients')
        .select('*')
        .eq('school_id', effectiveSchoolId);

      let teacherQuery = supabase
        .from('teachers')
        .select('*')
        .eq('school_id', effectiveSchoolId);

      const [schoolRes, allStudentsRes, coeffRes, teachersRes] = await Promise.all([
        schoolQuery,
        studentQuery.order('fullName', { ascending: true }),
        coeffQuery,
        teacherQuery
      ]);

      const fetchedSchoolData = schoolRes.data || {};
      setSchoolData(fetchedSchoolData);

      const targetClassClean = selectedClass.trim().toLowerCase();
      let filteredStudents = (allStudentsRes.data || []).filter((s) => {
        const sClass = (s.classLevel || s.class_grade || s.class_level || s.class_name || s.class || '').trim().toLowerCase();
        return sClass === targetClassClean;
      });

      if (selectedTrade && selectedTrade !== 'ALL' && selectedTrade !== 'N/A') {
        filteredStudents = filteredStudents.filter((s) => {
          const sTrade = (s.trades_series || s.series || s.trade || s.specialty || '').trim().toLowerCase();
          return sTrade === selectedTrade.trim().toLowerCase();
        });
      }

      setStudentsList(filteredStudents);

      if (filteredStudents.length === 0) {
        setSubjectsList([]);
        setProcessedDataMap({});
        setIsLoading(false);
        return;
      }

      const studentIds = filteredStudents.map((s) => s.id).filter(Boolean);

      let loadedSubjects = [];
      const teachersData = teachersRes.data || [];
      const allCoeffRows = coeffRes.data || [];

      const matchedCoeffRow = allCoeffRows.find(row => {
        const rClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
        const rTrade = (row.trades_series || row.series || row.trade || row.specialty || '').trim().toLowerCase();
        
        const isClassMatch = rClass === targetClassClean;
        const isTradeMatch = selectedTrade === 'ALL' || !rTrade || rTrade === selectedTrade.trim().toLowerCase();

        return isClassMatch && isTradeMatch;
      }) || allCoeffRows.find(row => {
        const rClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
        return rClass === targetClassClean;
      });

      // STRICT CLASS & TRADE SCOPED TEACHER RESOLVER
      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return '—';

        const cleanSub = subjectName.toLowerCase().trim();
        const cleanClass = selectedClass.toLowerCase().trim();
        const cleanTrade = selectedTrade && selectedTrade !== 'ALL' ? selectedTrade.toLowerCase().trim() : null;

        const matchedTeacher = teachersData.find((t) => {
          const assignments = t.assignments || t.class_assignments || t.assigned_classes || [];

          // Case 1: Array of Structured Assignment Objects
          if (Array.isArray(assignments) && assignments.length > 0) {
            return assignments.some((item) => {
              const itemSub = String(item.subject || item.subject_name || '').toLowerCase().trim();
              const itemClass = String(item.class || item.class_level || item.classLevel || '').toLowerCase().trim();
              const itemTrade = String(item.trade || item.trades_series || item.specialty || '').toLowerCase().trim();

              const subMatch = itemSub === cleanSub;
              const classMatch = !itemClass || itemClass === cleanClass;
              const tradeMatch = !cleanTrade || !itemTrade || itemTrade === cleanTrade;

              return subMatch && classMatch && tradeMatch;
            });
          }

          // Case 2: Separate Array Properties
          const teacherSubjects = Array.isArray(t.subjects)
            ? t.subjects.map((s) => String(s).toLowerCase().trim())
            : typeof t.subjects === 'string'
            ? [t.subjects.toLowerCase().trim()]
            : [];

          const teacherClasses = Array.isArray(t.classes || t.class_levels || t.assigned_class_levels)
            ? (t.classes || t.class_levels || t.assigned_class_levels).map((c) => String(c).toLowerCase().trim())
            : [];

          const teacherTrades = Array.isArray(t.trades || t.trades_series)
            ? (t.trades || t.trades_series).map((tr) => String(tr).toLowerCase().trim())
            : [];

          const subMatch = teacherSubjects.includes(cleanSub);
          const classMatch = teacherClasses.length === 0 || teacherClasses.includes(cleanClass);
          const tradeMatch = !cleanTrade || teacherTrades.length === 0 || teacherTrades.includes(cleanTrade);

          return subMatch && classMatch && tradeMatch;
        });

        return matchedTeacher ? (matchedTeacher.name || matchedTeacher.fullName || matchedTeacher.full_name || '—') : '—';
      };

      if (matchedCoeffRow) {
        let rawSubs = matchedCoeffRow.subject_coefficients;
        if (typeof rawSubs === 'string') {
          try { rawSubs = JSON.parse(rawSubs); } catch (e) { rawSubs = null; }
        }

        if (Array.isArray(rawSubs) && rawSubs.length > 0) {
          rawSubs.forEach((item, idx) => {
            const sName = item.name || item.subject_name || item.subject_code || `Subject ${idx + 1}`;
            const coefVal = Number(item.coefficient || item.coeff || item.coef || item.weight || 1);
            const categoryVal = item.category || item.group || 'Industrial Practical & Theory';
            const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

            loadedSubjects.push({
              id: item.id || `sub_${idx}`,
              subject_name: sName,
              category: categoryVal,
              coefficient: coefVal,
              resolved_instructor: instructorName
            });
          });
        }
      }
      setSubjectsList(loadedSubjects);

      const termNumeric = selectedTerm.replace(/[^0-9]/g, '') || '1';
      const termString = `Term ${termNumeric}`;

      let marksQuery = supabase
        .from('marks')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .in('student_id', studentIds);

      let feesQuery = supabase
        .from('bursar_fees')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .in('student_id', studentIds);

      let discQuery = supabase
        .from('discipline_summaries')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .in('student_id', studentIds);

      let remQuery = supabase
        .from('principal_remarks')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .in('student_id', studentIds);

      const [marksRes, feesRes, discRes, remRes] = await Promise.all([
        marksQuery,
        feesQuery,
        discQuery,
        remQuery
      ]);

      const classMarksList = (marksRes.data || []).filter((m) => {
        const mTerm = String(m.term || '').trim().toLowerCase();
        return mTerm === termString.toLowerCase() || mTerm === String(termNumeric);
      });

      const studentAverages = [];
      const studentMap = {};

      filteredStudents.forEach((st) => {
        const sId = st.id;
        const sCode = st.unique_code || st.code || st.student_id;

        const stMarks = classMarksList.filter(
          (m) =>
            (sId && String(m.student_id) === String(sId)) ||
            (sCode && (m.unique_code === sCode || m.code === sCode))
        );

        const scoreMap = {};
        let totalPts = 0;
        let totalCoef = 0;
        let hasMarks = false;

        loadedSubjects.forEach((sub) => {
          const subKey = sub.subject_name.toLowerCase().trim();
          const match = stMarks.find(
            (m) => (m.subject_name || m.subject_code || '').toLowerCase().trim() === subKey
          );
          const scoreVal = match ? Number(match.term_score ?? match.score ?? match.mark ?? match.marks) : NaN;

          if (!isNaN(scoreVal)) {
            hasMarks = true;
            scoreMap[subKey] = scoreVal;
            totalPts += scoreVal * sub.coefficient;
            totalCoef += sub.coefficient;
          }
        });

        const termAvg = hasMarks && totalCoef > 0 ? totalPts / totalCoef : null;

        if (termAvg !== null) {
          studentAverages.push({ studentId: sId, avg: termAvg });
        }

        const feeRec = (feesRes.data || []).find((f) => String(f.student_id) === String(sId));
        const discRec = (discRes.data || []).find((d) => String(d.student_id) === String(sId));
        const remRec = (remRes.data || []).find((r) => String(r.student_id) === String(sId));

        studentMap[sId] = {
          marksMap: scoreMap,
          totalPoints: totalPts,
          totalCoef: totalCoef,
          termAverage: termAvg !== null ? termAvg.toFixed(2) : null,
          termStatus: termAvg !== null ? (termAvg >= 10 ? 'Passed' : 'Failed') : null,
          feesRecord: feeRec || null,
          disciplineRecord: discRec || null,
          adminRemarks: remRec || null
        };
      });

      let calculatedAvg = null;
      if (studentAverages.length > 0) {
        const totalAvgSum = studentAverages.reduce((sum, item) => sum + item.avg, 0);
        calculatedAvg = (totalAvgSum / studentAverages.length).toFixed(2);
        setClassAverage(calculatedAvg);

        studentAverages.sort((a, b) => b.avg - a.avg);
        studentAverages.forEach((item, index) => {
          if (studentMap[item.studentId]) {
            studentMap[item.studentId].rank = index + 1;
          }
        });
      } else {
        setClassAverage(null);
      }

      loadedSubjects.forEach((sub) => {
        const subKey = sub.subject_name.toLowerCase().trim();
        const subScores = [];

        filteredStudents.forEach((st) => {
          const sVal = studentMap[st.id]?.marksMap[subKey];
          if (sVal !== undefined && !isNaN(sVal)) {
            subScores.push({ studentId: st.id, score: sVal });
          }
        });

        subScores.sort((a, b) => b.score - a.score);
        subScores.forEach((item, idx) => {
          if (!studentMap[item.studentId].subjectRanks) {
            studentMap[item.studentId].subjectRanks = {};
          }
          studentMap[item.studentId].subjectRanks[subKey] = idx + 1;
        });
      });

      setProcessedDataMap(studentMap);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              schoolData: fetchedSchoolData,
              studentsList: filteredStudents,
              subjectsList: loadedSubjects,
              processedDataMap: studentMap,
              classAverage: calculatedAvg
            })
          );
        } catch (err) {
          if (err.name === 'QuotaExceededError' || err.code === 22) {
            console.warn('LocalStorage quota exceeded. Pruning stale report card caches...');
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('bg_cache_') || key.startsWith('bc_cache_') || key.startsWith('bi_cache_')) {
                localStorage.removeItem(key);
              }
            });
            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({
                  schoolData: fetchedSchoolData,
                  studentsList: filteredStudents,
                  subjectsList: loadedSubjects,
                  processedDataMap: studentMap,
                  classAverage: calculatedAvg
                })
              );
            } catch (retryErr) {
              console.warn('Could not cache payload to localStorage:', retryErr);
            }
          }
        }
      }

    } catch (err) {
      console.error('Error in Bulk Industrial Fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, effectiveSchoolId, selectedClass, selectedTrade, selectedTerm]);

  useEffect(() => {
    fetchAndCalculateBulkData();
  }, [fetchAndCalculateBulkData]);

  // ==============================================================================
  // DIRECT VECTOR PDF ENGINE WITH LOGO & BASE64 EMBEDDING
  // ==============================================================================
  const handleDownloadPDF = async () => {
    if (studentsList.length === 0) return;

    try {
      setIsDownloading(true);
      setStatusMessage('Exporting Vector PDF...');

      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const schoolTitle = (schoolData.name || schoolData.institution_name || schoolInfo?.name || 'COLLEGE NAME').toUpperCase();
      const regionText = schoolData.region ? `REGIONAL DELEGATION FOR SECONDARY EDUCATION FOR THE ${schoolData.region.toUpperCase()}` : 'REGIONAL DELEGATION FOR SECONDARY EDUCATION';
      const mottoText = schoolData.motto || schoolInfo?.motto ? `Motto: "${schoolData.motto || schoolInfo?.motto}"` : '';
      
      const logoUrl = schoolData.logo_url || schoolData.logo || schoolData.school_logo || schoolData.badge_url || schoolInfo?.logo_url || null;

      studentsList.forEach((student, index) => {
        if (index > 0) pdf.addPage('a4', 'portrait');

        const sId = student.id;
        const stData = processedDataMap[sId] || {};
        const marksMap = stData.marksMap || {};
        const subjectRanks = stData.subjectRanks || {};

        const sName = student.fullName || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
        const sMatricule = student.unique_code || student.code || student.student_id || student.matricule || '—';
        const sTrade = student.trades_series || student.series || student.trade || student.specialty || selectedTrade;

        const paidAmount = Number(stData.feesRecord?.fees_paid || stData.feesRecord?.amount_paid || 0);
        const balanceAmount = Number(stData.feesRecord?.fee_balance || stData.feesRecord?.balance || 0);
        const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
        const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

        // Header Box
        pdf.setDrawColor(254, 215, 170);
        pdf.setFillColor(255, 247, 237);
        pdf.roundedRect(10, 8, 190, 26, 3, 3, 'FD');

        if (logoUrl) {
          try {
            const format = logoUrl.includes('png') ? 'PNG' : 'JPEG';
            pdf.addImage(logoUrl, format, 13, 10, 20, 22);
          } catch (imgErr) {
            console.warn('Could not embed logo image into PDF:', imgErr);
          }
        }

        const textCenterX = logoUrl ? 112 : 105;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(67, 20, 7);
        pdf.text(schoolTitle, textCenterX, 14, { align: 'center' });

        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(194, 65, 12);
        pdf.text(`Academic Year: ${schoolData.academic_year || '2026/2027'}`, textCenterX, 18.5, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(67, 20, 7);
        pdf.text(regionText, textCenterX, 22.5, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(124, 45, 18);
        pdf.text(`Phone: ${schoolData.contact_line || schoolData.phone || schoolInfo?.phone || '—'}  |  Email: ${schoolData.official_email || schoolData.email || schoolInfo?.email || '—'}  |  Location: ${schoolData.address_location || schoolInfo?.address || '—'}`, textCenterX, 28, { align: 'center' });

        if (mottoText) {
          pdf.setFillColor(255, 237, 213);
          pdf.roundedRect(10, 36, 190, 6, 2, 2, 'F');
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(8.5);
          pdf.setTextColor(67, 20, 7);
          pdf.text(mottoText, 105, 40, { align: 'center' });
        }

        // Report Card Title
        const titleY = mottoText ? 44 : 36;
        pdf.setFillColor(255, 237, 213);
        pdf.roundedRect(10, titleY, 190, 7, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(67, 20, 7);
        const termTitle = `TECHNICAL INDUSTRIAL (IND) — ${getOrdinalTermWord(selectedTerm.replace(/[^0-9]/g, '') || 1).toUpperCase()} REPORT CARD`;
        pdf.text(termTitle, 105, titleY + 5, { align: 'center' });

        // Student Details Table
        const studentInfoY = titleY + 9;
        autoTable(pdf, {
          startY: studentInfoY,
          margin: { left: 10, right: 10 },
          body: [
            [
              { content: `Full Name: ${sName}`, styles: { fontStyle: 'bold' } },
              { content: `Class: ${selectedClass}` },
              { content: `Section: Technical Industrial (IND)` },
              { content: `Trade: ${sTrade}` }
            ],
            [
              { content: `Matricule: ${sMatricule}`, styles: { textColor: [67, 20, 7], fontStyle: 'bold' } },
              { content: `Enrolment: ${studentsList.length} Students` },
              { content: `Fees Paid: ${displayPaid}`, styles: { textColor: [4, 120, 87], fontStyle: 'bold' } },
              { content: `Fee Balance: ${displayBalance}`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }
            ]
          ],
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2 },
          tableLineColor: [254, 215, 170],
          tableLineWidth: 0.2
        });

        // Marks Table
        const tableData = subjectsList.map((sub) => {
          const subKey = sub.subject_name.toLowerCase().trim();
          const score = marksMap[subKey];
          const coef = Number(sub.coefficient || 1);

          const isScoreValid = score !== undefined && score !== null && !isNaN(score);
          const totalScoreVal = isScoreValid ? (score * coef).toFixed(1) : '—';
          const maxPossible = coef * 20;

          const calculatedGrade = isScoreValid ? calculateIndustrialGrade(score) : '—';
          const rawRank = subjectRanks[subKey];

          return [
            sub.subject_name,
            sub.category || 'Industrial Practical & Theory',
            coef,
            isScoreValid ? score : '—',
            isScoreValid ? `${totalScoreVal} / ${maxPossible}` : '—',
            calculatedGrade,
            rawRank ? getOrdinalSuffix(rawRank) : '—',
            sub.resolved_instructor || '—'
          ];
        });

        autoTable(pdf, {
          startY: pdf.lastAutoTable.finalY + 2,
          margin: { left: 10, right: 10 },
          head: [['Subject Name', 'Category', 'Coef', 'Score (/20)', 'Total Marks', 'Grade', 'Rank', 'Instructor']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [67, 20, 7], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { halign: 'left' },
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontStyle: 'bold' },
            6: { halign: 'center', textColor: [124, 45, 18] },
            7: { halign: 'left' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
              const rawScore = data.row.cells[3].raw;
              if (typeof rawScore === 'number') {
                if (rawScore >= 10) {
                  data.cell.styles.textColor = [29, 78, 216];
                } else {
                  data.cell.styles.textColor = [220, 38, 38];
                }
              }
            }
          }
        });

        // Summary Bar
        const summaryY = pdf.lastAutoTable.finalY + 3;
        pdf.setFillColor(67, 20, 7);
        pdf.roundedRect(10, summaryY, 190, 9, 2, 2, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(254, 215, 170);

        pdf.text('TOTAL POINTS', 25, summaryY + 2.8, { align: 'center' });
        pdf.text('STUDENT AVERAGE', 63, summaryY + 2.8, { align: 'center' });
        pdf.text('CLASS RANK', 101, summaryY + 2.8, { align: 'center' });
        pdf.text('CLASS AVG', 139, summaryY + 2.8, { align: 'center' });
        pdf.text('STATUS', 177, summaryY + 2.8, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(255, 255, 255);

        pdf.text(stData.totalCoef > 0 ? `${stData.totalPoints?.toFixed(1)} / ${stData.totalCoef * 20}` : '—', 25, summaryY + 7.2, { align: 'center' });

        pdf.setTextColor(252, 211, 77);
        pdf.text(stData.termAverage ? `${stData.termAverage} / 20` : '—', 63, summaryY + 7.2, { align: 'center' });

        pdf.setTextColor(255, 255, 255);
        pdf.text(stData.rank ? getOrdinalSuffix(stData.rank) : '—', 101, summaryY + 7.2, { align: 'center' });
        pdf.text(classAverage ? `${classAverage} / 20` : '—', 139, summaryY + 7.2, { align: 'center' });

        if (stData.termStatus === 'Passed') pdf.setTextColor(52, 211, 153);
        else if (stData.termStatus === 'Failed') pdf.setTextColor(248, 113, 113);
        else pdf.setTextColor(226, 232, 240);

        pdf.text(stData.termStatus || '—', 177, summaryY + 7.2, { align: 'center' });

        // Discipline & Remarks Section
        const discY = summaryY + 11;
        autoTable(pdf, {
          startY: discY,
          margin: { left: 10, right: 10 },
          body: [
            [
              {
                content: `DISCIPLINE & CONDUCT\nUnjustified Absences: ${stData.disciplineRecord?.absences ?? 0} hrs\nTardiness: ${stData.disciplineRecord?.latecomings || stData.disciplineRecord?.tardiness || 0} times\nRemark: ${stData.disciplineRecord?.remarks ? `"${stData.disciplineRecord.remarks}"` : ''}\n `,
                styles: { cellWidth: 93 }
              },
              {
                content: `PRINCIPAL REMARKS\n${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text ? `"${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text}"` : ''}\n\n `,
                styles: { cellWidth: 93 }
              }
            ]
          ],
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3 },
          tableLineColor: [254, 215, 170],
          tableLineWidth: 0.2
        });

        // Signatures Block
        const sigY = pdf.lastAutoTable.finalY + 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(67, 20, 7);

        pdf.text('HEAD OF INDUSTRIAL DEPARTMENT', 50, sigY, { align: 'center' });
        pdf.text('THE PRINCIPAL', 160, sigY, { align: 'center' });

        pdf.setLineDashPattern([1, 1], 0);
        pdf.line(25, sigY + 8, 75, sigY + 8);
        pdf.line(135, sigY + 8, 185, sigY + 8);

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('Signature & Stamp', 50, sigY + 12, { align: 'center' });
        pdf.text('Signature & Stamp', 160, sigY + 12, { align: 'center' });
      });

      pdf.save(`${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedTerm}_Industrial_ReportCards.pdf`);
    } catch (err) {
      console.error('Error generating vector PDF:', err);
      alert('Failed to generate PDF file directly.');
    } finally {
      setIsDownloading(false);
      setStatusMessage('');
    }
  };

  if (!isOpen) return null;

  const currentStudent = studentsList[currentIndex] || {};

  const renderSingleCard = (student, index) => {
    const sId = student.id;
    const stData = processedDataMap[sId] || {};
    const marksMap = stData.marksMap || {};
    const subjectRanks = stData.subjectRanks || {};

    const sName = student.fullName || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const sMatricule = student.unique_code || student.code || student.student_id || student.matricule || '—';
    const sTrade = student.trades_series || student.series || student.trade || student.specialty || selectedTrade;

    const paidAmount = Number(stData.feesRecord?.fees_paid || stData.feesRecord?.amount_paid || 0);
    const balanceAmount = Number(stData.feesRecord?.fee_balance || stData.feesRecord?.balance || 0);
    const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
    const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

    const logoSrc = schoolData.logo_url || schoolData.logo || schoolData.school_logo || schoolData.badge_url || schoolData.image_url || schoolInfo?.logo_url || schoolInfo?.logo || null;
    const photoSrc = student.picture || student.photo_url || student.passport_photo || student.image || null;

    return (
      <div
        key={sId || index}
        className="bulk-student-a4-page bg-white text-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl border border-orange-200 max-w-4xl w-full mx-auto space-y-2.5 text-xs print:p-0 print:border-none print:shadow-none print:rounded-none print:space-y-2.5 print:max-w-full print:bg-white mb-6"
      >
        {/* HEADER BRANDING */}
        <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-2.5 flex flex-row items-center gap-3">
          <div className="w-20 h-20 border-2 border-orange-950/20 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-inner">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="School Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`flex-col items-center justify-center text-orange-950 p-1 text-center ${logoSrc ? 'hidden' : 'flex'}`}>
              <svg className="w-8 h-8 text-orange-950 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-tighter">SCHOOL LOGO</span>
            </div>
          </div>

          <div className="flex-1 border border-orange-200 rounded-lg bg-white divide-y divide-orange-200 text-center">
            <div className="p-1">
              <h1 className="text-base sm:text-xl font-black text-orange-950 uppercase tracking-tight">
                {schoolData.name || schoolData.institution_name || schoolInfo?.name || 'COLLEGE NAME'}
              </h1>
              <p className="text-[10px] sm:text-xs font-semibold text-orange-700">
                Academic Year: {schoolData.academic_year || '2026/2027'}
              </p>
            </div>

            <div className="p-0.5 bg-orange-50/50">
              <p className="text-[10px] sm:text-xs font-black text-orange-950 uppercase tracking-tight whitespace-nowrap">
                REGIONAL DELEGATION FOR SECONDARY EDUCATION
                {schoolData.region && ` FOR THE ${schoolData.region.toUpperCase()}`}
              </p>
            </div>

            <div className="p-1 flex justify-center items-center gap-x-4 text-xs sm:text-sm font-bold text-orange-900 flex-wrap whitespace-nowrap">
              <span>Phone: {schoolData.contact_line || schoolData.phone || schoolInfo?.phone || '—'}</span>
              <span>Email: {schoolData.official_email || schoolData.email || schoolInfo?.email || '—'}</span>
              {(schoolData.address_location || schoolInfo?.address) && (
                <span>Location: {schoolData.address_location || schoolInfo?.address}</span>
              )}
            </div>
          </div>
        </div>

        {/* MOTTO BANNER */}
        {(schoolData.motto || schoolInfo?.motto) && (
          <div className="p-1.5 bg-orange-50/50 border border-orange-200 rounded-xl text-center shadow-sm">
            <p className="text-xs sm:text-sm font-serif italic font-extrabold text-orange-950 tracking-wide">
              Motto: "{schoolData.motto || schoolInfo?.motto}"
            </p>
          </div>
        )}

        {/* TERM REPORT HEADER */}
        <div className="p-1 bg-orange-100/60 border border-orange-200 rounded-xl text-center">
          <h2 className="text-xs sm:text-sm font-serif italic font-black text-orange-950 uppercase tracking-wider">
            TECHNICAL INDUSTRIAL (IND) — {getOrdinalTermWord(selectedTerm.replace(/[^0-9]/g, '') || 1).toUpperCase()} REPORT CARD
          </h2>
        </div>

        {/* STUDENT PROFILE & FINANCIAL OVERVIEW */}
        <div className="flex flex-row gap-4 items-center bg-orange-50/20 p-2.5 rounded-xl border border-orange-200 text-[11px]">
          <div className="w-16 h-16 rounded-xl bg-orange-100/50 border border-orange-200 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={sName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`flex-col items-center justify-center text-slate-400 ${photoSrc ? 'hidden' : 'flex'}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span className="text-[7px] font-medium uppercase">No Photo</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-4 gap-2">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Full Name</span>
              <strong className="text-slate-900 block truncate">{sName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Class</span>
              <strong className="text-slate-900 block">{selectedClass}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Section</span>
              <strong className="text-orange-950 block truncate">Technical Industrial (IND)</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Trade / Specialty</span>
              <strong className="text-slate-900 block truncate">{sTrade}</strong>
            </div>

            <div className="border-t border-orange-100 pt-1">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Matricule (Unique ID)</span>
              <strong className="text-orange-900 font-mono block">{sMatricule}</strong>
            </div>
            <div className="border-t border-orange-100 pt-1">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Class Enrolment</span>
              <strong className="text-slate-900 block">{studentsList.length} Students</strong>
            </div>
            <div className="border-t border-orange-100 pt-1 text-right">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Fees Paid</span>
              <strong className="text-emerald-700 block">{displayPaid}</strong>
            </div>
            <div className="border-t border-orange-100 pt-1 text-right">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Fee Balance</span>
              <strong className="text-red-600 font-bold block">{displayBalance}</strong>
            </div>
          </div>
        </div>

        {/* DYNAMIC MARKS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border border-orange-200 rounded-lg overflow-hidden">
            <thead className="bg-orange-950 text-white uppercase text-[9px]">
              <tr>
                <th className="p-1.5">Subject Name</th>
                <th className="p-1.5">Category</th>
                <th className="p-1.5 text-center">Coef</th>
                <th className="p-1.5 text-center">Score (/20)</th>
                <th className="p-1.5 text-center">Total</th>
                <th className="p-1.5 text-center">Grade</th>
                <th className="p-1.5 text-center">Rank</th>
                <th className="p-1.5">Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100 bg-white">
              {subjectsList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-3 text-center text-red-600 font-bold bg-red-50 italic">
                    No configured subjects found for this class in class_coefficients table.
                  </td>
                </tr>
              ) : (
                subjectsList.map((sub, idx) => {
                  const subKey = sub.subject_name.toLowerCase().trim();
                  const score = marksMap[subKey];
                  const coef = Number(sub.coefficient || 1);

                  const isScoreValid = score !== undefined && score !== null && !isNaN(score);
                  const totalScoreVal = isScoreValid ? (score * coef).toFixed(1) : null;
                  const maxPossible = coef * 20;

                  const isPass = isScoreValid && score >= 10;
                  const scoreTextColor = isScoreValid ? (isPass ? 'text-blue-700 font-bold' : 'text-red-600 font-bold') : 'text-slate-400';
                  const calculatedGrade = isScoreValid ? calculateIndustrialGrade(score) : '—';
                  const rawRank = subjectRanks[subKey];

                  return (
                    <tr key={sub.id || idx} className="hover:bg-orange-50/20">
                      <td className="p-1.5 font-bold text-slate-900">{sub.subject_name}</td>
                      <td className="p-1.5 text-slate-600 font-medium">{sub.category || 'Industrial Subjects'}</td>
                      <td className="p-1.5 text-center font-bold text-orange-950">{coef}</td>
                      <td className={`p-1.5 text-center ${scoreTextColor}`}>{isScoreValid ? `${score} / 20` : '—'}</td>
                      <td className={`p-1.5 text-center font-black ${scoreTextColor}`}>
                        {totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}
                      </td>
                      <td className="p-1.5 text-center font-black text-slate-800">{calculatedGrade}</td>
                      <td className="p-1.5 text-center font-bold text-orange-900">{rawRank ? getOrdinalSuffix(rawRank) : '—'}</td>
                      <td className="p-1.5 text-slate-600 truncate max-w-[130px]">{sub.resolved_instructor || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PERFORMANCE SUMMARY BAR */}
        <div className="grid grid-cols-5 gap-2 bg-orange-950 text-white p-2.5 rounded-xl text-center">
          <div>
            <span className="text-[9px] text-orange-200 uppercase block font-semibold">Total Points</span>
            <strong className="text-xs sm:text-sm">{stData.totalCoef > 0 ? `${stData.totalPoints?.toFixed(1)} / ${stData.totalCoef * 20}` : '—'}</strong>
          </div>
          <div>
            <span className="text-[9px] text-orange-200 uppercase block font-semibold">Student Average</span>
            <strong className="text-sm sm:text-base font-black text-amber-300">{stData.termAverage ? `${stData.termAverage} / 20` : '—'}</strong>
          </div>
          <div>
            <span className="text-[9px] text-orange-200 uppercase block font-semibold">Class Rank</span>
            <strong className="text-xs sm:text-sm">{stData.rank ? getOrdinalSuffix(stData.rank) : '—'}</strong>
          </div>
          <div>
            <span className="text-[9px] text-orange-200 uppercase block font-semibold">Class Average</span>
            <strong className="text-xs sm:text-sm">{classAverage ? `${classAverage} / 20` : '—'}</strong>
          </div>
          <div>
            <span className="text-[9px] text-orange-200 uppercase block font-semibold">Status</span>
            <strong className={`text-xs sm:text-sm font-bold ${stData.termStatus === 'Passed' ? 'text-emerald-300' : stData.termStatus === 'Failed' ? 'text-red-300' : 'text-slate-300'}`}>
              {stData.termStatus || '—'}
            </strong>
          </div>
        </div>

        {/* EXPANDED DISCIPLINE & PRINCIPAL REMARKS GRID */}
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-orange-50/20 border border-orange-200 rounded-xl space-y-1 min-h-[65px]">
            <span className="font-extrabold text-orange-950 uppercase block text-[10px]">Discipline & Conduct</span>
            <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{stData.disciplineRecord?.absences ?? 0} hrs</strong></p>
            <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{stData.disciplineRecord?.latecomings || stData.disciplineRecord?.tardiness || 0} times</strong></p>
            <p className="text-slate-700 italic text-[10px] truncate">{stData.disciplineRecord?.remarks ? `"${stData.disciplineRecord.remarks}"` : ''}</p>
          </div>
          <div className="p-3 bg-orange-50/20 border border-orange-200 rounded-xl space-y-1 min-h-[65px]">
            <span className="font-extrabold text-orange-950 uppercase block text-[10px]">Principal Remarks</span>
            <p className="text-slate-700 italic text-[11px] min-h-[35px]">
              {stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text ? `"${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text}"` : ''}
            </p>
          </div>
        </div>

        {/* SIGNATURES & ENDORSEMENT SECTION */}
        <div className="pt-3 border-t border-orange-200 grid grid-cols-2 gap-8 text-[11px] text-center">
          <div className="space-y-5">
            <p className="font-bold text-orange-950 uppercase text-[10px]">Head of Industrial Department</p>
            <div className="border-b border-dashed border-orange-300 mx-6"></div>
            <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
          </div>
          <div className="space-y-5">
            <p className="font-bold text-orange-950 uppercase text-[10px]">The Principal</p>
            <div className="border-b border-dashed border-orange-300 mx-6"></div>
            <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[9999]">
      
      {/* TOOLBAR CONTROLS */}
      <div className="w-full max-w-5xl bg-orange-950 border border-orange-800 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4 text-white print:hidden sticky top-2 z-10 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
            ⚙️ Technical Industrial (IND) — <span className="text-white">{selectedClass}</span>
          </h2>
          <p className="text-xs text-orange-200 mt-0.5">
            Specialty Enrolment: <span className="text-white font-bold">{studentsList.length} Students</span> | Trade: <span className="text-amber-300 font-bold">{selectedTrade}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">

          {/* LOCKED EDUCATION TRACK SWITCHER */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-orange-200 font-medium">Education Track</label>
            <select
              value={selectedTrack}
              disabled
              className="bg-orange-900 border border-orange-700 rounded-lg px-2.5 py-1.5 text-white font-bold opacity-90 cursor-not-allowed max-w-[170px] truncate"
            >
              <option value="industrial">Technical Industrial (IND)</option>
            </select>
          </div>

          {/* CLASS SELECTOR */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-orange-200 font-medium">Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setCurrentIndex(0); }}
              className="bg-orange-900 border border-orange-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-300 focus:outline-none max-w-[170px] truncate"
            >
              {(TECHNICAL_INDUSTRIAL_CATALOG || []).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* TRADE SELECTOR */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-orange-200 font-medium">Trade / Specialty</label>
            <select
              value={selectedTrade}
              onChange={(e) => { setSelectedTrade(e.target.value); setCurrentIndex(0); }}
              className="bg-orange-900 border border-orange-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-300 focus:outline-none max-w-[160px] truncate"
            >
              {availableTrades.map((tr) => (
                <option key={tr} value={tr}>{tr === 'ALL' ? 'All Industrial Trades' : tr}</option>
              ))}
            </select>
          </div>

          {/* TERM SELECTOR */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-orange-200 font-medium">Evaluation Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => { setSelectedTerm(e.target.value); setCurrentIndex(0); }}
              className="bg-orange-900 border border-orange-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-300 focus:outline-none"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex items-center bg-orange-900 rounded-xl p-1 border border-orange-700 self-end">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'single' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-orange-200 hover:text-white'
              }`}
            >
              Single Card
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-orange-200 hover:text-white'
              }`}
            >
              Full Trade ({studentsList.length})
            </button>
          </div>

          {/* PAGINATION */}
          {viewMode === 'single' && studentsList.length > 0 && (
            <div className="flex items-center gap-1.5 self-end">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="px-2.5 py-1.5 bg-orange-900 border border-orange-700 rounded-lg text-xs hover:bg-orange-800 disabled:opacity-40"
              >
                ◀ Previous
              </button>
              <span className="text-xs font-mono px-1">
                {currentIndex + 1}/{studentsList.length}
              </span>
              <button
                type="button"
                disabled={currentIndex >= studentsList.length - 1}
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-2.5 py-1.5 bg-orange-900 border border-orange-700 rounded-lg text-xs hover:bg-orange-800 disabled:opacity-40"
              >
                Next ▶
              </button>
            </div>
          )}

          {/* PRINT & DOWNLOAD PDF BUTTONS */}
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              disabled={isDownloading || studentsList.length === 0}
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>📥</span> {isDownloading ? statusMessage || 'Exporting...' : 'Download Vector PDF'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all"
            >
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #bulk-industrial-pdf-container,
          #bulk-industrial-pdf-container * {
            visibility: visible !important;
          }

          #bulk-industrial-pdf-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          body { 
            background: #ffffff !important; 
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bulk-student-a4-page {
            page-break-before: always !important;
            page-break-after: always !important;
            break-before: page !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            
            width: 210mm !important;
            height: 290mm !important;
            max-height: 290mm !important;
            
            margin: 0 auto !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bulk-student-a4-page:first-child {
            page-break-before: auto !important;
            break-before: auto !important;
          }

          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
        }
      `}</style>

      {/* PREVIEW CONTAINER */}
      <div id="bulk-industrial-pdf-container" className="w-full flex flex-col items-center gap-8 pb-12 print:gap-0 print:pb-0">
        {isLoading ? (
          <div className="bg-orange-950 border border-orange-800 text-orange-200 p-8 rounded-2xl text-center max-w-md my-auto shadow-2xl">
            <p className="font-semibold text-base mb-1 animate-pulse text-amber-300">Loading Technical Industrial Trade...</p>
            <p className="text-xs text-orange-300">Calculating averages and positions for {selectedClass} ({selectedTrade}).</p>
          </div>
        ) : studentsList.length === 0 ? (
          <div className="bg-orange-950 border border-orange-800 text-orange-200 p-8 rounded-2xl text-center max-w-md my-auto shadow-2xl">
            <p className="font-semibold text-base mb-1 text-white">No Enrolled Students</p>
            <p className="text-xs text-orange-300">
              No industrial students found matching <span className="text-amber-300 font-semibold">{selectedClass}</span> in specialty <span className="text-white font-semibold">{selectedTrade}</span>.
            </p>
          </div>
        ) : viewMode === 'single' ? (
          renderSingleCard(currentStudent, currentIndex)
        ) : (
          studentsList.map((student, idx) => renderSingleCard(student, idx))
        )}
      </div>
    </div>
  );
}