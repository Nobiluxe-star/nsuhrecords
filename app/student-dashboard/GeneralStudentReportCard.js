'use client';

import { supabase } from '../../lib/supabase';
import { getCurrentAcademicYear } from '../../lib/academicYear';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GENERAL_LOWER_CLASSES, GENERAL_SERIES_CATALOG } from '../admin-dashboard/page';

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

// Cameroon English Sub-system Grading System
function calculateGrade(score, isSixthForm) {
  if (score === undefined || score === null || isNaN(Number(score))) return '—';
  const s = Number(score);

  if (isSixthForm) {
    if (s >= 15) return 'A';      // 75% - 100% (15-20)
    if (s >= 13) return 'B';      // 65% - 74% (13-14.9)
    if (s >= 11) return 'C';      // 55% - 64% (11-12.9)
    if (s >= 9)  return 'D';      // 45% - 54% (9-10.9)
    if (s >= 7)  return 'E';      // 35% - 44% (7-8.9)
    if (s >= 6)  return 'O';      // 30% - 34% Subsidiary Pass
    return 'F';                   // Below 30% (< 6)
  } else {
    if (s >= 15) return 'A';      // 75% - 100%
    if (s >= 13.1) return 'B';    // 65.5% - 74.9%
    if (s >= 11) return 'C';      // 55.0% - 65.4%
    if (s >= 9)  return 'D';      // 45.0% - 54.9%
    if (s >= 5)  return 'E';      // 25.0% - 44.9%
    return 'U';                   // Below 25% (< 5)
  }
}

