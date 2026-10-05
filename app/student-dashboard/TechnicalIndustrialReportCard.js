'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

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

function TechnicalIndustrialReportContent(props) {
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
  const [announcements, setAnnouncements] = useState([]);
  const [adminRemarks, setAdminRemarks] = useState(null);
  const [appDeveloper, setAppDeveloper] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [isWrongSection, setIsWrongSection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Safely extract parameter overrides
  const overrideSchoolId = props?.overrideSchoolId || props?.student?.school_id || props?.schoolInfo?.school_id;
  const overrideStudentRowId = props?.overrideStudentRowId || props?.student?.id || props?.student?.row_id;
  const overrideStudentCode = props?.overrideStudentCode || props?.student?.unique_code || props?.student?.code || props?.student?.student_id || props?.student?.matricule;

  const loadReportData = useCallback(async () => {
    setIsLoading(true);

    // --- INSTANT BULK HYDRATION (0ms Delay if pre-fetched props exist) ---
    if (props?.student || props?.initialStudent) {
      const st = props.student || props.initialStudent;
      const school = props.schoolInfo || {};

      setSchoolName(school.name || school.institution_name || school.school_name || '');
      setSchoolRegion(school.region || '');
      setSchoolAddress(school.address_location || school.address || school.location || '');
      setAcademicYear(school.academic_year || '');
      setSchoolMotto(school.motto || school.school_motto || '');
      setAppDeveloper(school.app_developer_credit || '');
      setSchoolLogo(school.logo_url || school.logo || '');
      setSchoolPhone(school.contact_line || school.phone || '');
      setSchoolEmail(school.official_email || school.email || '');

      const sectionVal = st.section || st.academic_section || st.education_type || 'Technical Industrial (IND)';
      setStudentData({
        ...st,
        display_name: st.fullName || st.full_name || st.name || st.student_name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
        display_class: (st.classLevel || st.class_grade || st.class_level || st.class_name || st.class || props.activeClass || '—').trim(),
        display_section: sectionVal,
        display_series: st.trades_series || st.series || st.trade || st.specialty || st.trade_series || '—',
        photo_url: st.picture || st.photo_url || st.avatar_url || st.student_photo || st.image_url || null,
        matricule: st.unique_code || st.code || st.student_id || st.matricule || '—'
      });

      if (Array.isArray(props.subjects) && props.subjects.length > 0) {
        setSubjects(props.subjects);
      }
      if (props.marks) {
        setMarksMap(props.marks);
      }

      setIsLoading(false);
      if (props.subjects && props.marks) return;
    }

    // --- SINGLE URL VIEW FALLBACK (2-Batch Parallel Execution) ---
    const schoolId = overrideSchoolId || searchParams.get('school_id');
    const studentRowId = overrideStudentRowId || searchParams.get('row_id');
    const studentCode = overrideStudentCode || searchParams.get('id') || searchParams.get('unique_code') || searchParams.get('code');
    const urlSchoolName = searchParams.get('school_name');

    if (!schoolId && !urlSchoolName && !studentRowId && !studentCode) {
      setIsUnauthenticated(true);
      setIsLoading(false);
      return;
    }

    setIsUnauthenticated(false);

    if (schoolId) {
      await supabase.rpc('set_active_school', { school_id: schoolId });
    }

    // ==========================================
    // PARALLEL BATCH 1: Fetch School Details & Student Profile
    // ==========================================
    let schoolQuery = supabase.from('school_details').select('*');
    if (schoolId) {
      schoolQuery = schoolQuery.eq('school_id', schoolId);
    } else if (urlSchoolName) {
      schoolQuery = schoolQuery.ilike('name', urlSchoolName);
    }

    let profileQuery = supabase.from('students').select('*');
    if (studentRowId) {
      profileQuery = profileQuery.eq('id', studentRowId);
    } else if (studentCode) {
      profileQuery = profileQuery.or(`unique_code.eq."${studentCode}",code.eq."${studentCode}",student_id.eq."${studentCode}",id.eq."${studentCode}"`);
    }
    if (schoolId) {
      profileQuery = profileQuery.eq('school_id', schoolId);
    }

    const [schoolRes, profileRes] = await Promise.all([
      schoolQuery.maybeSingle(),
      profileQuery.maybeSingle()
    ]);

    const schoolData = schoolRes.data;
    if (schoolData) {
      setSchoolName(urlSchoolName || schoolData.name || schoolData.institution_name || schoolData.school_name || '');
      setSchoolRegion(schoolData.region || '');
      setSchoolAddress(schoolData.address_location || schoolData.address || schoolData.location || '');
      setAcademicYear(schoolData.academic_year || '');
      setSchoolMotto(schoolData.motto || schoolData.school_motto || '');
      setAppDeveloper(schoolData.app_developer_credit || '');
      setSchoolLogo(schoolData.logo_url || schoolData.logo || '');
      setSchoolPhone(schoolData.contact_line || schoolData.phone || '');
      setSchoolEmail(schoolData.official_email || schoolData.email || '');
    }

    const profile = profileRes.data;
    if (!profile) {
      setStudentData(null);
      setIsLoading(false);
      return;
    }

    const sectionVal = profile.section || profile.academic_section || profile.education_type || '';
    const sectionLower = sectionVal.toLowerCase();
    if (!sectionLower.includes('technical industrial') && !sectionLower.includes('industrial') && !sectionLower.includes('ind')) {
      setIsWrongSection(true);
      setIsLoading(false);
      return;
    }

    setIsWrongSection(false);

    const effectiveSchoolId = profile.school_id || schoolId;
    const activeClass = (profile.classLevel || profile.class_grade || profile.class_level || profile.class_name || profile.class || '').trim();
    const activeSeries = (profile.trades_series || profile.series || profile.trade || profile.specialty || profile.trade_series || '').trim();
    const activeStudentRowId = profile.id;
    const activeCode = profile.unique_code || profile.code || profile.student_id || studentCode;
    const termString = `Term ${activeTerm}`;

    setStudentData({
      ...profile,
      display_name: profile.fullName || profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      display_class: activeClass || '—',
      display_section: sectionVal || 'Technical Industrial (IND)',
      display_series: activeSeries || '—',
      photo_url: profile.picture || profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null,
      matricule: activeCode
    });

    // ==========================================
    // PARALLEL BATCH 2: Enrolment, Coefficients, Teachers, Marks, Fees, Discipline, Announcements & Remarks
    // ==========================================
    let countQuery = supabase.from('students').select('*');
    let subQ = supabase.from('class_coefficients').select('*').eq('is_included', true);
    let teachersQ = supabase.from('teachers').select('*');
    let markQ = supabase.from('marks').select('*');
    let feesQ = supabase.from('bursar_fees').select('*').or(`student_id.eq."${activeStudentRowId}",unique_code.eq."${activeCode}"`);
    let discQ = supabase.from('discipline_summaries').select('*').or(`student_id.eq."${activeStudentRowId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);
    let annoQ = supabase.from('principal_announcements').select('*').order('created_at', { ascending: false }).limit(3);
    let remQ = supabase.from('principal_remarks').select('*').or(`student_id.eq."${activeStudentRowId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);

    if (effectiveSchoolId) {
      countQuery = countQuery.eq('school_id', effectiveSchoolId);
      subQ = subQ.eq('school_id', effectiveSchoolId);
      teachersQ = teachersQ.eq('school_id', effectiveSchoolId);
      markQ = markQ.eq('school_id', effectiveSchoolId);
      feesQ = feesQ.eq('school_id', effectiveSchoolId);
      discQ = discQ.eq('school_id', effectiveSchoolId);
      annoQ = annoQ.eq('school_id', effectiveSchoolId);
      remQ = remQ.eq('school_id', effectiveSchoolId);
    }

    const [
      allClassStudentsRes,
      subRes,
      teachersRes,
      markRes,
      feesRes,
      discRes,
      annoRes,
      remarksRes
    ] = await Promise.all([
      countQuery,
      subQ,
      teachersQ,
      markQ,
      feesQ.maybeSingle(),
      discQ.maybeSingle(),
      annoQ,
      remQ.maybeSingle()
    ]);

    // Process Trade-Based Enrolment Count
    const allStudents = allClassStudentsRes.data || [];
    const classTradeStudents = allStudents.filter(s => {
      const cVal = (s.classLevel || s.class_level || s.class_name || s.class || '').trim().toLowerCase();
      const sTrade = (s.trades_series || s.series || s.trade || s.specialty || s.trade_series || '').trim().toLowerCase();
      const isClassMatch = cVal === activeClass.toLowerCase();
      const isTradeMatch = !activeSeries || !sTrade || sTrade === activeSeries.toLowerCase();
      return isClassMatch && isTradeMatch;
    });
    setTotalStudents(classTradeStudents.length || null);

    // Process Subjects & Instructor Assignment
    const teachersData = teachersRes.data || [];
    const allCoeffRows = subRes.data || [];
    const matchedCoeffRow = allCoeffRows.find(row => {
      const rClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
      return rClass === activeClass.toLowerCase();
    });

    const getTeacherForSubject = (subjectName) => {
      if (!subjectName) return '—';
      const cleanSub = subjectName.toLowerCase().trim();
      const match = teachersData.find(t => {
        const rawSubs = t.subjects || t.subject || [];
        if (Array.isArray(rawSubs)) return rawSubs.some(s => typeof s === 'string' && s.toLowerCase().trim() === cleanSub);
        if (typeof rawSubs === 'string') return rawSubs.toLowerCase().trim() === cleanSub;
        return false;
      });
      return match ? (match.name || match.fullName || match.full_name || '—') : '—';
    };

    let loadedSubjects = [];
    if (matchedCoeffRow) {
      let rawSubs = matchedCoeffRow.subject_coefficients;
      if (typeof rawSubs === 'string') {
        try { rawSubs = JSON.parse(rawSubs); } catch (e) { rawSubs = null; }
      }
      if (Array.isArray(rawSubs)) {
        rawSubs.forEach((item) => {
          const sName = item.name || item.subject_name || item.subject_code || '';
          const coefVal = Number(item.coefficient || item.coeff || item.coef || item.weight || 1);
          const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

          loadedSubjects.push({
            id: item.id || `${sName}-${coefVal}`,
            subject_name: sName,
            coefficient: coefVal,
            resolved_instructor: instructorName
          });
        });
      }
    }
    setSubjects(loadedSubjects);

    // Process Marks & Ranks
    const rawMarks = markRes.data || [];
    const classMarksList = rawMarks.filter(m => {
      const mTerm = String(m.term || '').trim().toLowerCase();
      return mTerm === termString.toLowerCase() || mTerm === String(activeTerm);
    });

    const scoreLookup = {};
    const rankLookup = {};

    const currentStudentMarks = classMarksList.filter(m => 
      (activeStudentRowId && String(m.student_id) === String(activeStudentRowId)) ||
      (activeCode && (m.unique_code === activeCode || m.code === activeCode))
    );

    currentStudentMarks.forEach((m) => {
      const sKey = (m.subject_name || m.subject_code || '').toLowerCase().trim();
      scoreLookup[sKey] = m.term_score ?? m.score ?? m.mark ?? m.marks;
      if (m.subject_rank || m.rank) {
        rankLookup[sKey] = m.subject_rank || m.rank;
      }
    });

    // Dynamic Subject Rank Calculation
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

    // Compute Overall Rank & Class Avg across Trade Students
    let computedRank = null;
    let computedClassAvg = null;

    if (classTradeStudents.length > 0 && loadedSubjects.length > 0) {
      const studentAverages = [];

      classTradeStudents.forEach(st => {
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
          (activeStudentRowId && String(item.id) === String(activeStudentRowId)) ||
          (activeCode && item.unique_code === activeCode)
        );

        if (myIndex !== -1) {
          computedRank = myIndex + 1;
        }
      }
    }

    setStudentRank(computedRank);
    setClassAverage(computedClassAvg);

    // Set Ancillary Records
    setFeesRecord(feesRes.data || null);
    setDisciplineRecord(discRes.data || null);
    setAnnouncements(annoRes.data || []);
    setAdminRemarks(remarksRes.data || null);
    setIsLoading(false);
  }, [activeTerm, searchParams, router, overrideSchoolId, overrideStudentRowId, overrideStudentCode]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/student-dashboard${window.location.search}`;
      navigator.clipboard.writeText(link);
      alert('Technical Industrial Report Card link copied!');
    }
  };

  let totalPoints = 0;
  let totalCoef = 0;
  let hasAnyMarks = false;

  subjects.forEach((sub) => {
    const subKey = sub.subject_name.toLowerCase().trim();
    const score = marksMap[subKey];
    const coef = Number(sub.coefficient || 1);
    if (score !== undefined && score !== null && score !== '' && !isNaN(Number(score))) {
      hasAnyMarks = true;
      totalPoints += Number(score) * coef;
      totalCoef += coef;
    }
  });

  const termAverage = totalCoef > 0 && hasAnyMarks ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'Passed' : 'Failed') : null;

  const paidAmount = Number(feesRecord?.fees_paid || feesRecord?.amount_paid || 0);
  const balanceAmount = Number(feesRecord?.fee_balance || feesRecord?.balance || 0);
  const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
  const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-orange-200 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600">No valid student or school parameter was provided. Please log in through your institution's portal.</p>
        </div>
      </div>
    );
  }

  if (isWrongSection) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-orange-200 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">i</div>
          <h2 className="text-lg font-bold text-slate-900">Wrong Section Access</h2>
          <p className="text-xs text-slate-600">This report card is strictly restricted to Technical Industrial (IND) students.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-2 sm:p-6 print:p-0 print:bg-white">
      {/* Strict Single-Page A4 Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-a4-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-compact-table td, .print-compact-table th {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            font-size: 9.5px !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center no-print">
          <a href="/" className="text-xs font-semibold text-orange-900 hover:underline">
            &larr; Back to Portal
          </a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition">
              Print Report Card
            </button>
            <button onClick={handleShare} className="px-4 py-2 bg-orange-700 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition shadow-md shadow-orange-700/20">
              Share Report Link
            </button>
          </div>
        </div>

        {/* Dynamic Single A4 Report Card Container */}
        <div className="print-a4-container bg-white border border-orange-200 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3 text-xs">
          
          {/* Header Branding */}
          <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-2.5 flex flex-row items-center gap-3">
            <div className="w-20 h-20 border border-orange-200 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-slate-400 text-center uppercase">LOGO</span>
              )}
            </div>

            <div className="flex-1 border border-orange-200 rounded-lg bg-white divide-y divide-orange-200 text-center">
              {/* Line 1: School Name & Academic Year */}
              <div className="p-1.5">
                <h1 className="text-base sm:text-xl font-black text-orange-950 uppercase tracking-tight">
                  {schoolName || 'COLLEGE NAME'}
                </h1>
                {academicYear && (
                  <p className="text-[10px] font-semibold text-orange-700">
                    Academic Year: {academicYear}
                  </p>
                )}
              </div>

              {/* Line 2: Single-line Regional Delegation Title */}
              <div className="p-1 bg-orange-50/50">
                <p className="text-[10px] sm:text-xs font-black text-orange-950 uppercase tracking-tight whitespace-nowrap">
                  REGIONAL DELEGATION FOR SECONDARY EDUCATION
                  {schoolRegion && ` FOR THE ${schoolRegion.toUpperCase()}`}
                </p>
              </div>

              {/* Line 3: Phone, Email, Location in Uniform Theme Color */}
              <div className="p-1 flex justify-center items-center gap-x-4 text-[10px] font-bold text-orange-900 whitespace-nowrap">
                <span>Phone: {schoolPhone || '—'}</span>
                <span>Email: {schoolEmail || '—'}</span>
                {schoolAddress && <span>Location: {schoolAddress}</span>}
              </div>
            </div>
          </div>

          {/* School Motto Banner */}
          {schoolMotto && (
            <div className="p-1.5 bg-orange-50/50 border border-orange-200 rounded-xl text-center">
              <p className="text-xs font-serif italic font-bold text-orange-950">
                Motto: "{schoolMotto}"
              </p>
            </div>
          )}

          {/* Term Report Header */}
          <div className="p-1.5 bg-orange-100/60 border border-orange-200 rounded-xl text-center">
            <h2 className="text-xs font-serif italic font-black text-orange-950 uppercase tracking-wider">
              TECHNICAL INDUSTRIAL (IND) — {getOrdinalTermWord(activeTerm).toUpperCase()} REPORT CARD
            </h2>
          </div>

          {/* Student Profile & Financial Overview */}
          <div className="flex flex-row gap-4 items-center bg-orange-50/20 p-2.5 rounded-xl border border-orange-200 text-[11px]">
            <div className="w-16 h-16 rounded-xl bg-orange-100/50 border border-orange-200 flex items-center justify-center shrink-0 overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-orange-800/60 font-medium text-center">No Photo</span>
              )}
            </div>

            <div className="flex-1 grid grid-cols-4 gap-2">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Full Name</span>
                <strong className="text-slate-900 block truncate">{studentData?.display_name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Class</span>
                <strong className="text-slate-900 block">{studentData?.display_class || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Section</span>
                <strong className="text-orange-950 block truncate">{studentData?.display_section || 'Technical Industrial (IND)'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Trade / Specialty</span>
                <strong className="text-slate-900 block truncate">{studentData?.display_series || '—'}</strong>
              </div>

              <div className="col-span-2 border-t border-orange-100 pt-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Matricule (Unique ID)</span>
                <strong className="text-orange-900 font-mono block">{studentData?.matricule || '—'}</strong>
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

          {/* Term Switcher */}
          <div className="flex justify-between items-center border-b border-orange-200 no-print">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button 
                  key={term}
                  onClick={() => setActiveTerm(term)}
                  className={`px-4 py-1.5 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-orange-808 text-orange-950' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Term {term}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600">
              Class Enrolment: <span className="text-orange-950">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span>
            </div>
          </div>

          {/* Dynamic Marks Table */}
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-orange-200 rounded-lg overflow-hidden print-compact-table">
                <thead className="bg-orange-950 text-white uppercase text-[9px]">
                  <tr>
                    <th className="p-2">Subject Name</th>
                    <th className="p-2 text-center">Coef</th>
                    <th className="p-2 text-center">Score (/20)</th>
                    <th className="p-2 text-center">Total</th>
                    <th className="p-2 text-center">Grade</th>
                    <th className="p-2 text-center">Rank</th>
                    <th className="p-2">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="p-3 text-center text-slate-400 italic">Loading evaluation records...</td>
                    </tr>
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-3 text-center text-slate-400 italic">No configured subjects found for this class in class_coefficients table.</td>
                    </tr>
                  ) : (
                    subjects.map((sub, idx) => {
                      const subName = sub.subject_name || sub.name;
                      const subKey = subName.toLowerCase().trim();
                      const score = marksMap[subKey];
                      const coef = Number(sub.coefficient || 1);

                      const scoreNum = Number(score);
                      const isScoreValid = score !== undefined && score !== null && score !== '' && !isNaN(scoreNum);

                      const totalScoreVal = isScoreValid ? (scoreNum * coef).toFixed(1) : null;
                      const maxPossible = coef * 20;

                      const grade = isScoreValid ? (scoreNum >= 16 ? 'A' : scoreNum >= 14 ? 'B' : scoreNum >= 12 ? 'C' : scoreNum >= 10 ? 'D' : 'F') : '—';
                      const rawRank = subjectRanksMap[subKey];
                      const formattedRank = rawRank ? getOrdinalSuffix(rawRank) : '—';

                      return (
                        <tr key={sub.id || `${subKey}-${idx}`} className="hover:bg-orange-50/20">
                          <td className="p-1.5 font-bold text-slate-900">{subName}</td>
                          <td className="p-1.5 text-center font-bold">{coef}</td>
                          
                          {/* SCORE (/20): Fail (<10) in Red, Pass (>=10) in Blue */}
                          <td className={`p-1.5 text-center font-bold ${isScoreValid ? (scoreNum >= 10 ? 'text-blue-700' : 'text-red-600') : 'text-slate-400'}`}>
                            {isScoreValid ? `${scoreNum} / 20` : '—'}
                          </td>

                          {/* TOTAL MARKS: Fail (<10) in Red, Pass (>=10) in Blue */}
                          <td className={`p-1.5 text-center font-black ${totalScoreVal !== null ? (scoreNum >= 10 ? 'text-blue-700' : 'text-red-600') : 'text-slate-400'}`}>
                            {totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}
                          </td>

                          <td className="p-1.5 text-center font-black text-slate-800">{grade}</td>
                          <td className="p-1.5 text-center font-bold text-orange-900">{formattedRank}</td>
                          <td className="p-1.5 text-slate-600 truncate max-w-[130px]">{sub.resolved_instructor || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary Bar */}
          <div className="grid grid-cols-5 gap-2 bg-orange-950 text-white p-2.5 rounded-xl text-center">
            <div>
              <span className="text-[9px] text-orange-200 uppercase block font-semibold">Total Points</span>
              <strong className="text-xs sm:text-sm">{hasAnyMarks ? `${totalPoints.toFixed(1)} / ${totalCoef * 20}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-orange-200 uppercase block font-semibold">Student Average</span>
              <strong className="text-sm sm:text-base font-black text-amber-300">{termAverage ? `${termAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-orange-200 uppercase block font-semibold">Class Rank</span>
              <strong className="text-xs sm:text-sm">{studentRank ? getOrdinalSuffix(studentRank) : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-orange-200 uppercase block font-semibold">Class Average</span>
              <strong className="text-xs sm:text-sm">{classAverage ? `${classAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-orange-200 uppercase block font-semibold">Status</span>
              <strong className={`text-xs sm:text-sm font-bold ${termStatus === 'Passed' ? 'text-emerald-300' : termStatus === 'Failed' ? 'text-red-300' : 'text-slate-300'}`}>
                {termStatus || '—'}
              </strong>
            </div>
          </div>

          {/* Discipline & Principal Remarks Grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 bg-orange-50/20 border border-orange-200 rounded-xl space-y-0.5">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Discipline & Conduct</span>
              <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? 0} hrs</strong></p>
              <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{disciplineRecord?.latecomings || disciplineRecord?.tardiness || 0} times</strong></p>
              <p className="text-slate-700 italic text-[10px] mt-1">{disciplineRecord?.remarks || disciplineRecord?.punishments ? `"${disciplineRecord.remarks || disciplineRecord.punishments}"` : 'Conduct Satisfactory.'}</p>
            </div>
            <div className="p-2.5 bg-orange-50/20 border border-orange-200 rounded-xl space-y-0.5">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Principal Remarks</span>
              <p className="text-slate-700 italic text-[10px]">{adminRemarks?.remark_text || adminRemarks?.notice_text ? `"${adminRemarks.remark_text || adminRemarks.notice_text}"` : '—'}</p>
            </div>
          </div>

          {/* Announcements Section */}
          {announcements.length > 0 && (
            <div className="p-2.5 bg-orange-50/20 border border-orange-200 rounded-xl space-y-1 text-[10px]">
              <span className="font-extrabold text-slate-900 uppercase block">Announcements</span>
              {announcements.map((anno, idx) => (
                <div key={anno.id || idx} className="border-t border-orange-200 pt-1 first:border-t-0 first:pt-0">
                  <span className="font-bold text-slate-900">{anno.title}: </span>
                  <span className="text-slate-600">{anno.content || anno.announcement_text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Signatures & Endorsement Section */}
          <div className="pt-3 border-t border-orange-200 grid grid-cols-2 gap-8 text-[11px] text-center">
            <div className="space-y-6">
              <p className="font-bold text-slate-900 uppercase text-[10px]">Head of Industrial Department</p>
              <div className="border-b border-dashed border-orange-300 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-slate-900 uppercase text-[10px]">The Principal</p>
              <div className="border-b border-dashed border-orange-300 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
          </div>

        </div>

        {/* App Developer Footer Credit */}
        {appDeveloper && (
          <div className="text-center py-1 text-[10px] text-slate-500 font-medium no-print">
            {appDeveloper}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TechnicalIndustrialReportCard(props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">Loading Technical Industrial Report...</div>}>
      <TechnicalIndustrialReportContent {...props} />
    </Suspense>
  );
}
