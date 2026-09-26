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

function calculateCommercialGrade(score) {
  if (score === undefined || score === null || isNaN(Number(score))) return '—';
  const val = Number(score);
  if (val >= 16) return 'A';
  if (val >= 14) return 'B';
  if (val >= 12) return 'C';
  if (val >= 10) return 'D';
  return 'F';
}

function TechnicalCommercialReportContent() {
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

      let schoolQuery = supabase.from('school_details').select('*');
      if (schoolId) {
        schoolQuery = schoolQuery.eq('school_id', schoolId);
      } else if (urlSchoolName) {
        schoolQuery = schoolQuery.ilike('name', urlSchoolName);
      }

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
      const effectiveSchoolId = schoolId || schoolData?.school_id;

      if (schoolData) {
        setSchoolName(urlSchoolName || schoolData.name || schoolData.institution_name || schoolData.school_name || '');
        
        // Strict Region Formatting
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
        setSchoolAddress('—');
      }

      const profile = studentRes.data;
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const sectionVal = profile.section || profile.academic_section || profile.education_type || 'Technical Commercial (STT)';
      const sectionLower = sectionVal.toLowerCase();

      if (!sectionLower.includes('technical commercial') && !sectionLower.includes('commercial') && !sectionLower.includes('stt')) {
        setIsWrongSection(true);
        setIsLoading(false);
        return;
      }

      setIsWrongSection(false);

      const activeClass = (profile.classLevel || profile.class_level || profile.class_name || profile.class || profile.class_grade || '').trim();
      const activeSeries = (profile.trades_series || profile.series || profile.trade || profile.specialty || profile.trade_series || '').trim();
      const activeStudentId = profile.id;
      const activeCode = profile.unique_code || profile.code || profile.student_id || studentCode || '';
      const termString = `Term ${activeTerm}`;

      setStudentData({
        ...profile,
        display_name: profile.fullName || profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        display_class: activeClass,
        display_section: sectionVal,
        display_series: activeSeries || '—',
        photo_url: profile.picture || profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null,
        matricule: activeCode
      });

      // Strict Multi-Tenant Queries: Scoped strictly by school_id
      let studentsQuery = supabase.from('students').select('*');
      let coeffQuery = supabase.from('class_coefficients').select('*');
      let teachersQuery = supabase.from('teachers').select('*');
      let marksQuery = supabase.from('marks').select('*');
      let announcementsQuery = supabase.from('principal_announcements').select('*').order('created_at', { ascending: false }).limit(2);

      if (effectiveSchoolId) {
        studentsQuery = studentsQuery.eq('school_id', effectiveSchoolId);
        coeffQuery = coeffQuery.eq('school_id', effectiveSchoolId);
        teachersQuery = teachersQuery.eq('school_id', effectiveSchoolId);
        marksQuery = marksQuery.eq('school_id', effectiveSchoolId);
        announcementsQuery = announcementsQuery.eq('school_id', effectiveSchoolId);
      }

      let feesQuery = supabase.from('bursar_fees').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`);
      let disciplineQuery = supabase.from('discipline_summaries').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);
      let remarksQuery = supabase.from('principal_remarks').select('*').or(`student_id.eq."${activeStudentId}",unique_code.eq."${activeCode}"`).or(`term.eq."${termString}",term.eq."${activeTerm}"`);

      if (effectiveSchoolId) {
        feesQuery = feesQuery.eq('school_id', effectiveSchoolId);
        disciplineQuery = disciplineQuery.eq('school_id', effectiveSchoolId);
        remarksQuery = remarksQuery.eq('school_id', effectiveSchoolId);
      }

      const [allStudentsRes, coeffRes, teachersRes, classMarksRes, feesRes, disciplineRes, remarksRes, annosRes] = await Promise.all([
        studentsQuery,
        coeffQuery,
        teachersQuery,
        marksQuery,
        feesQuery.maybeSingle(),
        disciplineQuery.maybeSingle(),
        remarksQuery.maybeSingle(),
        announcementsQuery
      ]);

      const allStudents = allStudentsRes.data || [];
      const seriesStudents = allStudents.filter(s => {
        const cVal = (s.classLevel || s.class_level || s.class_name || s.class || '').trim().toLowerCase();
        const sVal = (s.trades_series || s.series || s.trade || s.specialty || s.trade_series || '').trim().toLowerCase();
        
        const isClassMatch = cVal === activeClass.toLowerCase();
        const isSeriesMatch = activeSeries ? sVal === activeSeries.toLowerCase() : true;
        
        return isClassMatch && isSeriesMatch;
      });
      setTotalStudents(seriesStudents.length || null);

      const teachersData = teachersRes.data || [];
      const allCoeffs = coeffRes.data || [];
      const matchedCoeffRow = allCoeffs.find((row) => {
        const rowClass = (row.classLevel || row.class_level || row.class_name || row.class || '').trim().toLowerCase();
        const rowSeries = (row.trades_series || row.series || row.trade || row.specialty || row.trade_series || '').trim().toLowerCase();
        
        const classMatch = rowClass === activeClass.toLowerCase();
        const seriesMatch = activeSeries ? rowSeries === activeSeries.toLowerCase() : true;
        
        return classMatch && seriesMatch;
      });

      // Precise Multi-Tenant Instructor Matching (Strict Class & Subject Matching)
      const getTeacherForSubject = (subjectName) => {
        if (!subjectName) return '—';
        const cleanSub = subjectName.toLowerCase().trim();
        const cleanClass = activeClass.toLowerCase().trim();

        const match = teachersData.find((t) => {
          // Verify School ID
          if (effectiveSchoolId && t.school_id && String(t.school_id) !== String(effectiveSchoolId)) {
            return false;
          }

          // Verify Class Assignment
          const assignedClasses = t.assigned_classes || t.classes || t.class_level || [];
          let classMatches = false;
          if (Array.isArray(assignedClasses)) {
            classMatches = assignedClasses.some(c => typeof c === 'string' && c.toLowerCase().trim() === cleanClass);
          } else if (typeof assignedClasses === 'string') {
            classMatches = assignedClasses.toLowerCase().trim() === cleanClass;
          }

          // Verify Subject Assignment
          const rawSubs = t.subjects || t.subject || [];
          let subjectMatches = false;
          if (Array.isArray(rawSubs)) {
            subjectMatches = rawSubs.some((s) => typeof s === 'string' && s.toLowerCase().trim() === cleanSub);
          } else if (typeof rawSubs === 'string') {
            subjectMatches = rawSubs.toLowerCase().trim() === cleanSub;
          }

          return classMatches && subjectMatches;
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

      let computedRank = null;
      let computedClassAvg = null;

      if (seriesStudents.length > 0 && loadedSubjects.length > 0) {
        const studentAverages = [];

        seriesStudents.forEach(st => {
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
  }, [activeTerm, searchParams, router]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Technical Commercial Report Card link copied!');
    }
  };

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

  const paidAmount = Number(feesRecord?.fees_paid || feesRecord?.amount_paid || 0);
  const balanceAmount = Number(feesRecord?.fee_balance || feesRecord?.balance || 0);
  const displayPaid = paidAmount > 0 ? `${paidAmount.toLocaleString()} FCFA` : '—';
  const displayBalance = paidAmount > 0 ? `${balanceAmount.toLocaleString()} FCFA` : '—';

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#D8F3DC] max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-[#1B4332]">Authentication Required</h2>
          <p className="text-xs text-slate-600">Please provide your student unique code or open a valid link to view your Technical Commercial report card.</p>
          <a href="/" className="inline-block px-4 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-semibold hover:bg-[#2D6A4F] transition">Return to Portal</a>
        </div>
      </div>
    );
  }

  if (isWrongSection) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#D8F3DC] max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">i</div>
          <h2 className="text-lg font-bold text-[#1B4332]">Section Mismatch</h2>
          <p className="text-xs text-slate-600">This report card portal is strictly configured for Technical Commercial (STT) students.</p>
          <a href="/" className="inline-block px-4 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-semibold hover:bg-[#2D6A4F] transition">Return to Portal</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] p-2 sm:p-6 print:p-0 print:bg-white print:m-0">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm;
            height: 297mm;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .no-print { display: none !important; }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            box-shadow: none !important;
            border: none !important;
            padding: 8mm 10mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .print-compact-table td, .print-compact-table th {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            font-size: 9px !important;
            line-height: 1.1 !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0 print-container">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center no-print">
          <a href="/" className="text-xs font-semibold text-[#1B4332] hover:underline">&larr; Back to Portal</a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-bold hover:bg-[#2D6A4F] transition">Print Report Card</button>
            <button onClick={handleShare} className="px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-bold hover:bg-[#1B4332] transition shadow-md">Share Report Link</button>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="bg-white border border-[#D8F3DC] rounded-3xl p-5 sm:p-8 shadow-xl space-y-3 print:shadow-none print:border-none print:p-0 print:space-y-1.5 flex-1 flex flex-col justify-between">
          
          {/* Header Banner */}
          <div className="border border-[#D8F3DC] bg-[#F4F9F4] rounded-2xl p-2.5 shadow-sm flex items-center gap-3 print:p-2">
            <div className="w-20 h-20 sm:w-22 sm:h-22 border border-[#D8F3DC] rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
              {schoolLogo ? <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" /> : <span className="text-[9px] font-bold text-slate-400 text-center uppercase">LOGO</span>}
            </div>
            
            <div className="flex-1 border border-[#D8F3DC] rounded-xl bg-white divide-y divide-[#D8F3DC] text-center">
              {/* Top Line: School Name & Academic Year */}
              <div className="py-1 px-2">
                <h1 className="text-base sm:text-lg font-black text-[#1B4332] uppercase tracking-tight leading-tight">{schoolName || 'SCHOOL NAME'}</h1>
                <p className="text-[10px] font-semibold text-[#2D6A4F]">Academic Year: {academicYear || getCurrentAcademicYear()}</p>
              </div>

              {/* Middle Line: Clean Delegation Line */}
              <div className="py-0.5 px-2">
                <p className="text-[10px] sm:text-xs font-bold text-[#1B4332] uppercase tracking-wide">{schoolRegion}</p>
              </div>

              {/* Bottom Line: Clean Contact Bar */}
              <div className="py-0.5 px-2 text-[9px] sm:text-[10px] font-bold text-[#1B4332] flex justify-center items-center gap-2 flex-wrap">
                <span>Address: {schoolAddress}</span>
                <span className="text-slate-300 font-normal">|</span>
                <span>Tel: {schoolPhone}</span>
                <span className="text-slate-300 font-normal">|</span>
                <span>Email: {schoolEmail}</span>
              </div>
            </div>
          </div>

          {schoolMotto && (
            <div className="py-1 px-3 bg-[#F4F9F4] border border-[#D8F3DC] rounded-xl text-center shadow-inner">
              <p className="text-xs font-serif italic font-bold text-[#1B4332] tracking-wider">Motto: "{schoolMotto}"</p>
            </div>
          )}

          {/* Title Banner */}
          <div className="py-1.5 px-3 bg-[#1B4332] border border-[#1B4332] rounded-xl text-center shadow-inner">
            <h2 className="text-xs sm:text-sm font-serif italic font-black text-white tracking-wider uppercase">
              TECHNICAL COMMERCIAL (STT) — {getOrdinalTermWord(activeTerm).toUpperCase()} REPORT CARD
            </h2>
          </div>

          {/* Student Profile */}
          <div className="flex gap-4 items-center bg-[#F4F9F4] p-3 rounded-2xl border border-[#D8F3DC]">
            <div className="w-20 h-20 rounded-xl bg-white border border-[#D8F3DC] flex items-center justify-center shrink-0 overflow-hidden p-0.5">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-[9px] text-slate-400 font-medium text-center">No Image</span>
              )}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-1.5 gap-x-4 text-[11px]">
              <div><span className="text-slate-500 block uppercase font-semibold text-[9px]">Full Name</span><strong className="text-slate-900 font-bold block truncate">{studentData?.display_name || '—'}</strong></div>
              <div><span className="text-slate-500 block uppercase font-semibold text-[9px]">Class</span><strong className="text-slate-900 font-bold block">{studentData?.display_class || '—'}</strong></div>
              <div><span className="text-slate-500 block uppercase font-semibold text-[9px]">Section</span><strong className="text-slate-900 font-bold block truncate">{studentData?.display_section || 'Technical Commercial (STT)'}</strong></div>
              <div><span className="text-slate-500 block uppercase font-semibold text-[9px]">Trade / Specialty</span><strong className="text-slate-900 font-bold block truncate">{studentData?.display_series || '—'}</strong></div>
              <div className="col-span-2 border-t border-[#D8F3DC] pt-1"><span className="text-slate-500 block uppercase font-semibold text-[9px]">Matricule (Unique ID)</span><strong className="text-[#1B4332] font-mono font-bold block">{studentData?.matricule || '—'}</strong></div>
              <div className="border-t border-[#D8F3DC] pt-1 text-right"><span className="text-slate-500 block uppercase font-semibold text-[9px]">Fees Paid</span><strong className="text-emerald-700 font-bold block">{displayPaid}</strong></div>
              <div className="border-t border-[#D8F3DC] pt-1 text-right"><span className="text-slate-500 block uppercase font-semibold text-[9px]">Fee Balance</span><strong className="text-red-600 font-bold block">{displayBalance}</strong></div>
            </div>
          </div>

          {/* Term Switcher */}
          <div className="flex justify-between items-center border-b border-[#D8F3DC] no-print">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button key={term} onClick={() => setActiveTerm(term)} className={`px-4 py-1.5 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Term {term}</button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600 pr-2">Trade Specialty Enrolment: <span className="text-[#1B4332]">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span></div>
          </div>

          {/* Subject Scores Table */}
          <div className="flex-1 flex flex-col justify-start">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-[#D8F3DC] rounded-xl overflow-hidden print-compact-table">
                <thead className="bg-[#1B4332] text-white uppercase text-[9px]">
                  <tr>
                    <th className="py-1.5 px-2">Subject Name</th>
                    <th className="py-1.5 px-2">Category</th>
                    <th className="py-1.5 px-2 text-center">Coef</th>
                    <th className="py-1.5 px-2 text-center">Score (/20)</th>
                    <th className="py-1.5 px-2 text-center">Total</th>
                    <th className="py-1.5 px-2 text-center">Grade</th>
                    <th className="py-1.5 px-2 text-center">Rank</th>
                    <th className="py-1.5 px-2">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8F3DC] bg-white">
                  {isLoading ? (
                    <tr><td colSpan="8" className="p-3 text-center text-slate-400 animate-pulse">Loading technical commercial grades...</td></tr>
                  ) : subjects.length === 0 ? (
                    <tr><td colSpan="8" className="p-3 text-center text-slate-400 italic">No configured subjects found for this class in class_coefficients table.</td></tr>
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
                        <tr key={sub.id || `${subKey}-${idx}`} className="hover:bg-[#F4F9F4]">
                          <td className="py-1 px-2 font-bold text-slate-900">{subName}</td>
                          <td className="py-1 px-2 text-slate-600 font-medium text-[10px]">{sub.category || 'Commercial Subjects'}</td>
                          <td className="py-1 px-2 text-center font-bold">{coef}</td>
                          <td className={`py-1 px-2 text-center font-black ${isScoreValid ? (scoreNum < 10 ? 'text-red-600 print:text-red-600' : 'text-blue-700 print:text-blue-700') : 'text-slate-400'}`}>
                            {isScoreValid ? `${scoreNum} / 20` : '—'}
                          </td>
                          <td className="py-1 px-2 text-center font-black text-slate-900">{totalScoreVal !== null ? `${totalScoreVal} / ${maxPossible}` : '—'}</td>
                          <td className="py-1 px-2 text-center font-black text-slate-800">{calculatedGrade}</td>
                          <td className="py-1 px-2 text-center font-bold text-[#2D6A4F]">{formattedRank}</td>
                          <td className="py-1 px-2 text-slate-600 font-medium truncate max-w-[110px] text-[10px]">{sub.instructor || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary Banner */}
          <div className="grid grid-cols-5 gap-2 bg-[#1B4332] text-white p-2 rounded-xl text-center align-middle">
            <div>
              <span className="text-[8px] text-[#B7E4C7] uppercase block font-semibold">Total Points</span>
              <strong className="text-xs sm:text-sm">{hasAnyMarks ? `${totalPoints.toFixed(1)} / ${totalCoef * 20}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[8px] text-[#B7E4C7] uppercase block font-semibold">Student Average</span>
              <strong className={`text-xs sm:text-sm font-black ${termAverage ? (Number(termAverage) < 10 ? 'text-red-400' : 'text-blue-300') : 'text-white'}`}>
                {termAverage ? `${termAverage} / 20` : '—'}
              </strong>
            </div>
            <div>
              <span className="text-[8px] text-[#B7E4C7] uppercase block font-semibold">Class Rank</span>
              <strong className="text-xs sm:text-sm">{studentRank ? getOrdinalSuffix(studentRank) : '—'}</strong>
            </div>
            <div>
              <span className="text-[8px] text-[#B7E4C7] uppercase block font-semibold">Class Average</span>
              <strong className={`text-xs sm:text-sm font-black ${classAverage ? (Number(classAverage) < 10 ? 'text-red-400' : 'text-blue-300') : 'text-white'}`}>
                {classAverage ? `${classAverage} / 20` : '—'}
              </strong>
            </div>
            <div>
              <span className="text-[8px] text-[#B7E4C7] uppercase block font-semibold">Status</span>
              <strong className={`text-xs sm:text-sm font-black ${termStatus === 'Passed' ? 'text-blue-300' : termStatus === 'Failed' ? 'text-red-400' : 'text-slate-300'}`}>
                {termStatus || '—'}
              </strong>
            </div>
          </div>

          {/* Discipline and Principal Remarks */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="p-2 bg-[#F4F9F4] border border-[#D8F3DC] rounded-xl space-y-0.5">
              <span className="font-extrabold text-[#1B4332] uppercase block">Discipline & Attendance</span>
              <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? 0} hrs</strong></p>
              <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{disciplineRecord?.latecomings || disciplineRecord?.tardiness || 0} times</strong></p>
              <p className="text-slate-700 italic truncate">{disciplineRecord?.remarks || disciplineRecord?.punishments ? `"${disciplineRecord.remarks || disciplineRecord.punishments}"` : 'Conduct Satisfactory.'}</p>
            </div>
            <div className="p-2 bg-[#F4F9F4] border border-[#D8F3DC] rounded-xl space-y-0.5">
              <span className="font-extrabold text-[#1B4332] uppercase block">Principal Remarks</span>
              <p className="text-slate-700 italic">{adminRemarks?.remark_text || adminRemarks?.notice_text ? `"${adminRemarks.remark_text || adminRemarks.notice_text}"` : '—'}</p>
            </div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="p-2 bg-[#F4F9F4] border border-[#D8F3DC] rounded-xl space-y-1 text-[10px]">
              <span className="font-extrabold text-[#1B4332] uppercase block">Announcements</span>
              {announcements.map((anno, idx) => (
                <div key={anno.id || idx} className="border-t border-[#D8F3DC] pt-1 first:border-t-0 first:pt-0">
                  <p className="font-bold text-slate-900 truncate">{anno.title}</p>
                  <p className="text-slate-600 truncate">{anno.content || anno.announcement_text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Signature Footer */}
          <div className="pt-2 border-t border-[#D8F3DC] grid grid-cols-2 gap-4 text-center text-[10px]">
            <div className="space-y-4">
              <p className="font-bold text-slate-700 uppercase">Class Master Signature</p>
              <p className="text-slate-400 font-mono text-[9px]">________________________</p>
            </div>
            <div className="space-y-4">
              <p className="font-bold text-slate-700 uppercase">Principal Signature & Stamp</p>
              <p className="text-slate-400 font-mono text-[9px]">________________________</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function TechnicalCommercialReportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500 font-medium">Loading report card...</div>}>
      <TechnicalCommercialReportContent />
    </Suspense>
  );
}