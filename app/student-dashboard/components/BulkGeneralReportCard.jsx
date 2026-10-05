'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import { GENERAL_LOWER_CLASSES, GENERAL_CLASSES_CATALOG, GENERAL_SERIES_CATALOG } from '../../admin-dashboard/page';

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
    default: return `Term ${termNumber}`;
  }
}

function calculateGrade(score, isSixthForm) {
  if (score === undefined || score === null || isNaN(Number(score))) return '—';
  const s = Number(score);

  if (isSixthForm) {
    if (s >= 15) return 'A';
    if (s >= 13) return 'B';
    if (s >= 11) return 'C';
    if (s >= 9)  return 'D';
    if (s >= 7)  return 'E';
    if (s >= 6)  return 'O';
    return 'F';
  } else {
    if (s >= 15) return 'A';
    if (s >= 13.1) return 'B';
    if (s >= 11) return 'C';
    if (s >= 9)  return 'D';
    if (s >= 5)  return 'E';
    return 'U';
  }
}

function normalizeClass(cls) {
  if (!cls) return '';
  return cls.toLowerCase().replace(/\(.*?\)/g, '').trim();
}

export default function BulkGeneralReportCard({
  isOpen,
  onClose,
  activeClass = 'Form 1A (F1A)',
  activeTerm = 'Term 1',
  schoolInfo = {}
}) {
  const [selectedClass, setSelectedClass] = useState(activeClass || 'Form 1A (F1A)');
  const [selectedTerm, setSelectedTerm] = useState(activeTerm || 'Term 1');
  const [selectedSeries, setSelectedSeries] = useState('ALL');
  const [viewMode, setViewMode] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [studentsList, setStudentsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [processedDataMap, setProcessedDataMap] = useState({});
  const [schoolData, setSchoolData] = useState({});
  const [classAverage, setClassAverage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);

  const effectiveSchoolId = useMemo(() => {
    if (typeof window !== 'undefined') {
      return (
        schoolInfo?.school_id ||
        schoolInfo?.id ||
        schoolInfo?.active_school_id ||
        localStorage.getItem('active_school_id') ||
        localStorage.getItem('school_id') ||
        localStorage.getItem('user_school_id') ||
        ''
      );
    }
    return schoolInfo?.school_id || schoolInfo?.id || schoolInfo?.active_school_id || '';
  }, [schoolInfo]);

  useEffect(() => {
    if (isOpen) {
      if (activeClass) setSelectedClass(activeClass);
      if (activeTerm) setSelectedTerm(activeTerm);
      setCurrentIndex(0);
    }
  }, [isOpen, activeClass, activeTerm]);

  const availableSeriesList = useMemo(() => {
    const clsLower = selectedClass.toLowerCase();
    const isLower = (GENERAL_LOWER_CLASSES || []).some(
      (c) => c.toLowerCase().trim() === clsLower || clsLower.includes(c.toLowerCase().trim())
    );
    if (isLower) return ['N/A'];

    if (clsLower.includes('arts') || clsLower.includes('a1') || clsLower.includes('a2') || clsLower.includes('a3')) {
      return ['ALL', ...((GENERAL_SERIES_CATALOG && GENERAL_SERIES_CATALOG.ARTS) || ['A1', 'A2', 'A3', 'A4', 'A5'])];
    }
    if (clsLower.includes('science') || clsLower.includes('s1') || clsLower.includes('s2') || clsLower.includes('s3')) {
      return ['ALL', ...((GENERAL_SERIES_CATALOG && GENERAL_SERIES_CATALOG.SCIENCE) || ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'])];
    }
    return ['ALL', 'N/A'];
  }, [selectedClass]);

  // ==============================================================================
  // HIGH-SPEED MASTER QUERY ENGINE (WITH LOCAL STORAGE CACHING)
  // ==============================================================================
  const fetchAndCalculateBulkData = useCallback(async () => {
    if (!isOpen || !selectedClass) return;

    const cacheKey = `bg_cache_${effectiveSchoolId}_${normalizeClass(selectedClass)}_${selectedTerm}_${selectedSeries}`;

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
      let studentQuery = supabase.from('students').select('*');
      if (effectiveSchoolId) studentQuery = studentQuery.eq('school_id', effectiveSchoolId);

      let schoolQuery = supabase.from('school_details').select('*');
      if (effectiveSchoolId) schoolQuery = schoolQuery.eq('school_id', effectiveSchoolId);

      let coeffQuery = supabase.from('class_coefficients').select('*');
      if (effectiveSchoolId) coeffQuery = coeffQuery.eq('school_id', effectiveSchoolId);

      let teacherQuery = supabase.from('teachers').select('*');
      if (effectiveSchoolId) teacherQuery = teacherQuery.eq('school_id', effectiveSchoolId);

      const [schoolRes, allStudentsRes, coeffRes, teachersRes] = await Promise.all([
        schoolQuery.maybeSingle(),
        studentQuery.order('fullName', { ascending: true }),
        coeffQuery,
        teacherQuery
      ]);

      const fetchedSchoolData = schoolRes.data || {};
      setSchoolData(fetchedSchoolData);

      const targetClassClean = normalizeClass(selectedClass);

      let filteredStudents = (allStudentsRes.data || []).filter((s) => {
        const sClass = normalizeClass(s.classLevel || s.class_level || s.class_name || s.class || '');
        return sClass === targetClassClean || sClass.includes(targetClassClean) || targetClassClean.includes(sClass);
      });

      if (selectedSeries && selectedSeries !== 'ALL' && selectedSeries !== 'N/A') {
        filteredStudents = filteredStudents.filter((s) => {
          const sSeries = (s.trades_series || s.series || s.trade || '').trim().toLowerCase();
          return sSeries === selectedSeries.trim().toLowerCase();
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
      const matchedCoeffRow = (coeffRes.data || []).find((row) => {
        const rowClass = normalizeClass(row.classLevel || row.class_level || row.class_name || row.class || '');
        return rowClass === targetClassClean || rowClass.includes(targetClassClean);
      });

      const teachersData = teachersRes.data || [];
      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return 'N/A';
        const cleanSub = subjectName.toLowerCase().trim();
        const match = teachersData.find((t) => {
          const rawSubs = t.subjects || t.subject || [];
          if (Array.isArray(rawSubs)) {
            return rawSubs.some((s) => typeof s === 'string' && s.toLowerCase().trim() === cleanSub);
          }
          return typeof rawSubs === 'string' && rawSubs.toLowerCase().trim() === cleanSub;
        });
        return match ? (match.name || match.fullName || match.full_name || 'N/A') : 'N/A';
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
            const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

            loadedSubjects.push({
              id: item.id || `sub_${idx}`,
              subject_name: sName,
              coefficient: coefVal,
              instructor: instructorName
            });
          });
        }
      }
      setSubjectsList(loadedSubjects);

      const termNumeric = selectedTerm.replace(/[^0-9]/g, '') || '1';

      let marksQuery = supabase.from('marks').select('*').in('student_id', studentIds);
      if (effectiveSchoolId) marksQuery = marksQuery.eq('school_id', effectiveSchoolId);

      let feesQuery = supabase.from('school_fees').select('*').in('student_id', studentIds);
      if (effectiveSchoolId) feesQuery = feesQuery.eq('school_id', effectiveSchoolId);

      let discQuery = supabase.from('student_term_summaries').select('*').in('student_id', studentIds);
      if (effectiveSchoolId) discQuery = discQuery.eq('school_id', effectiveSchoolId);

      let remQuery = supabase.from('principal_notices').select('*').in('student_id', studentIds);
      if (effectiveSchoolId) remQuery = remQuery.eq('school_id', effectiveSchoolId);

      const [marksRes, feesRes, discRes, remRes] = await Promise.all([
        marksQuery,
        feesQuery,
        discQuery,
        remQuery
      ]);

      const classMarksList = (marksRes.data || []).filter((m) => {
        const mTerm = String(m.term || '').replace(/[^0-9]/g, '');
        return mTerm === String(termNumeric);
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
      }

    } catch (err) {
      console.error('Error in Bulk General Fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, effectiveSchoolId, selectedClass, selectedSeries, selectedTerm]);

  useEffect(() => {
    fetchAndCalculateBulkData();
  }, [fetchAndCalculateBulkData]);

  // ==============================================================================
  // DIRECT VECTOR PDF ENGINE (INTERNATIONAL SPECIFICATIONS)
  // ==============================================================================
  const handleDownloadBulkPDF = async () => {
    if (studentsList.length === 0) return;

    try {
      setIsProcessing(true);
      setStatusMessage('Generating Vector PDF...');

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

      studentsList.forEach((student, index) => {
        if (index > 0) pdf.addPage('a4', 'portrait');

        const sId = student.id;
        const stData = processedDataMap[sId] || {};
        const marksMap = stData.marksMap || {};
        const subjectRanks = stData.subjectRanks || {};

        const activeClassName = (student.classLevel || student.class_level || selectedClass || '').toLowerCase().trim();
        const isLowerClass = GENERAL_LOWER_CLASSES.some(c => c.toLowerCase().trim() === activeClassName || activeClassName.includes(c.toLowerCase().trim()));
        const isSixthForm = !isLowerClass || activeClassName.includes('sixth') || activeClassName.includes('lower 6') || activeClassName.includes('upper 6') || activeClassName.includes('l6') || activeClassName.includes('u6');

        const sName = student.fullName || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
        const sMatricule = student.unique_code || student.code || student.student_id || student.matricule || '—';

        const paidAmount = Number(stData.feesRecord?.amount_paid || stData.feesRecord?.fees_paid || 0);
        const balanceAmount = Number(stData.feesRecord?.balance || stData.feesRecord?.fee_balance || 0);
        const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
        const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

        // 1. Header Box
        pdf.setDrawColor(203, 213, 225);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(10, 8, 190, 26, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(30, 58, 138);
        pdf.text(schoolTitle, 105, 14, { align: 'center' });

        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(37, 99, 235);
        pdf.text(`Academic Year: ${currentAcademicYear}`, 105, 18.5, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(30, 58, 138);
        pdf.text(regionText, 105, 22.5, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Tel: ${schoolData.contact_line || schoolData.phone || schoolInfo?.phone || '—'}  |  Email: ${schoolData.official_email || schoolData.email || schoolInfo?.email || '—'}  |  Location: ${schoolData.address_location || schoolInfo?.address || '—'}`, 105, 28, { align: 'center' });

        if (mottoText) {
          pdf.setFillColor(239, 246, 255);
          pdf.roundedRect(10, 36, 190, 6, 2, 2, 'F');
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(8.5);
          pdf.setTextColor(30, 58, 138);
          pdf.text(mottoText, 105, 40, { align: 'center' });
        }

        // 2. Report Card Title
        const titleY = mottoText ? 44 : 36;
        pdf.setFillColor(219, 234, 254);
        pdf.roundedRect(10, titleY, 190, 7, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(15, 23, 42);
        const termTitle = `ACADEMIC PERFORMANCE RECORD — ${getOrdinalTermWord(selectedTerm.replace(/[^0-9]/g, '') || 1).toUpperCase()}`;
        pdf.text(termTitle, 105, titleY + 5, { align: 'center' });

        // 3. Student Details Table
        const studentInfoY = titleY + 9;
        autoTable(pdf, {
          startY: studentInfoY,
          margin: { left: 10, right: 10 },
          body: [
            [
              { content: `Student Name: ${sName}`, styles: { fontStyle: 'bold' } },
              { content: `Class: ${selectedClass}` },
              { content: `Section: General Education` },
              { content: `Series: ${student.trades_series || student.series || '—'}` }
            ],
            [
              { content: `Matricule: ${sMatricule}`, styles: { textColor: [30, 58, 138], fontStyle: 'bold' } },
              { content: `Enrolment: ${studentsList.length} Students` },
              { content: `Fees Paid: ${displayPaid}`, styles: { textColor: [4, 120, 87], fontStyle: 'bold' } },
              { content: `Fee Balance: ${displayBalance}`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }
            ]
          ],
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2 },
          tableLineColor: [203, 213, 225],
          tableLineWidth: 0.2
        });

        // 4. Academic Marks Table
        const tableData = subjectsList.map((sub) => {
          const subKey = sub.subject_name.toLowerCase().trim();
          const score = marksMap[subKey];
          const coef = Number(sub.coefficient || 1);

          const isScoreValid = score !== undefined && score !== null && !isNaN(score);
          const totalScoreVal = isScoreValid ? (score * coef).toFixed(1) : '—';
          const maxPossible = coef * 20;

          const calculatedGrade = isScoreValid ? calculateGrade(score, isSixthForm) : '—';
          const rawRank = subjectRanks[subKey];

          return [
            sub.subject_name,
            coef,
            isScoreValid ? score : '—',
            isScoreValid ? `${totalScoreVal} / ${maxPossible}` : '—',
            calculatedGrade,
            rawRank ? getOrdinalSuffix(rawRank) : '—',
            sub.instructor || 'N/A'
          ];
        });

        autoTable(pdf, {
          startY: pdf.lastAutoTable.finalY + 2,
          margin: { left: 10, right: 10 },
          head: [['Subject Name', 'Coef', 'Score (/20)', 'Total Marks', 'Grade', 'Rank', 'Instructor']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', textColor: [30, 58, 138] },
            6: { halign: 'left' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && (data.column.index === 2 || data.column.index === 3)) {
              const rawScore = data.row.cells[2].raw;
              if (typeof rawScore === 'number') {
                if (rawScore >= 10) {
                  data.cell.styles.textColor = [29, 78, 216]; // Blue Pass
                } else {
                  data.cell.styles.textColor = [220, 38, 38]; // Red Fail
                }
              }
            }
          }
        });

        // 5. Summary Stats Bar
        const summaryY = pdf.lastAutoTable.finalY + 3;
        pdf.setFillColor(30, 58, 138);
        pdf.roundedRect(10, summaryY, 190, 9, 2, 2, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(191, 219, 254);

        pdf.text('TOTAL POINTS', 25, summaryY + 2.8, { align: 'center' });
        pdf.text('TERM AVERAGE', 63, summaryY + 2.8, { align: 'center' });
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

        // 6. Discipline & Remarks Section
        const discY = summaryY + 11;
        autoTable(pdf, {
          startY: discY,
          margin: { left: 10, right: 10 },
          body: [
            [
              {
                content: `DISCIPLINE & CONDUCT\nUnjustified Absences: ${stData.disciplineRecord?.absences ?? 0} hrs\nTardiness: ${stData.disciplineRecord?.latecomings || stData.disciplineRecord?.tardiness || 0} times\nRemark: ${stData.disciplineRecord?.remarks ? `"${stData.disciplineRecord.remarks}"` : ''}`,
                styles: { cellWidth: 93 }
              },
              {
                content: `PRINCIPAL REMARKS\n${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text ? `"${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text}"` : ''}`,
                styles: { cellWidth: 93 }
              }
            ]
          ],
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          tableLineColor: [203, 213, 225],
          tableLineWidth: 0.2
        });

        // 7. Signatures Block
        const sigY = pdf.lastAutoTable.finalY + 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(30, 41, 59);

        pdf.text('VICE-PRINCIPAL / SENIOR MASTER', 50, sigY, { align: 'center' });
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

      pdf.save(`${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedTerm}_Report_Cards.pdf`);
    } catch (err) {
      console.error('Error generating vector PDF:', err);
      alert('Failed to generate PDF file directly.');
    } finally {
      setIsProcessing(false);
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

    const activeClassName = (student.classLevel || student.class_level || selectedClass || '').toLowerCase().trim();
    const isLowerClass = GENERAL_LOWER_CLASSES.some(c => c.toLowerCase().trim() === activeClassName || activeClassName.includes(c.toLowerCase().trim()));
    const isSixthForm = !isLowerClass || activeClassName.includes('sixth') || activeClassName.includes('lower 6') || activeClassName.includes('upper 6') || activeClassName.includes('l6') || activeClassName.includes('u6');

    const sName = student.fullName || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const sMatricule = student.unique_code || student.code || student.student_id || student.matricule || '—';

    const paidAmount = Number(stData.feesRecord?.amount_paid || stData.feesRecord?.fees_paid || 0);
    const balanceAmount = Number(stData.feesRecord?.balance || stData.feesRecord?.fee_balance || 0);
    const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
    const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

    // FORCED IMAGE SOURCE RESOLUTION WITH GUARANTEED FALLBACKS
    const logoSrc = schoolData.logo_url || schoolData.logo || schoolData.school_logo || schoolData.badge_url || schoolData.image_url || schoolInfo?.logo_url || schoolInfo?.logo || null;
    const photoSrc = student.picture || student.photo_url || student.passport_photo || student.image || null;

    return (
      <div
        key={sId || index}
        className="bulk-student-card-render print-page-card bg-white text-slate-800 p-5 rounded-3xl shadow-2xl border border-slate-300 max-w-4xl w-full mx-auto space-y-2.5"
      >
        {/* HEADER SECTION WITH FORCED SCHOOL LOGO CONTAINER */}
        <div className="border border-slate-300 bg-blue-50/20 rounded-2xl p-2.5 shadow-sm flex flex-row items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-blue-900/20 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-inner">
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
            <div className={`flex-col items-center justify-center text-blue-900 p-1 text-center ${logoSrc ? 'hidden' : 'flex'}`}>
              <svg className="w-8 h-8 text-blue-800 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-tighter">SCHOOL LOGO</span>
            </div>
          </div>

          <div className="flex-1 border border-slate-300 rounded-xl bg-white divide-y divide-slate-200 text-center">
            <div className="p-1">
              <h1 className="text-base sm:text-xl font-black text-blue-800 uppercase tracking-tight">
                {schoolData.name || schoolData.institution_name || schoolInfo?.name || 'COLLEGE NAME'}
              </h1>
              <p className="text-[10px] sm:text-xs font-semibold text-blue-600">
                Academic Year: {currentAcademicYear}
              </p>
            </div>
            <div className="p-0.5 bg-blue-50/50">
              <p className="text-[10px] sm:text-xs font-black text-blue-900 uppercase tracking-tight whitespace-nowrap">
                REGIONAL DELEGATION FOR SECONDARY EDUCATION
                {schoolData.region && ` FOR THE ${schoolData.region.toUpperCase()}`}
              </p>
            </div>
            {/* INCREASED INTERNATIONAL STANDARD TEXT SIZE FOR ADDRESS */}
            <div className="p-1 flex justify-center items-center gap-x-4 text-xs sm:text-sm font-bold text-blue-950 flex-wrap whitespace-nowrap">
              <span>Tel: {schoolData.contact_line || schoolData.phone || schoolInfo?.phone || '—'}</span>
              <span>Email: {schoolData.official_email || schoolData.email || schoolInfo?.email || '—'}</span>
              {(schoolData.address_location || schoolInfo?.address) && (
                <span>Location: {schoolData.address_location || schoolInfo?.address}</span>
              )}
            </div>
          </div>
        </div>

        {/* MOTTO BANNER WITH MATCHED ACADEMIC PERFORMANCE RECORD STYLE */}
        {(schoolData.motto || schoolInfo?.motto) && (
          <div className="p-1.5 bg-blue-100/50 border border-blue-200 rounded-xl text-center shadow-sm">
            <p className="text-xs sm:text-sm font-serif italic font-extrabold text-blue-950 tracking-wide">
              Motto: "{schoolData.motto || schoolInfo?.motto}"
            </p>
          </div>
        )}

        <div className="p-1 bg-blue-100/50 border border-blue-200 rounded-xl text-center">
          <h2 className="text-xs sm:text-sm font-serif font-black text-blue-950 tracking-wider uppercase">
            ACADEMIC PERFORMANCE RECORD — {getOrdinalTermWord(selectedTerm.replace(/[^0-9]/g, '') || 1).toUpperCase()}
          </h2>
        </div>

        {/* STUDENT INFO BOX WITH FORCED PHOTO CONTAINER */}
        <div className="flex flex-row gap-4 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
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
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-3 text-[10px]">
            <div><span className="text-slate-400 block text-[8px] uppercase font-bold">Student Name</span><strong className="text-slate-900 block truncate">{sName}</strong></div>
            <div><span className="text-slate-400 block text-[8px] uppercase font-bold">Class</span><strong className="text-slate-900 block">{selectedClass}</strong></div>
            <div><span className="text-slate-400 block text-[8px] uppercase font-bold">Section</span><strong className="text-slate-900 block">General Education</strong></div>
            <div><span className="text-slate-400 block text-[8px] uppercase font-bold">Series / Option</span><strong className="text-slate-900 block">{student.trades_series || student.series || 'N/A'}</strong></div>
            <div className="pt-0.5 border-t border-slate-200"><span className="text-slate-400 block text-[8px] uppercase font-bold">Matricule</span><strong className="text-blue-800 font-mono block">{sMatricule}</strong></div>
            <div className="pt-0.5 border-t border-slate-200"><span className="text-slate-400 block text-[8px] uppercase font-bold">Enrolment</span><strong className="text-slate-900 block">{studentsList.length} Students</strong></div>
            <div className="pt-0.5 border-t border-slate-200 text-right"><span className="text-slate-400 block text-[8px] uppercase font-bold">Fees Paid</span><strong className="text-emerald-700 block">{displayPaid}</strong></div>
            <div className="pt-0.5 border-t border-slate-200 text-right"><span className="text-slate-400 block text-[8px] uppercase font-bold">Fee Balance</span><strong className="text-red-600 block">{displayBalance}</strong></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] border border-slate-300 rounded-lg overflow-hidden">
            <thead className="bg-slate-900 text-white uppercase text-[8px] tracking-wider">
              <tr>
                <th className="p-1">Subject Name</th>
                <th className="p-1 text-center">Coef</th>
                <th className="p-1 text-center">Score (/20)</th>
                <th className="p-1 text-center">Total Marks</th>
                <th className="p-1 text-center">Grade</th>
                <th className="p-1 text-center">Rank</th>
                <th className="p-1">Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-[10px]">
              {subjectsList.length === 0 ? (
                <tr><td colSpan="7" className="p-2.5 text-center text-slate-400 italic">No subject coefficients configured for this class.</td></tr>
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
                  const calculatedGrade = isScoreValid ? calculateGrade(score, isSixthForm) : '—';
                  const rawRank = subjectRanks[subKey];

                  return (
                    <tr key={sub.id || idx} className="hover:bg-slate-50">
                      <td className="p-1 font-bold text-slate-900">{sub.subject_name}</td>
                      <td className="p-1 text-center font-bold">{coef}</td>
                      <td className={`p-1 text-center ${scoreTextColor}`}>{isScoreValid ? score : '—'}</td>
                      <td className={`p-1 text-center font-black ${scoreTextColor}`}>
                        {totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}
                      </td>
                      <td className="p-1 text-center font-black text-slate-800">{calculatedGrade}</td>
                      <td className="p-1 text-center font-bold text-blue-700">{rawRank ? getOrdinalSuffix(rawRank) : '—'}</td>
                      <td className="p-1 text-slate-600 truncate max-w-[100px]">{sub.instructor || 'N/A'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-5 gap-1.5 bg-blue-900 text-white p-1.5 rounded-xl text-center">
          <div><span className="text-[8px] text-blue-200 uppercase block font-semibold">Total Points</span><strong className="text-xs sm:text-sm">{stData.totalCoef > 0 ? `${stData.totalPoints?.toFixed(1)} / ${stData.totalCoef * 20}` : '—'}</strong></div>
          <div><span className="text-[8px] text-blue-200 uppercase block font-semibold">Term Average</span><strong className="text-sm sm:text-base font-black text-amber-300">{stData.termAverage ? `${stData.termAverage} / 20` : '—'}</strong></div>
          <div><span className="text-[8px] text-blue-200 uppercase block font-semibold">Class Rank</span><strong className="text-xs sm:text-sm">{stData.rank ? getOrdinalSuffix(stData.rank) : '—'}</strong></div>
          <div><span className="text-[8px] text-blue-200 uppercase block font-semibold">Class Avg</span><strong className="text-xs sm:text-sm">{classAverage ? `${classAverage} / 20` : '—'}</strong></div>
          <div><span className="text-[8px] text-blue-200 uppercase block font-semibold">Status</span><strong className={`text-xs sm:text-sm font-extrabold ${stData.termStatus === 'Passed' ? 'text-emerald-400' : stData.termStatus === 'Failed' ? 'text-red-400' : 'text-slate-300'}`}>{stData.termStatus || '—'}</strong></div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
            <span className="font-extrabold text-slate-900 uppercase block text-[9px]">Discipline & Conduct</span>
            <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{stData.disciplineRecord?.absences ?? 0} hrs</strong></p>
            <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{stData.disciplineRecord?.latecomings || stData.disciplineRecord?.tardiness || 0} times</strong></p>
            <p className="text-slate-700 italic text-[9px] truncate">{stData.disciplineRecord?.remarks ? `"${stData.disciplineRecord.remarks}"` : ''}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
            <span className="font-extrabold text-slate-900 uppercase block text-[9px]">Principal Remarks</span>
            <p className="text-slate-700 italic text-[10px] min-h-[20px]">
              {stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text ? `"${stData.adminRemarks?.remark_text || stData.adminRemarks?.notice_text}"` : ''}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-300 grid grid-cols-2 gap-6 text-center text-[10px]">
          <div className="space-y-4">
            <p className="font-bold text-slate-800 uppercase text-[9px]">Vice-Principal / Senior Master</p>
            <div className="border-b border-dashed border-slate-400 mx-4"></div>
            <p className="text-[8px] text-slate-400 italic">Signature & Stamp</p>
          </div>
          <div className="space-y-4">
            <p className="font-bold text-slate-800 uppercase text-[9px]">The Principal</p>
            <div className="border-b border-dashed border-slate-400 mx-4"></div>
            <p className="text-[8px] text-slate-400 italic">Signature & Stamp</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container-root, .print-container-root * {
            visibility: visible;
          }
          .print-container-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page-card {
            page-break-before: always;
            page-break-after: always;
            break-before: page;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 4mm 6mm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-page-card:first-child {
            page-break-before: avoid;
            break-before: avoid;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* TOOLBAR CONTROLS */}
      <div className="no-print w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4 text-white sticky top-2 z-10 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            📄 Bulk General Education — <span className="text-white">{selectedClass}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Class Enrolment: <span className="text-emerald-400 font-bold">{studentsList.length} Students</span> | Term: <span className="text-white font-medium">{selectedTerm}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 font-medium">Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setCurrentIndex(0); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-emerald-500 focus:outline-none max-w-[170px] truncate"
            >
              {(GENERAL_CLASSES_CATALOG || []).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 font-medium">Series / Option</label>
            <select
              value={selectedSeries}
              onChange={(e) => { setSelectedSeries(e.target.value); setCurrentIndex(0); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-emerald-500 focus:outline-none max-w-[150px] truncate"
            >
              {availableSeriesList.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Series' : s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 font-medium">Evaluation Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => { setSelectedTerm(e.target.value); setCurrentIndex(0); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 self-end">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'single' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Card
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Class ({studentsList.length})
            </button>
          </div>

          {viewMode === 'single' && studentsList.length > 0 && (
            <div className="flex items-center gap-1.5 self-end">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs hover:bg-slate-700 disabled:opacity-40"
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
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs hover:bg-slate-700 disabled:opacity-40"
              >
                Next ▶
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              disabled={isProcessing || studentsList.length === 0}
              onClick={handleDownloadBulkPDF}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>📥</span> {isProcessing ? statusMessage || 'Downloading...' : 'Download Vector PDF'}
            </button>

            <button
              type="button"
              disabled={studentsList.length === 0}
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>🖨️</span> Print Full Class
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

      <div className="print-container-root w-full flex flex-col items-center gap-8 pb-12">
        {isLoading ? (
          <div className="no-print bg-slate-900 border border-slate-800 text-slate-300 p-8 rounded-2xl text-center max-w-md my-auto shadow-2xl">
            <p className="font-semibold text-base mb-1 animate-pulse text-emerald-400">Loading General Education Class...</p>
            <p className="text-xs text-slate-400">Calculating averages and positions for {selectedClass}.</p>
          </div>
        ) : studentsList.length === 0 ? (
          <div className="no-print bg-slate-900 border border-slate-800 text-slate-300 p-8 rounded-2xl text-center max-w-md my-auto shadow-2xl">
            <p className="font-semibold text-base mb-1 text-white">No Students Enrolled</p>
            <p className="text-xs text-slate-400">
              No students found for <span className="text-emerald-400 font-semibold">{selectedClass}</span>.
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