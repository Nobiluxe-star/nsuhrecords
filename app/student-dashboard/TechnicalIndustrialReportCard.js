'use client';

import { supabase } from '../../lib/supabase';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
    case 1: return 'FIRST TERM';
    case 2: return 'SECOND TERM';
    case 3: return 'THIRD TERM';
    default: return `TERM ${termNumber}`;
  }
}

function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  return now.getMonth() >= 8 
    ? `${currentYear}/${currentYear + 1}` 
    : `${currentYear - 1}/${currentYear}`;
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

function cleanString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function TechnicalIndustrialReportContent() {
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
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);

      const schoolId = searchParams.get('school_id');
      const studentRowId = searchParams.get('row_id');
      const studentCode = searchParams.get('id') || searchParams.get('unique_code') || searchParams.get('code') || searchParams.get('student_id');
      const urlSchoolName = searchParams.get('school_name');

      if (!schoolId && !urlSchoolName && !studentCode) {
        setIsUnauthenticated(true);
        setIsLoading(false);
        return;
      }

      setIsUnauthenticated(false);

      if (schoolId) {
        await supabase.rpc('set_active_school', { school_id: schoolId });
      }

      // Fetch School Details
      let schoolQuery = supabase.from('school_details').select('*');
      if (schoolId) {
        schoolQuery = schoolQuery.eq('school_id', schoolId);
      } else if (urlSchoolName) {
        schoolQuery = schoolQuery.ilike('name', urlSchoolName);
      }

      // Fetch Student Profile
      let profileQuery = supabase.from('students').select('*');
      if (schoolId) {
        profileQuery = profileQuery.eq('school_id', schoolId);
      }
      if (studentRowId) {
        profileQuery = profileQuery.eq('id', studentRowId);
      } else if (studentCode) {
        profileQuery = profileQuery.or(`unique_code.eq."${studentCode}",code.eq."${studentCode}",student_id.eq."${studentCode}"`);
      }

      const [schoolRes, studentRes] = await Promise.all([
        schoolQuery.maybeSingle(),
        profileQuery.maybeSingle()
      ]);

      const schoolData = schoolRes.data;
      const effectiveSchoolId = schoolId || schoolData?.school_id || studentRes.data?.school_id;

      if (schoolData) {
        setSchoolName(urlSchoolName || schoolData.name || schoolData.institution_name || schoolData.school_name || '');
        const rawRegion = schoolData.region || schoolData.school_region || '';
        if (rawRegion && rawRegion.trim() !== '') {
          const cleanReg = rawRegion.toUpperCase().replace(/^REGIONAL DELEGATION OF SECONDARY EDUCATION FOR THE\s*/i, '').replace(/^REGIONAL DELEGATION OF SECONDARY EDUCATION\s*/i, '').replace(/^FOR THE\s*/i, '').trim();
          setSchoolRegion(`REGIONAL DELEGATION OF SECONDARY EDUCATION FOR THE ${cleanReg}`);
        } else {
          setSchoolRegion('REGIONAL DELEGATION OF SECONDARY EDUCATION');
        }
        setSchoolAddress(schoolData.address || schoolData.location || '—');
        setAcademicYear(schoolData.academic_year || getCurrentAcademicYear());
        setSchoolMotto(schoolData.motto || schoolData.school_motto || '');
        setAppDeveloper(schoolData.app_developer_credit || '');
        setSchoolLogo(schoolData.logo_url || schoolData.logo || '');
        setSchoolPhone(schoolData.contact_line || schoolData.phone || '—');
        setSchoolEmail(schoolData.official_email || schoolData.email || '—');
      } else {
        setAcademicYear(getCurrentAcademicYear());
        setSchoolRegion('REGIONAL DELEGATION OF SECONDARY EDUCATION');
      }

      const profile = studentRes.data;
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const activeClass = (profile.classLevel || profile.class_level || profile.class_name || profile.class || profile.class_grade || '').trim();
      const activeSeries = (profile.trades_series || profile.series || profile.trade || profile.specialty || profile.trade_series || '').trim();
      const activeStudentId = profile.id;
      const activeCode = profile.unique_code || profile.code || profile.student_id || studentCode || '';
      const termString = `Term ${activeTerm}`;

      setStudentData({
        ...profile,
        display_name: profile.fullName || profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        display_class: activeClass,
        display_section: profile.section || profile.academic_section || profile.education_type || 'Technical Industrial (IND)',
        display_series: activeSeries || '—',
        photo_url: profile.picture || profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null,
        matricule: activeCode
      });

      // Data Queries
      let coeffQuery = supabase.from('class_coefficients').select('*');
      let studentsQuery = supabase.from('students').select('*');
      let teachersQuery = supabase.from('teachers').select('*');
      let marksQuery = supabase.from('marks').select('*');

      if (effectiveSchoolId) {
        coeffQuery = coeffQuery.eq('school_id', effectiveSchoolId);
        studentsQuery = studentsQuery.eq('school_id', effectiveSchoolId);
        teachersQuery = teachersQuery.eq('school_id', effectiveSchoolId);
        marksQuery = marksQuery.eq('school_id', effectiveSchoolId);
      }

      let feesQuery = supabase.from('bursar_fees').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`);
      let disciplineQuery = supabase.from('discipline_summaries').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`);
      let remarksQuery = supabase.from('principal_remarks').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`);

      if (effectiveSchoolId) {
        feesQuery = feesQuery.eq('school_id', effectiveSchoolId);
        disciplineQuery = disciplineQuery.eq('school_id', effectiveSchoolId);
        remarksQuery = remarksQuery.eq('school_id', effectiveSchoolId);
      }

      const [allCoeffsRes, allStudentsRes, teachersRes, classMarksRes, feesRes, disciplineRes, remarksRes] = await Promise.all([
        coeffQuery,
        studentsQuery,
        teachersQuery,
        marksQuery,
        feesQuery.maybeSingle(),
        disciplineQuery.maybeSingle(),
        remarksQuery.maybeSingle()
      ]);

      const allCoeffs = allCoeffsRes.data || [];
      const allStudents = allStudentsRes.data || [];
      const teachersData = teachersRes.data || [];
      const rawMarks = classMarksRes.data || [];

      // Flexible Class Coefficient Matching
      const cleanActiveClass = cleanString(activeClass);
      const cleanActiveSeries = cleanString(activeSeries);

      let matchedCoeffRow = allCoeffs.find((row) => {
        const rowClass = cleanString(row.classLevel || row.class_level || row.class_name || row.class);
        const rowSeries = cleanString(row.trades_series || row.series || row.trade || row.specialty || row.trade_series || row.section);
        
        const classMatches = rowClass === cleanActiveClass || cleanActiveClass.includes(rowClass) || rowClass.includes(cleanActiveClass);
        const seriesMatches = !cleanActiveSeries || rowSeries === cleanActiveSeries || cleanActiveSeries.includes(rowSeries) || rowSeries.includes(cleanActiveSeries);

        return classMatches && seriesMatches;
      });

      if (!matchedCoeffRow) {
        matchedCoeffRow = allCoeffs.find((row) => {
          const rowClass = cleanString(row.classLevel || row.class_level || row.class_name || row.class);
          return rowClass === cleanActiveClass || cleanActiveClass.includes(rowClass) || rowClass.includes(cleanActiveClass);
        });
      }

      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return '—';
        const cleanSub = cleanString(subjectName);

        const match = teachersData.find((t) => {
          const assignedClasses = t.assigned_classes || t.classes || t.class_level || [];
          let classMatches = false;
          if (Array.isArray(assignedClasses)) {
            classMatches = assignedClasses.some(c => cleanString(c) === cleanActiveClass);
          } else {
            classMatches = cleanString(assignedClasses) === cleanActiveClass;
          }

          const rawSubs = t.subjects || t.subject || [];
          let subjectMatches = false;
          if (Array.isArray(rawSubs)) {
            subjectMatches = rawSubs.some((s) => cleanString(s) === cleanSub);
          } else {
            subjectMatches = cleanString(rawSubs) === cleanSub;
          }

          return classMatches && subjectMatches;
        });

        return match ? (match.name || match.fullName || match.full_name || '—') : '—';
      };

      let loadedSubjects = [];
      if (matchedCoeffRow) {
        let rawSubs = matchedCoeffRow.subject_coefficients || matchedCoeffRow.subjects || matchedCoeffRow.subject_list;
        if (typeof rawSubs === 'string') {
          try { rawSubs = JSON.parse(rawSubs); } catch (e) { rawSubs = null; }
        }

        if (Array.isArray(rawSubs)) {
          rawSubs.forEach((item, idx) => {
            const sName = item.name || item.subject_name || item.subject_code || item.title || '';
            const coefVal = Number(item.coefficient || item.coeff || item.coef || item.weight || 1);
            const categoryVal = item.category || item.group || item.type || 'Industrial Subjects';
            const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

            if (sName) {
              loadedSubjects.push({
                id: item.id || `${sName}-${idx}`,
                subject_name: sName,
                category: categoryVal,
                coefficient: coefVal,
                instructor: instructorName
              });
            }
          });
        }
      }
      setSubjects(loadedSubjects);

      // Enrolment & Ranking
      const seriesStudents = allStudents.filter(s => {
        const cVal = cleanString(s.classLevel || s.class_level || s.class_name || s.class);
        const sVal = cleanString(s.trades_series || s.series || s.trade || s.specialty || s.trade_series || s.section);
        
        const isClassMatch = cVal === cleanActiveClass || cleanActiveClass.includes(cVal) || cVal.includes(cleanActiveClass);
        const isSeriesMatch = !cleanActiveSeries || sVal === cleanActiveSeries || cleanActiveSeries.includes(sVal) || sVal.includes(cleanActiveSeries);
        
        return isClassMatch && isSeriesMatch;
      });
      setTotalStudents(seriesStudents.length > 0 ? seriesStudents.length : allStudents.length);

      const classMarksList = rawMarks.filter(m => {
        const mTerm = cleanString(m.term);
        return mTerm === cleanString(termString) || mTerm === String(activeTerm);
      });

      const scoreLookup = {};
      const rankLookup = {};

      const currentStudentMarks = classMarksList.filter(m => 
        (activeStudentId && String(m.student_id) === String(activeStudentId)) ||
        (activeCode && (m.unique_code === activeCode || m.code === activeCode))
      );

      currentStudentMarks.forEach((m) => {
        const key = cleanString(m.subject_name || m.subject_code);
        scoreLookup[key] = m.term_score ?? m.score ?? m.mark ?? m.marks;
        if (m.subject_rank || m.rank) {
          rankLookup[key] = m.subject_rank || m.rank;
        }
      });

      loadedSubjects.forEach((sub) => {
        const subKey = cleanString(sub.subject_name);
        if (!rankLookup[subKey]) {
          const subScores = classMarksList
            .filter(m => cleanString(m.subject_name || m.subject_code) === subKey)
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

      let computedRank = null;
      let computedClassAvg = null;

      if (allStudents.length > 0 && loadedSubjects.length > 0) {
        const studentAverages = [];

        (seriesStudents.length > 0 ? seriesStudents : allStudents).forEach(st => {
          let sPts = 0;
          let sCoef = 0;
          let sHasMarks = false;

          const stMarks = classMarksList.filter(m => 
            (st.id && String(m.student_id) === String(st.id)) ||
            (st.unique_code && (m.unique_code === st.unique_code || m.code === st.unique_code))
          );

          loadedSubjects.forEach(sub => {
            const subKey = cleanString(sub.subject_name);
            const coef = sub.coefficient;
            const match = stMarks.find(m => cleanString(m.subject_name || m.subject_code) === subKey);
            const val = match ? Number(match.term_score ?? match.score ?? match.mark ?? match.marks) : NaN;

            if (!isNaN(val)) {
              sHasMarks = true;
              sPts += val * coef;
              sCoef += coef;
            }
          });

          if (sHasMarks && sCoef > 0) {
            studentAverages.push({
              id: st.id,
              unique_code: st.unique_code || st.code || st.student_id,
              avg: sPts / sCoef
            });
          }
        });

        if (studentAverages.length > 0) {
          const totalAvgSum = studentAverages.reduce((sum, item) => sum + item.avg, 0);
          computedClassAvg = (totalAvgSum / studentAverages.length).toFixed(2);

          studentAverages.sort((a, b) => b.avg - a.avg);
          const myIndex = studentAverages.findIndex(item => 
            (activeStudentId && String(item.id) === String(activeStudentId)) ||
            (activeCode && item.unique_code === activeCode)
          );

          if (myIndex !== -1) {
            computedRank = myIndex + 1;
          }
        }
      }

      setStudentRank(computedRank);
      setClassAverage(computedClassAvg);

      setFeesRecord(feesRes.data || null);
      setDisciplineRecord(disciplineRes.data || null);
      setAdminRemarks(remarksRes.data || null);

      setIsLoading(false);
    }

    loadReportData();
  }, [activeTerm, searchParams, router]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Report link copied!');
    }
  };

  let totalPoints = 0;
  let totalCoef = 0;
  let hasAnyMarks = false;

  subjects.forEach((sub) => {
    const subKey = cleanString(sub.subject_name);
    const score = marksMap[subKey];
    const coef = Number(sub.coefficient || 1);

    if (score !== undefined && score !== null && score !== '' && !isNaN(Number(score))) {
      hasAnyMarks = true;
      totalPoints += Number(score) * coef;
      totalCoef += coef;
    }
  });

  const termAverage = totalCoef > 0 && hasAnyMarks ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'PASSED' : 'FAILED') : null;

  const paidAmount = Number(feesRecord?.fees_paid || feesRecord?.amount_paid || 0);
  const balanceAmount = Number(feesRecord?.fee_balance || feesRecord?.balance || 0);
  const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
  const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#E6DCCF] max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-[#3D2314]">Authentication Required</h2>
          <p className="text-xs text-slate-600">Please provide a valid URL with school_id and student unique code parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D3748] p-2 sm:p-6 print:p-0 print:bg-white print:m-0 flex flex-col items-center">
      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          html, body {
            width: 210mm;
            height: 297mm;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            padding: 10mm 12mm !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Top Controls Header */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-4 no-print">
        <a href="/" className="text-xs font-semibold text-[#3D2314] hover:underline">&larr; Back to Portal</a>
        <div className="flex space-x-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-[#3D2314] text-white rounded-xl text-xs font-bold hover:bg-[#5C3821] transition shadow-md">Print Report Card</button>
          <button onClick={handleShare} className="px-4 py-2 bg-[#5C3821] text-white rounded-xl text-xs font-bold hover:bg-[#3D2314] transition shadow-md">Share Link</button>
        </div>
      </div>

      {/* Strict A4 Document Frame */}
      <div className="print-a4-page bg-white border border-[#E6DCCF] rounded-3xl p-5 sm:p-7 shadow-xl space-y-3.5 w-full max-w-[210mm] box-border">
        
        {/* Header Banner */}
        <div className="border border-[#E6DCCF] bg-[#FAF7F2] rounded-2xl p-2.5 shadow-sm flex items-center gap-3">
          <div className="w-20 h-20 border border-[#E6DCCF] rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
            {schoolLogo ? <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" /> : <span className="text-[9px] font-bold text-slate-400 text-center uppercase">LOGO</span>}
          </div>
          
          <div className="flex-1 border border-[#E6DCCF] rounded-xl bg-white divide-y divide-[#E6DCCF] text-center">
            <div className="py-1 px-2">
              <h1 className="text-base sm:text-lg font-black text-[#3D2314] uppercase tracking-tight">{schoolName || 'GREAT COLLEGE ACADEMY'}</h1>
              <p className="text-[9px] font-semibold text-[#5C3821]">Academic Year: {academicYear || getCurrentAcademicYear()}</p>
            </div>

            <div className="py-0.5 px-2">
              <p className="text-[9px] font-bold text-[#3D2314] uppercase tracking-wide">{schoolRegion}</p>
            </div>

            <div className="py-0.5 px-2 text-[9px] font-bold text-[#3D2314] flex justify-center items-center gap-2 flex-wrap">
              <span>Address: {schoolAddress}</span>
              <span className="text-slate-300 font-normal">|</span>
              <span>Tel: {schoolPhone}</span>
              <span className="text-slate-300 font-normal">|</span>
              <span>Email: {schoolEmail}</span>
            </div>
          </div>
        </div>

        {schoolMotto && (
          <div className="py-1 px-3 bg-[#FAF7F2] border border-[#E6DCCF] rounded-xl text-center">
            <p className="text-xs font-serif italic font-bold text-[#3D2314]">Motto: "{schoolMotto}"</p>
          </div>
        )}

        {/* SECTION / REPORT CARD TYPE BANNER */}
        <div className="bg-[#3D2314] text-white py-2 px-4 rounded-full text-center shadow-sm">
          <h2 className="text-xs sm:text-sm font-black italic tracking-widest uppercase">
            TECHNICAL INDUSTRIAL (IND) — {getOrdinalTermWord(activeTerm)} REPORT CARD
          </h2>
        </div>

        {/* Student Profile Info Card */}
        <div className="border border-[#E6DCCF] bg-[#FAF7F2] rounded-2xl p-3 flex gap-4 items-center">
          <div className="w-20 h-24 rounded-xl bg-white border border-[#E6DCCF] flex items-center justify-center shrink-0 overflow-hidden">
            {studentData?.photo_url ? (
              <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-slate-400 font-medium text-center">No Image</span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3 text-xs">
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">FULL NAME</span>
              <strong className="text-slate-900 font-extrabold text-xs block truncate">{studentData?.display_name || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">CLASS</span>
              <strong className="text-slate-900 font-bold block text-xs truncate">{studentData?.display_class || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">SECTION</span>
              <strong className="text-slate-900 font-bold block text-xs truncate">{studentData?.display_section || 'Technical Industrial (IND)'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">TRADE / SPECIALTY</span>
              <strong className="text-slate-900 font-bold block text-xs truncate">{studentData?.display_series || '—'}</strong>
            </div>

            <div className="col-span-2">
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">MATRICULE (UNIQUE ID)</span>
              <strong className="text-[#3D2314] font-mono font-bold block text-xs">{studentData?.matricule || '—'}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">FEES PAID</span>
              <strong className="text-emerald-700 font-bold block text-xs">{displayPaid}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">FEE BALANCE</span>
              <strong className="text-red-600 font-bold block text-xs">{displayBalance}</strong>
            </div>
          </div>
        </div>

        {/* Term Switcher & Class Stats Header */}
        <div className="flex justify-between items-center border-b border-[#E6DCCF] pb-1">
          <div className="flex space-x-6 no-print">
            {[1, 2, 3].map((term) => (
              <button
                key={term}
                onClick={() => setActiveTerm(term)}
                className={`py-1 text-xs font-bold transition border-b-2 ${
                  activeTerm === term ? 'border-[#3D2314] text-[#3D2314]' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Term {term}
              </button>
            ))}
          </div>
          <div className="text-[11px] font-bold text-slate-600">
            Trade Specialty Enrolment: <span className="text-[#3D2314]">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span>
          </div>
        </div>

        {/* Subject Scores Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#3D2314] text-white uppercase text-[9px] font-bold">
                <th className="py-2 px-2.5 rounded-l-lg">SUBJECT NAME</th>
                <th className="py-2 px-2.5">CATEGORY</th>
                <th className="py-2 px-2.5 text-center">COEF</th>
                <th className="py-2 px-2.5 text-center">SCORE (/20)</th>
                <th className="py-2 px-2.5 text-center">TOTAL</th>
                <th className="py-2 px-2.5 text-center">GRADE</th>
                <th className="py-2 px-2.5 text-center">RANK</th>
                <th className="py-2 px-2.5 rounded-r-lg">INSTRUCTOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan="8" className="p-3 text-center text-slate-400 animate-pulse">Loading grades...</td></tr>
              ) : subjects.length === 0 ? (
                <tr><td colSpan="8" className="p-3 text-center text-slate-400 italic">No configured subjects found for this class in class_coefficients table.</td></tr>
              ) : (
                subjects.map((sub, idx) => {
                  const subName = sub.subject_name;
                  const subKey = cleanString(subName);
                  const score = marksMap[subKey];
                  const coef = Number(sub.coefficient || 1);

                  const scoreNum = Number(score);
                  const isScoreValid = score !== undefined && score !== null && score !== '' && !isNaN(scoreNum);
                  
                  const totalScoreVal = isScoreValid ? (scoreNum * coef).toFixed(1) : null;
                  const calculatedGrade = isScoreValid ? calculateIndustrialGrade(scoreNum) : '—';
                  const rawRank = subjectRanksMap[subKey];
                  const formattedRank = rawRank ? getOrdinalSuffix(rawRank) : '—';

                  return (
                    <tr key={sub.id || `${subKey}-${idx}`} className="hover:bg-[#FAF7F2] border-b border-[#E6DCCF]/50">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900">{subName}</td>
                      <td className="py-1.5 px-2.5 text-slate-600 font-medium text-[10px]">{sub.category || 'Industrial Subjects'}</td>
                      <td className="py-1.5 px-2.5 text-center font-bold text-slate-800">{coef}</td>
                      <td className={`py-1.5 px-2.5 text-center font-black ${isScoreValid ? (scoreNum < 10 ? 'text-red-600' : 'text-blue-700') : 'text-slate-400'}`}>
                        {isScoreValid ? scoreNum : '—'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-black text-slate-900">{totalScoreVal !== null ? totalScoreVal : '—'}</td>
                      <td className="py-1.5 px-2.5 text-center font-black text-slate-800">{calculatedGrade}</td>
                      <td className="py-1.5 px-2.5 text-center font-bold text-slate-700">{formattedRank}</td>
                      <td className="py-1.5 px-2.5 text-slate-600 truncate max-w-[120px]">{sub.instructor || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Horizontal Summary Bar */}
        <div className="bg-[#3D2314] text-white rounded-xl p-2.5 flex justify-around items-center text-center shadow-md">
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">TOTAL POINTS</span>
            <strong className="text-xs font-extrabold">{hasAnyMarks ? totalPoints.toFixed(1) : '—'}</strong>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">STUDENT AVERAGE</span>
            <strong className="text-xs font-extrabold">{termAverage ? `${termAverage} / 20` : '—'}</strong>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">CLASS RANK</span>
            <strong className="text-xs font-extrabold">{studentRank ? getOrdinalSuffix(studentRank) : '—'}</strong>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">CLASS AVERAGE</span>
            <strong className="text-xs font-extrabold">{classAverage ? `${classAverage} / 20` : '—'}</strong>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">STATUS</span>
            <strong className={`text-xs font-black ${termStatus === 'PASSED' ? 'text-emerald-400' : termStatus === 'FAILED' ? 'text-red-400' : ''}`}>
              {termStatus || '—'}
            </strong>
          </div>
        </div>

        {/* Discipline & Principal Remarks Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Discipline & Attendance */}
          <div className="bg-[#FAF7F2] border border-[#E6DCCF] rounded-2xl p-3 space-y-1.5">
            <h3 className="font-extrabold text-[#3D2314] text-[10px] uppercase tracking-wider">DISCIPLINE & ATTENDANCE</h3>
            <div className="text-[11px] space-y-0.5 text-slate-700">
              <div className="flex justify-between">
                <span>Unjustified Absences:</span>
                <strong className="font-bold">{disciplineRecord?.unjustified_absences ?? 0} hrs</strong>
              </div>
              <div className="flex justify-between">
                <span>Tardiness:</span>
                <strong className="font-bold">{disciplineRecord?.tardiness ?? 0} times</strong>
              </div>
              <div className="pt-1 italic text-[#5C3821] font-semibold text-[10px]">
                {disciplineRecord?.conduct_rating ? `Conduct: ${disciplineRecord.conduct_rating}` : 'Conduct Satisfactory.'}
              </div>
            </div>
          </div>

          {/* Principal Remarks */}
          <div className="bg-[#FAF7F2] border border-[#E6DCCF] rounded-2xl p-3 space-y-1.5">
            <h3 className="font-extrabold text-[#3D2314] text-[10px] uppercase tracking-wider">PRINCIPAL REMARKS</h3>
            <p className="text-[11px] italic text-slate-700 min-h-[36px]">
              {adminRemarks?.remark || adminRemarks?.principal_remark || disciplineRecord?.remarks || '—'}
            </p>
          </div>

        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-6 pt-3 pb-1 text-center text-[10px] font-bold text-[#3D2314]">
          <div className="space-y-5">
            <span className="uppercase tracking-wider">CLASS MASTER SIGNATURE</span>
            <div className="border-b border-dashed border-slate-300 w-2/3 mx-auto"></div>
          </div>
          <div className="space-y-5">
            <span className="uppercase tracking-wider">PRINCIPAL SIGNATURE & STAMP</span>
            <div className="border-b border-dashed border-slate-300 w-2/3 mx-auto"></div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="border-t border-[#E6DCCF] pt-1 flex justify-between items-center text-[8px] text-slate-400">
          <span>Powered by NsuhRecords Engine</span>
          <span>{appDeveloper ? `Developer Credit: ${appDeveloper}` : 'Official Academic Document'}</span>
        </div>

      </div>
    </div>
  );
}

export default function TechnicalIndustrialReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 text-xs font-bold text-[#3D2314]">Loading Report Card...</div>}>
      <TechnicalIndustrialReportContent />
    </Suspense>
  );
}