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
    case 1: return 'First Term';
    case 2: return 'Second Term';
    case 3: return 'Third Term';
    default: return `Term ${termNumber}`;
  }
}

function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  return now.getMonth() >= 8 
    ? `${currentYear}/${currentYear + 1}` 
    : `${currentYear - 1}/${currentYear}`;
}

// Technical Commercial (STT) Grade Determination
function calculateCommercialGrade(score) {
  if (score === undefined || score === null || isNaN(Number(score))) return '—';
  const val = Number(score);
  if (val >= 16) return 'A';
  if (val >= 14) return 'B';
  if (val >= 12) return 'C';
  if (val >= 10) return 'D';
  return 'F';
}

function TechnicalCommercialReportContent(props) {
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

  // Extract primitive identifiers safely
  const overrideSchoolId = props?.overrideSchoolId || props?.student?.school_id || props?.schoolInfo?.school_id;
  const overrideStudentRowId = props?.overrideStudentRowId || props?.student?.id || props?.student?.row_id;
  const overrideStudentCode = props?.overrideStudentCode || props?.student?.unique_code || props?.student?.code || props?.student?.student_id || props?.student?.matricule;

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);

      // --- INSTANT BULK HYDRATION (0ms Delay if pre-fetched props exist) ---
      if (props?.student || props?.initialStudent) {
        const st = props.student || props.initialStudent;
        const school = props.schoolInfo || {};

        setSchoolName(school.name || school.institution_name || school.school_name || '');
        setSchoolRegion(school.region || '');
        setSchoolAddress(school.address_location || school.address || school.location || '');
        setAcademicYear(school.academic_year || getCurrentAcademicYear());
        setSchoolMotto(school.motto || school.school_motto || '');
        setAppDeveloper(school.app_developer_credit || '');
        setSchoolLogo(school.logo_url || school.logo || '');
        setSchoolPhone(school.contact_line || school.phone || '');
        setSchoolEmail(school.official_email || school.email || '');

        const sectionVal = st.section || st.academic_section || st.education_type || 'Technical Commercial (STT)';
        setStudentData({
          ...st,
          display_name: st.fullName || st.full_name || st.name || st.student_name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
          display_class: (st.classLevel || st.class_level || st.class_name || st.class || props.activeClass || '').trim(),
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
      // PARALLEL BATCH 1: Fetch School & Student Profile
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
        profileQuery = profileQuery.or(`unique_code.eq."${studentCode}",code.eq."${studentCode}",student_id.eq."${studentCode}"`);
      }
      if (schoolId) {
        profileQuery = profileQuery.eq('school_id', schoolId);
      }

      const [schoolRes, studentRes] = await Promise.all([
        schoolQuery.maybeSingle(),
        profileQuery.maybeSingle()
      ]);

      const schoolData = schoolRes.data;
      if (schoolData) {
        setSchoolName(urlSchoolName || schoolData.name || schoolData.institution_name || schoolData.school_name || '');
        setSchoolRegion(schoolData.region || '');
        setSchoolAddress(schoolData.address_location || schoolData.address || schoolData.location || '');
        setAcademicYear(schoolData.academic_year || getCurrentAcademicYear());
        setSchoolMotto(schoolData.motto || schoolData.school_motto || '');
        setAppDeveloper(schoolData.app_developer_credit || '');
        setSchoolLogo(schoolData.logo_url || schoolData.logo || '');
        setSchoolPhone(schoolData.contact_line || schoolData.phone || '');
        setSchoolEmail(schoolData.official_email || schoolData.email || '');
      } else {
        setAcademicYear(getCurrentAcademicYear());
      }

      const profile = studentRes.data;
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const sectionVal = profile.section || profile.academic_section || profile.education_type || 'Technical Commercial (STT)';
      const sectionLower = sectionVal.toLowerCase();

      // Section check: Strictly check for Technical Commercial / STT
      if (!sectionLower.includes('technical commercial') && !sectionLower.includes('commercial') && !sectionLower.includes('stt')) {
        setIsWrongSection(true);
        setIsLoading(false);
        return;
      }

      setIsWrongSection(false);

      const effectiveSchoolId = profile.school_id || schoolId;
      const activeClass = (profile.classLevel || profile.class_level || profile.class_name || profile.class || profile.class_grade || '').trim();
      const activeTradeSeries = (profile.trades_series || profile.series || profile.trade || profile.specialty || profile.trade_series || '').trim();
      const activeStudentId = profile.id;
      const activeCode = profile.unique_code || profile.code || profile.student_id || studentCode || '';
      const termString = `Term ${activeTerm}`;

      setStudentData({
        ...profile,
        display_name: profile.fullName || profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        display_class: activeClass,
        display_section: sectionVal,
        display_series: activeTradeSeries || '—',
        photo_url: profile.picture || profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null,
        matricule: activeCode
      });

      // ==========================================
      // PARALLEL BATCH 2: Enrolment, Coefficients, Teachers, Marks, Fees, Discipline, Remarks & Announcements
      // ==========================================
      let studentsQ = supabase.from('students').select('*');
      let coeffQ = supabase.from('class_coefficients').select('*');
      let teachersQ = supabase.from('teachers').select('*');
      let marksQ = supabase.from('marks').select('*');
      let feesQ = supabase.from('bursar_fees').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`);
      let discQ = supabase.from('discipline_summaries').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);
      let remQ = supabase.from('principal_remarks').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);
      let annoQ = supabase.from('principal_announcements').select('*');

      if (effectiveSchoolId) {
        studentsQ = studentsQ.eq('school_id', effectiveSchoolId);
        coeffQ = coeffQ.eq('school_id', effectiveSchoolId);
        teachersQ = teachersQ.eq('school_id', effectiveSchoolId);
        marksQ = marksQ.eq('school_id', effectiveSchoolId);
        feesQ = feesQ.eq('school_id', effectiveSchoolId);
        discQ = discQ.eq('school_id', effectiveSchoolId);
        remQ = remQ.eq('school_id', effectiveSchoolId);
        annoQ = annoQ.eq('school_id', effectiveSchoolId);
      }

      const [allStudentsRes, coeffRes, teachersRes, classMarksRes, feesRes, disciplineRes, remarksRes, annosRes] = await Promise.all([
        studentsQ,
        coeffQ,
        teachersQ,
        marksQ,
        feesQ.maybeSingle(),
        discQ.maybeSingle(),
        remQ.maybeSingle(),
        annoQ.order('created_at', { ascending: false }).limit(3)
      ]);

      // 1. Process Trade/Series-Based Enrolment Count
      const allStudents = allStudentsRes.data || [];
      const classStudents = allStudents.filter(s => {
        const cVal = (s.classLevel || s.class_level || s.class_name || s.class || '').trim().toLowerCase();
        const sTrade = (s.trades_series || s.series || s.trade || s.specialty || s.trade_series || '').trim().toLowerCase();
        
        const isClassMatch = cVal === activeClass.toLowerCase();
        const isTradeMatch = !activeTradeSeries || !sTrade || sTrade === activeTradeSeries.toLowerCase();
        
        return isClassMatch && isTradeMatch;
      });
      setTotalStudents(classStudents.length || null);

      // 2. Process Subjects and Instructors
      const teachersData = teachersRes.data || [];
      const allCoeffs = coeffRes.data || [];
      const matchedCoeffRow = allCoeffs.find((row) => {
        const rowClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
        return rowClass === activeClass.toLowerCase();
      });

      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return '—';
        const cleanSub = subjectName.toLowerCase().trim();
        const match = teachersData.find((t) => {
          const rawSubs = t.subjects || t.subject || [];
          if (Array.isArray(rawSubs)) return rawSubs.some((s) => typeof s === 'string' && s.toLowerCase().trim() === cleanSub);
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
            const categoryVal = item.category || item.group || 'Commercial Subjects';
            const instructorName = item.instructor || item.teacher_name || getTeacherForSubject(sName);

            loadedSubjects.push({
              id: item.id || `${sName}-${coefVal}`,
              subject_name: sName,
              category: categoryVal,
              coefficient: coefVal,
              instructor: instructorName
            });
          });
        }
      }
      setSubjects(loadedSubjects);

      // 3. Process Student Marks & Subject Ranks
      const rawMarks = classMarksRes.data || [];
      const classMarksList = rawMarks.filter(m => {
        const mTerm = String(m.term || '').trim().toLowerCase();
        return mTerm === termString.toLowerCase() || mTerm === String(activeTerm);
      });

      const scoreLookup = {};
      const rankLookup = {};

      const currentStudentMarks = classMarksList.filter(m => 
        (activeStudentId && String(m.student_id) === String(activeStudentId)) ||
        (activeCode && (m.unique_code === activeCode || m.code === activeCode))
      );

      currentStudentMarks.forEach((m) => {
        const key = (m.subject_name || m.subject_code || '').toLowerCase().trim();
        scoreLookup[key] = m.term_score ?? m.score ?? m.mark ?? m.marks;
        if (m.subject_rank || m.rank) {
          rankLookup[key] = m.subject_rank || m.rank;
        }
      });

      // Compute individual subject ranks dynamically if missing
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

      // 4. Compute Overall Class Rank & Class Average across Trade Enrolled Students
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

      // 5. Ancillary Records
      setFeesRecord(feesRes.data || null);
      setDisciplineRecord(disciplineRes.data || null);
      setAdminRemarks(remarksRes.data || null);
      setAnnouncements(annosRes.data || []);

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
  }, [activeTerm, searchParams, router, overrideSchoolId, overrideStudentRowId, overrideStudentCode]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Technical Commercial Report Card link copied!');
    }
  };

  // Performance Totals
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

  // Fees Display
  const paidAmount = Number(feesRecord?.fees_paid || feesRecord?.amount_paid || 0);
  const balanceAmount = Number(feesRecord?.fee_balance || feesRecord?.balance || 0);
  const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
  const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#d8f3dc] max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-[#1b4332]">Authentication Required</h2>
          <p className="text-xs text-slate-600">Please provide your student unique code or open a valid link to view your Technical Commercial report card.</p>
          <a href="/" className="inline-block px-4 py-2 bg-[#1b4332] text-white rounded-xl text-xs font-semibold hover:bg-[#2d6a4f] transition">Return to Portal</a>
        </div>
      </div>
    );
  }

  if (isWrongSection) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#d8f3dc] max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">i</div>
          <h2 className="text-lg font-bold text-[#1b4332]">Section Mismatch</h2>
          <p className="text-xs text-slate-600">This report card portal is strictly configured for Technical Commercial (STT) students.</p>
          <a href="/" className="inline-block px-4 py-2 bg-[#1b4332] text-white rounded-xl text-xs font-semibold hover:bg-[#2d6a4f] transition">Return to Portal</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2d3748] p-4 sm:p-8 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm 8mm; }
          body { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .print-compact-table td, .print-compact-table th { padding-top: 3px !important; padding-bottom: 3px !important; font-size: 10px !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6 print:space-y-2 print-container">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center no-print">
          <a href="/" className="text-xs font-semibold text-[#1b4332] hover:underline">&larr; Back to Portal</a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-[#1b4332] text-white rounded-xl text-xs font-bold hover:bg-[#2d6a4f] transition">Print Report Card</button>
            <button onClick={handleShare} className="px-4 py-2 bg-[#2d6a4f] text-white rounded-xl text-xs font-bold hover:bg-[#1b4332] transition shadow-md">Share Report Link</button>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="bg-white border border-[#d8f3dc] rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 print:shadow-none print:border-none print:p-0 print:space-y-3">
          
          {/* Header Banner */}
          <div className="border border-[#d8f3dc] bg-[#f4f9f4] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 border border-[#d8f3dc] rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-2">
              {schoolLogo ? <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" /> : <span className="text-[10px] font-bold text-slate-400 text-center uppercase">SCHOOL LOGO</span>}
            </div>
            <div className="flex-1 w-full border border-[#d8f3dc] rounded-xl bg-white divide-y divide-[#d8f3dc] text-center">
              {/* Line 1: School Name & Academic Year */}
              <div className="p-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#1b4332] uppercase tracking-tight">{schoolName || 'COLLEGE NAME'}</h1>
                <p className="text-xs font-semibold text-[#2d6a4f] mt-0.5">Academic Year: {academicYear || getCurrentAcademicYear()}</p>
              </div>
              {/* Line 2: Single-line Regional Delegation Title */}
              <div className="p-2 bg-[#f4f9f4]">
                <p className="text-xs sm:text-sm font-black text-[#1b4332] uppercase tracking-tight whitespace-nowrap">
                  REGIONAL DELEGATION FOR SECONDARY EDUCATION
                  {schoolRegion && ` FOR THE ${schoolRegion.toUpperCase()}`}
                </p>
              </div>
              {/* Line 3: Phone, Email, Location in Uniform Dark Green */}
              <div className="p-2 flex flex-wrap justify-center gap-x-6 text-xs font-bold text-[#1b4332] whitespace-nowrap">
                <span>Phone: {schoolPhone || '—'}</span>
                <span>Email: {schoolEmail || '—'}</span>
                {schoolAddress && <span>Location: {schoolAddress}</span>}
              </div>
            </div>
          </div>

          {schoolMotto && (
            <div className="p-3 bg-[#f4f9f4] border border-[#d8f3dc] rounded-2xl text-center shadow-inner">
              <p className="text-sm font-serif italic font-bold text-[#1b4332] tracking-wider">Motto: "{schoolMotto}"</p>
            </div>
          )}

          {/* Title Banner */}
          <div className="p-3 bg-[#f4f9f4] border border-[#d8f3dc] rounded-2xl text-center shadow-inner">
            <h2 className="text-base font-serif italic font-black text-[#1b4332] tracking-wider uppercase">
              TECHNICAL COMMERCIAL (STT) — {getOrdinalTermWord(activeTerm).toUpperCase()} REPORT CARD
            </h2>
          </div>

          {/* Student Profile */}
          <div className="flex flex-col sm:flex-row gap-6 items-center bg-[#f4f9f4] p-5 rounded-2xl border border-[#d8f3dc]">
            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-[#d8f3dc] flex items-center justify-center shrink-0 overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400 font-medium text-center px-1">No Image</span>
              )}
            </div>
            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs">
              <div><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Full Name</span><strong className="text-slate-900 text-sm block truncate">{studentData?.display_name || '—'}</strong></div>
              <div><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Class</span><strong className="text-slate-900 text-sm block">{studentData?.display_class || '—'}</strong></div>
              <div><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Section</span><strong className="text-slate-900 block">{studentData?.display_section || 'Technical Commercial (STT)'}</strong></div>
              <div><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Trade / Series</span><strong className="text-slate-900 block">{studentData?.display_series || '—'}</strong></div>
              <div className="col-span-2 border-t border-[#d8f3dc] pt-2"><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Matricule (Unique Code)</span><strong className="text-[#1b4332] text-sm font-mono block">{studentData?.matricule || '—'}</strong></div>
              <div className="border-t border-[#d8f3dc] pt-2 text-right"><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Total Fees Paid</span><strong className="text-emerald-700 text-sm block">{displayPaid}</strong></div>
              <div className="border-t border-[#d8f3dc] pt-2 text-right"><span className="text-slate-500 block mb-0.5 uppercase font-semibold text-[10px]">Fee Balance</span><strong className="text-red-600 text-sm font-bold block">{displayBalance}</strong></div>
            </div>
          </div>

          {/* Term Switcher */}
          <div className="flex justify-between items-center border-b border-[#d8f3dc] no-print">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button key={term} onClick={() => setActiveTerm(term)} className={`px-6 py-3 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-[#1b4332] text-[#1b4332]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Term {term}</button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600 pr-2">Class Enrolment: <span className="text-[#1b4332]">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span></div>
          </div>

          {/* Subject Scores Table */}
          <div>
            <h3 className="text-sm font-extrabold text-[#1b4332] uppercase tracking-wider mb-3">Academic Performance Record</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#d8f3dc] rounded-xl overflow-hidden print-compact-table">
                <thead className="bg-[#1b4332] text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Subject Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Coef</th>
                    <th className="p-3 text-center">Score (/20)</th>
                    <th className="p-3 text-center">Total Marks</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center">Rank</th>
                    <th className="p-3">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8f3dc] bg-white">
                  {isLoading ? (
                    <tr><td colSpan="8" className="p-4 text-center text-slate-400 animate-pulse">Loading technical commercial grades...</td></tr>
                  ) : subjects.length === 0 ? (
                    <tr><td colSpan="8" className="p-4 text-center text-slate-400 italic">No configured subjects found for this class. Teachers can record marks on raw sheets.</td></tr>
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

                      const calculatedGrade = isScoreValid ? calculateCommercialGrade(scoreNum) : '—';
                      const rawRank = subjectRanksMap[subKey];
                      const formattedRank = rawRank ? getOrdinalSuffix(rawRank) : '—';

                      return (
                        <tr key={sub.id || `${subKey}-${idx}`} className="hover:bg-[#f4f9f4]">
                          <td className="p-3 font-bold text-slate-900">{subName}</td>
                          <td className="p-3 text-slate-600 font-medium">{sub.category || 'Commercial Subjects'}</td>
                          <td className="p-3 text-center font-bold">{coef}</td>
                          
                          {/* SCORE (/20): Fail (<10) in Red, Pass (>=10) in Blue */}
                          <td className={`p-3 text-center font-bold text-sm ${isScoreValid ? (scoreNum >= 10 ? 'text-blue-700' : 'text-red-600') : 'text-slate-400'}`}>
                            {isScoreValid ? `${scoreNum} / 20` : '—'}
                          </td>

                          {/* TOTAL MARKS: Fail (<10) in Red, Pass (>=10) in Blue */}
                          <td className={`p-3 text-center font-black ${totalScoreVal !== null ? (scoreNum >= 10 ? 'text-blue-700' : 'text-red-600') : 'text-slate-400'}`}>
                            {totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}
                          </td>

                          <td className="p-3 text-center font-black text-slate-800">{calculatedGrade}</td>
                          <td className="p-3 text-center font-bold text-[#2d6a4f]">{formattedRank}</td>
                          <td className="p-3 text-slate-600 font-medium truncate max-w-[130px]">{sub.instructor || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-[#1b4332] text-white p-4 rounded-2xl text-center">
            <div><span className="text-[10px] text-[#b7e4c7] uppercase block font-semibold">Total Points</span><strong className="text-lg">{hasAnyMarks ? `${totalPoints.toFixed(1)} / ${totalCoef * 20}` : '—'}</strong></div>
            <div><span className="text-[10px] text-[#b7e4c7] uppercase block font-semibold">Student Average</span><strong className="text-xl font-black text-amber-300">{termAverage ? `${termAverage} / 20` : '—'}</strong></div>
            <div><span className="text-[10px] text-[#b7e4c7] uppercase block font-semibold">Class Rank</span><strong className="text-lg">{studentRank ? getOrdinalSuffix(studentRank) : '—'}</strong></div>
            <div><span className="text-[10px] text-[#b7e4c7] uppercase block font-semibold">Class Average</span><strong className="text-lg">{classAverage ? `${classAverage} / 20` : '—'}</strong></div>
            <div><span className="text-[10px] text-[#b7e4c7] uppercase block font-semibold">Status</span><strong className={`text-lg font-bold ${termStatus === 'Passed' ? 'text-emerald-300' : termStatus === 'Failed' ? 'text-red-300' : 'text-slate-300'}`}>{termStatus || '—'}</strong></div>
          </div>

          {/* Discipline and Principal Remarks */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[#f4f9f4] border border-[#d8f3dc] rounded-2xl space-y-1">
              <span className="font-extrabold text-[#1b4332] uppercase block mb-1">Discipline & Attendance</span>
              <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? 0} hrs</strong></p>
              <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{disciplineRecord?.latecomings || disciplineRecord?.tardiness || 0} times</strong></p>
              <p className="text-slate-700 italic mt-2">{disciplineRecord?.remarks || disciplineRecord?.punishments ? `"${disciplineRecord.remarks || disciplineRecord.punishments}"` : 'Conduct Satisfactory.'}</p>
            </div>
            <div className="p-4 bg-[#f4f9f4] border border-[#d8f3dc] rounded-2xl space-y-1">
              <span className="font-extrabold text-[#1b4332] uppercase block mb-1">Principal Remarks</span>
              <p className="text-slate-700 italic">{adminRemarks?.remark_text || adminRemarks?.notice_text ? `"${adminRemarks.remark_text || adminRemarks.notice_text}"` : '—'}</p>
            </div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="p-4 bg-[#f4f9f4] border border-[#d8f3dc] rounded-2xl space-y-3 text-xs">
              <span className="font-extrabold text-[#1b4332] uppercase block">Announcements</span>
              {announcements.map((anno, idx) => (
                <div key={anno.id || idx} className="border-t border-[#d8f3dc] pt-2 first:border-t-0 first:pt-0">
                  <p className="font-bold text-slate-900">{anno.title}</p>
                  <p className="text-slate-600">{anno.content || anno.announcement_text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Signature Footer */}
          <div className="pt-4 border-t border-[#d8f3dc] grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <p className="font-bold text-[#1b4332] uppercase text-[10px]">Head of Commercial Department</p>
              <div className="border-b border-dashed border-slate-400 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
            <div className="space-y-8">
              <p className="font-bold text-[#1b4332] uppercase text-[10px]">The Principal</p>
              <div className="border-b border-dashed border-slate-400 mx-6"></div>
              <p className="text-[9px] text-slate-400 italic">Signature & Stamp</p>
            </div>
          </div>

        </div>

        {appDeveloper && <div className="text-center py-2 text-xs text-slate-500 font-medium no-print">{appDeveloper}</div>}
      </div>
    </div>
  );
}

export default function TechnicalCommercialReportCard(props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#1b4332] text-sm font-medium">Loading Technical Commercial Report Card...</div>}>
      <TechnicalCommercialReportContent {...props} />
    </Suspense>
  );
}