function GeneralEducationReportContent(props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTerm, setActiveTerm] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [subjectRanksMap, setSubjectRanksMap] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const [schoolRegion, setSchoolRegion] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [schoolMotto, setSchoolMotto] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [feesRecord, setFeesRecord] = useState(null);
  const [classAverage, setClassAverage] = useState(null);
  const [studentRank, setStudentRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(null);
  const [disciplineRecord, setDisciplineRecord] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState(null);
  const [appDeveloper, setAppDeveloper] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);

      // Single Source of Truth for Academic Year
      const currentYearVal = getCurrentAcademicYear();
      setAcademicYear(currentYearVal);

      const schoolId = props?.overrideSchoolId || props?.student?.school_id || props?.schoolInfo?.school_id || searchParams.get('school_id');
      const studentRowId = props?.overrideStudentRowId || props?.student?.id || props?.student?.row_id || searchParams.get('row_id');
      const studentCode = props?.overrideStudentCode || props?.student?.unique_code || props?.student?.code || props?.student?.student_id || props?.student?.matricule || searchParams.get('id') || searchParams.get('unique_code') || searchParams.get('code');
      const urlSchoolName = searchParams.get('school_name');

      if (!schoolId && !urlSchoolName && !props?.student) {
        setIsLoading(false);
        return;
      }

      if (schoolId) {
        await supabase.rpc('set_active_school', { school_id: schoolId });
      }

      // =============================================================
      // PARALLEL BATCH 1: Fetch School Details & Student Profile Concurrently
      // =============================================================
      let schoolQuery = supabase.from('school_details').select('*');
      if (schoolId) {
        schoolQuery = schoolQuery.eq('school_id', schoolId);
      } else if (urlSchoolName) {
        schoolQuery = schoolQuery.ilike('name', urlSchoolName);
      }

      let profileQuery = null;
      if (studentRowId) {
        profileQuery = supabase.from('students').select('*').eq('id', studentRowId);
        if (schoolId) profileQuery = profileQuery.eq('school_id', schoolId);
      } else if (studentCode) {
        profileQuery = supabase
          .from('students')
          .select('*')
          .or(`unique_code.eq."${studentCode}",code.eq."${studentCode}",student_id.eq."${studentCode}"`);
        if (schoolId) profileQuery = profileQuery.eq('school_id', schoolId);
      }

      const [schoolRes, profileRes] = await Promise.all([
        schoolQuery.maybeSingle(),
        profileQuery ? profileQuery.maybeSingle() : Promise.resolve({ data: null })
      ]);

      const schoolData = schoolRes.data;
      if (schoolData) {
        setSchoolName(schoolData.name || schoolData.institution_name || schoolData.school_name || urlSchoolName || '');
        setSchoolRegion(schoolData.region || '');
        setSchoolAddress(schoolData.address_location || schoolData.address || schoolData.location || '');
        setSchoolMotto(schoolData.motto || schoolData.school_motto || '');
        setAppDeveloper(schoolData.app_developer_credit || '');
        setSchoolLogo(schoolData.logo_url || schoolData.logo || '');
        setSchoolPhone(schoolData.contact_line || schoolData.phone || '');
        setSchoolEmail(schoolData.official_email || schoolData.email || '');
      } else if (urlSchoolName) {
        setSchoolName(urlSchoolName);
      }

      const profile = profileRes.data || props?.student;
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const effectiveSchoolId = profile.school_id || schoolId;
      const activeClass = (profile.classLevel || profile.class_level || profile.class_name || profile.class || '').trim();
      const activeSeries = (profile.trades_series || profile.series || profile.trade || '—').trim();
      const activeStudentId = profile.id;
      const activeUniqueCode = profile.unique_code || profile.code || profile.student_id || studentCode || '';
      const detectedPhoto = profile.picture || profile.photo_url || profile.passport_photo || profile.avatar_url || profile.image_url || null;

      setStudentData({
        ...profile,
        display_name: profile.fullName || profile.full_name || profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        display_class: activeClass,
        display_section: profile.section || profile.academic_section || profile.education_type || 'General Education',
        display_series: activeSeries,
        photo_url: detectedPhoto,
        matricule: activeUniqueCode
      });

      const termString = `Term ${activeTerm}`;

      // =============================================================
      // PARALLEL BATCH 2: Concurrently Fetch Enrolment, Coeffs, Teachers, Marks, Fees, Discipline & Remarks
      // =============================================================
      let cQuery = supabase.from('students').select('*');
      if (effectiveSchoolId) cQuery = cQuery.eq('school_id', effectiveSchoolId);

      let coeffQuery = supabase.from('class_coefficients').select('*');
      let teacherQuery = supabase.from('teachers').select('*');
      let marksQuery = supabase.from('marks').select('*');
      let feesQ = supabase.from('school_fees').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeUniqueCode}"`);
      let discQ = supabase.from('student_term_summaries').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeUniqueCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);
      let remQ = supabase.from('principal_notices').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeUniqueCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);

      if (effectiveSchoolId) {
        coeffQuery = coeffQuery.eq('school_id', effectiveSchoolId);
        teacherQuery = teacherQuery.eq('school_id', effectiveSchoolId);
        marksQuery = marksQuery.eq('school_id', effectiveSchoolId);
        feesQ = feesQ.eq('school_id', effectiveSchoolId);
        discQ = discQ.eq('school_id', effectiveSchoolId);
        remQ = remQ.eq('school_id', effectiveSchoolId);
      }

      const [cStudentsRes, subRes, teachersRes, marksRes, feesRes, disciplineRes, remarksRes] = await Promise.all([
        cQuery,
        coeffQuery,
        teacherQuery,
        marksQuery,
        feesQ.maybeSingle(),
        discQ.maybeSingle(),
        remQ.maybeSingle()
      ]);

      // --- 1. Class Enrolment & Sixth Form Series Filtering ---
      const activeClassLower = activeClass.toLowerCase();
      const isLowerClass = GENERAL_LOWER_CLASSES.some(c => c.toLowerCase().trim() === activeClassLower || activeClassLower.includes(c.toLowerCase().trim()));
      const isSixthFormClass = !isLowerClass || activeClassLower.includes('sixth') || activeClassLower.includes('lower 6') || activeClassLower.includes('upper 6') || activeClassLower.includes('l6') || activeClassLower.includes('u6');

      let classStudents = [];
      if (Array.isArray(cStudentsRes.data)) {
        classStudents = cStudentsRes.data.filter(s => {
          const sClass = (s.classLevel || s.class_level || s.class_name || s.class || '').trim().toLowerCase();
          const sSeries = (s.trades_series || s.series || s.trade || '').trim().toLowerCase();

          const matchesClass = sClass === activeClassLower;
          if (!matchesClass) return false;

          // Sixth Form: Filter by exact Series / Trade
          if (isSixthFormClass && activeSeries !== '—' && activeSeries !== 'N/A' && activeSeries !== '') {
            return sSeries === activeSeries.toLowerCase();
          }

          return true;
        });
        setTotalStudents(classStudents.length);
      }

      // --- 2. Process Coefficients & Teachers ---
      let loadedSubjects = [];
      const allCoefficientsRows = subRes.data || [];
      const teachersData = teachersRes.data || [];

      const matchedCoeffRow = allCoefficientsRows.find((row) => {
        const rowClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
        return rowClass === activeClass.toLowerCase();
      });

      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return 'N/A';
        const cleanSub = subjectName.toLowerCase().trim();

        const match = teachersData.find((t) => {
          const rawSubs = t.subjects || t.subject || [];
          if (Array.isArray(rawSubs)) {
            return rawSubs.some((s) => typeof s === 'string' && s.toLowerCase().trim() === cleanSub);
          }
          if (typeof rawSubs === 'string') {
            return rawSubs.toLowerCase().trim() === cleanSub;
          }
          return false;
        });

        return match ? (match.name || match.fullName || match.full_name || 'N/A') : 'N/A';
      };

      if (matchedCoeffRow) {
        let rawSubs = matchedCoeffRow.subject_coefficients;
        if (typeof rawSubs === 'string') {
          try { rawSubs = JSON.parse(rawSubs); } catch (e) { rawSubs = null; }
        }

        if (Array.isArray(rawSubs) && rawSubs.length > 0) {
          rawSubs.forEach((item) => {
            const sName = item.name || item.subject_name || item.subject_code || '';
            const coefVal = Number(item.coefficient || item.coeff || item.coef || item.weight || 1);
            const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

            loadedSubjects.push({
              id: item.id || `${sName}-${coefVal}`,
              subject_name: sName,
              coefficient: coefVal,
              instructor: instructorName
            });
          });
        }
      }
      setSubjects(loadedSubjects);

      // --- 3. Process Marks & Subject Ranks ---
      const rawMarks = marksRes.data || [];
      const classMarksList = rawMarks.filter(m => {
        const mTerm = String(m.term || '').trim().toLowerCase();
        return mTerm === termString.toLowerCase() || mTerm === String(activeTerm);
      });

      const scoreLookup = {};
      const rankLookup = {};

      const currentStudentMarks = classMarksList.filter(m => 
        (activeStudentId && String(m.student_id) === String(activeStudentId)) ||
        (activeUniqueCode && (m.unique_code === activeUniqueCode || m.code === activeUniqueCode))
      );

      currentStudentMarks.forEach((m) => {
        const key = (m.subject_name || m.subject_code || '').toLowerCase().trim();
        scoreLookup[key] = m.term_score ?? m.score ?? m.mark ?? m.marks;
        if (m.subject_rank || m.rank) {
          rankLookup[key] = m.subject_rank || m.rank;
        }
      });

      loadedSubjects.forEach((sub) => {
        const subKey = sub.subject_name.toLowerCase().trim();
        if (!rankLookup[subKey]) {
          const subScores = classMarksList
            .filter(m => (m.subject_name || m.subject_code || '').toLowerCase().trim() === subKey)
            .map(m => Number(m.term_score ?? m.score ?? m.mark ?? m.marks))
            .filter(s => !isNaN(s));

          const currentScore = Number(scoreLookup[subKey]);
          if (!isNaN(currentScore) && subScores.length > 0) {
            subScores.sort((a, b) => b - a);
            const rank = subScores.indexOf(currentScore) + 1;
            if (rank > 0) rankLookup[subKey] = rank;
          }
        }
      });

      setMarksMap(scoreLookup);
      setSubjectRanksMap(rankLookup);

      // --- 4. Compute Overall Class Rank & Class Average ---
      let computedRank = null;
      let computedClassAvg = null;

      if (classStudents.length > 0 && loadedSubjects.length > 0) {
        const studentAverages = [];

        classStudents.forEach(st => {
          let sPts = 0;
          let sCoef = 0;
          let sHasMarks = false;

          const stMarks = classMarksList.filter(m => 
            (st.id && String(m.student_id) === String(st.id)) ||
            (st.unique_code && (m.unique_code === st.unique_code || m.code === st.unique_code))
          );

          loadedSubjects.forEach(sub => {
            const subKey = sub.subject_name.toLowerCase().trim();
            const coef = sub.coefficient;
            const match = stMarks.find(m => (m.subject_name || m.subject_code || '').toLowerCase().trim() === subKey);
            const val = match ? Number(match.term_score ?? match.score ?? match.mark ?? match.marks) : NaN;

            if (!isNaN(val)) {
              sHasMarks = true;
              sPts += val * coef;
              sCoef += coef;
            }
          });

          if (sHasMarks && sCoef > 0) {
            const avg = sPts / sCoef;
            studentAverages.push({
              id: st.id,
              unique_code: st.unique_code || st.code || st.student_id,
              avg: avg
            });
          }
        });

        if (studentAverages.length > 0) {
          const totalAvgSum = studentAverages.reduce((sum, item) => sum + item.avg, 0);
          computedClassAvg = (totalAvgSum / studentAverages.length).toFixed(2);

          studentAverages.sort((a, b) => b.avg - a.avg);
          const myIndex = studentAverages.findIndex(item => 
            (activeStudentId && String(item.id) === String(activeStudentId)) ||
            (activeUniqueCode && item.unique_code === activeUniqueCode)
          );

          if (myIndex !== -1) {
            computedRank = myIndex + 1;
          }
        }
      }

      setStudentRank(computedRank);
      setClassAverage(computedClassAvg);

      // --- 5. Set Fees, Discipline & Remarks Records ---
      setFeesRecord(feesRes.data || null);
      setDisciplineRecord(disciplineRes.data || null);
      setAdminRemarks(remarksRes.data || null);

      if (disciplineRes.data) {
        if (disciplineRes.data.class_rank || disciplineRes.data.rank) {
          setStudentRank(disciplineRes.data.class_rank || disciplineRes.data.rank);
        }
        if (disciplineRes.data.class_average || disciplineRes.data.class_avg) {
          setClassAverage(disciplineRes.data.class_average || disciplineRes.data.class_avg);
        }
      }

      setIsLoading(false);
    }

    loadReportData();
  }, [activeTerm, searchParams, router, props]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Report link copied to clipboard!');
    }
  };

  const activeClassName = (studentData?.display_class || '').toLowerCase().trim();
  const isLowerClass = GENERAL_LOWER_CLASSES.some(c => c.toLowerCase().trim() === activeClassName || activeClassName.includes(c.toLowerCase().trim()));
  const isSixthForm = !isLowerClass || activeClassName.includes('sixth') || activeClassName.includes('lower 6') || activeClassName.includes('upper 6') || activeClassName.includes('l6') || activeClassName.includes('u6');

  let totalPoints = 0;
  let totalCoef = 0;
  let hasAnyMarks = false;

  subjects.forEach((sub) => {
    const subKey = (sub.subject_name || sub.name || '').toLowerCase().trim();
    const score = marksMap[subKey];
    const coef = Number(sub.coefficient || sub.coef || 1);

    if (score !== undefined && score !== null && score !== '' && !isNaN(Number(score))) {
      hasAnyMarks = true;
      totalPoints += Number(score) * coef;
      totalCoef += coef;
    }
  });

  const termAverage = totalCoef > 0 && hasAnyMarks ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'Passed' : 'Failed') : null;

  const paidAmount = Number(feesRecord?.amount_paid || feesRecord?.fees_paid || 0);
  const balanceAmount = Number(feesRecord?.balance || feesRecord?.fee_balance || 0);
  
  const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
  const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-2 sm:p-6 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-compact-table td, .print-compact-table th {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0 print-container">
        <div className="flex justify-between items-center no-print">
          <button onClick={() => router.push('/')} className="text-xs font-semibold text-blue-600 hover:underline">&larr; Back to Portal Login</button>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition shadow">Print Report Card</button>
            <button onClick={handleShare} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/20">Share Link</button>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-3xl p-4 sm:p-8 shadow-xl space-y-4 print:space-y-3 print:rounded-none">
          <div className="border border-slate-300 bg-blue-50/20 rounded-2xl p-3 shadow-sm flex flex-row items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border border-slate-300 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
              {schoolLogo ? <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" /> : <span className="text-[9px] font-bold text-slate-400 text-center uppercase">LOGO</span>}
            </div>
            <div className="flex-1 border border-slate-300 rounded-xl bg-white divide-y divide-slate-200 text-center">
              {/* Line 1: School Name & Single Source of Truth Academic Year */}
              <div className="p-1.5">
                <h1 className="text-base sm:text-xl font-black text-blue-800 uppercase tracking-tight">{schoolName || 'COLLEGE NAME'}</h1>
                <p className="text-[10px] sm:text-xs font-semibold text-blue-600">Academic Year: {academicYear}</p>
              </div>
              {/* Line 2: Regional Delegation Title */}
              <div className="p-1 bg-blue-50/50">
                <p className="text-[10px] sm:text-xs font-black text-blue-900 uppercase tracking-tight whitespace-nowrap">
                  REGIONAL DELEGATION FOR SECONDARY EDUCATION
                  {schoolRegion && ` FOR THE ${schoolRegion.toUpperCase()}`}
                </p>
              </div>

              {/* Line 3: Contact Metadata */}
              <div className="p-1 flex justify-center items-center gap-x-4 text-[10px] sm:text-xs font-bold text-blue-900 flex-wrap whitespace-nowrap">
                <span>Tel: {schoolPhone || '—'}</span>
                <span>Email: {schoolEmail || '—'}</span>
                {schoolAddress && <span>Location: {schoolAddress}</span>}
              </div>
            </div>
          </div>

          {schoolMotto && (
            <div className="p-1.5 bg-blue-50/40 border border-blue-200 rounded-xl text-center">
              <p className="text-xs font-serif italic font-bold text-blue-900">Motto: "{schoolMotto}"</p>
            </div>
          )}

          <div className="p-2 bg-blue-100/50 border border-blue-200 rounded-xl text-center">
            <h2 className="text-sm sm:text-base font-serif font-black text-blue-950 tracking-wider uppercase">
              ACADEMIC PERFORMANCE RECORD — {getOrdinalTermWord(activeTerm).toUpperCase()}
            </h2>
          </div>

          <div className="flex flex-row gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt={studentData?.display_name || "Student"} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span className="text-[8px] font-medium uppercase">No Photo</span>
                </div>
              )}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-[11px]">
              <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Student Name</span><strong className="text-slate-900 block truncate">{studentData?.display_name || '—'}</strong></div>
              <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Class</span><strong className="text-slate-900 block">{studentData?.display_class || '—'}</strong></div>
              <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Section</span><strong className="text-slate-900 block">{studentData?.display_section || 'General Education'}</strong></div>
              <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Series / Option</span><strong className="text-slate-900 block">{studentData?.display_series || '—'}</strong></div>
              <div className="pt-1 border-t border-slate-200"><span className="text-slate-400 block text-[9px] uppercase font-bold">Matricule</span><strong className="text-blue-800 font-mono block">{studentData?.matricule || '—'}</strong></div>
              <div className="pt-1 border-t border-slate-200"><span className="text-slate-400 block text-[9px] uppercase font-bold">Enrolment</span><strong className="text-slate-900 block">{totalStudents !== null ? `${totalStudents} Students` : '—'}</strong></div>
              <div className="pt-1 border-t border-slate-200 text-right"><span className="text-slate-400 block text-[9px] uppercase font-bold">Fees Paid</span><strong className="text-emerald-700 block">{displayPaid}</strong></div>
              <div className="pt-1 border-t border-slate-200 text-right"><span className="text-slate-400 block text-[9px] uppercase font-bold">Fee Balance</span><strong className="text-red-600 block">{displayBalance}</strong></div>
            </div>
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 no-print">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button key={term} onClick={() => setActiveTerm(term)} className={`px-5 py-2 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Term {term}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300 rounded-lg overflow-hidden print-compact-table">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="p-2">Subject Name</th>
                  <th className="p-2 text-center">Coef</th>
                  <th className="p-2 text-center">Score (/20)</th>
                  <th className="p-2 text-center">Total Marks</th>
                  <th className="p-2 text-center">Grade</th>
                  <th className="p-2 text-center">Rank</th>
                  <th className="p-2">Instructor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-[11px]">
                {isLoading ? (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-400 animate-pulse">Loading academic record...</td></tr>
                ) : subjects.length === 0 ? (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-400 italic">No subject coefficients configured for this class.</td></tr>
                ) : (
                  subjects.map((sub, idx) => {
                    const subName = sub.subject_name || sub.name;
                    const subKey = subName.toLowerCase().trim();
                    const score = marksMap[subKey];
                    const coef = Number(sub.coefficient || sub.coef || 1);
                    
                    const scoreNum = Number(score);
                    const isScoreValid = score !== undefined && score !== null && score !== '' && !isNaN(scoreNum);
                    
                    const totalScoreVal = isScoreValid ? (scoreNum * coef).toFixed(1) : null;
                    const maxPossible = coef * 20;

                    const isPass = isScoreValid && scoreNum >= 10;
                    const scoreTextColor = isScoreValid ? (isPass ? 'text-blue-700 font-bold' : 'text-red-600 font-bold') : 'text-slate-400';
                    const calculatedGrade = isScoreValid ? calculateGrade(scoreNum, isSixthForm) : '—';
                    const rawRank = subjectRanksMap[subKey];

                    return (
                      <tr key={sub.id || `${subKey}-${idx}`} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{subName}</td>
                        <td className="p-2 text-center font-bold">{coef}</td>
                        <td className={`p-2 text-center ${scoreTextColor}`}>{isScoreValid ? scoreNum : '—'}</td>
                        <td className={`p-2 text-center font-black ${scoreTextColor}`}>
                          {totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}
                        </td>
                        <td className="p-2 text-center font-black text-slate-800">{calculatedGrade}</td>
                        <td className="p-2 text-center font-bold text-blue-700">{rawRank ? getOrdinalSuffix(rawRank) : '—'}</td>
                        <td className="p-2 text-slate-600 truncate max-w-[120px]">{sub.instructor || 'N/A'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-5 gap-2 bg-blue-900 text-white p-3 rounded-xl text-center">
            <div><span className="text-[9px] text-blue-200 uppercase block font-semibold">Total Points</span><strong className="text-sm sm:text-base">{hasAnyMarks ? `${totalPoints.toFixed(1)} / ${totalCoef * 20}` : '—'}</strong></div>
            <div><span className="text-[9px] text-blue-200 uppercase block font-semibold">Term Average</span><strong className="text-base sm:text-lg font-black text-amber-300">{termAverage ? `${termAverage} / 20` : '—'}</strong></div>
            <div><span className="text-[9px] text-blue-200 uppercase block font-semibold">Class Rank</span><strong className="text-sm sm:text-base">{studentRank ? getOrdinalSuffix(studentRank) : '—'}</strong></div>
            <div><span className="text-[9px] text-blue-200 uppercase block font-semibold">Class Avg</span><strong className="text-sm sm:text-base">{classAverage ? `${classAverage} / 20` : '—'}</strong></div>
            <div><span className="text-[9px] text-blue-200 uppercase block font-semibold">Status</span><strong className={`text-sm sm:text-base font-extrabold ${termStatus === 'Passed' ? 'text-emerald-400' : termStatus === 'Failed' ? 'text-red-400' : 'text-slate-300'}`}>{termStatus || '—'}</strong></div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Discipline & Conduct</span>
              <p className="text-slate-600 text-[11px]">Unjustified Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? 0} hrs</strong></p>
              <p className="text-slate-600 text-[11px]">Tardiness: <strong className="text-slate-900">{disciplineRecord?.latecomings || disciplineRecord?.tardiness || 0} times</strong></p>
              <p className="text-slate-700 italic text-[10px] mt-1 truncate">{disciplineRecord?.remarks || disciplineRecord?.punishments ? `"${disciplineRecord.remarks || disciplineRecord.punishments}"` : 'Conduct Satisfactory.'}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Principal Remarks</span>
              <p className="text-slate-700 italic text-[11px] min-h-[40px]">
                {adminRemarks?.remark_text || adminRemarks?.notice_text ? `"${adminRemarks.remark_text || adminRemarks.notice_text}"` : ''}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Vice-Principal / Senior Master</p>
              <div className="border-b border-dashed border-slate-400 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
            <div className="space-y-8">
              <p className="font-bold text-slate-800 uppercase text-[10px]">The Principal</p>
              <div className="border-b border-dashed border-slate-400 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
          </div>

        </div>

        {appDeveloper && <div className="text-center py-1 text-[10px] text-slate-500 font-medium no-print">{appDeveloper}</div>}
      </div>
    </div>
  );
}

export default function GeneralStudentReportCard(props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm font-medium">Loading Student Report Card...</div>}>
      <GeneralEducationReportContent {...props} />
    </Suspense>
  );
}