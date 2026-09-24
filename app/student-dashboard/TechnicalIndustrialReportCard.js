'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function TechnicalIndustrialReportContent() {
  const searchParams = useSearchParams();

  const [activeTerm, setActiveTerm] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [subjectRanksMap, setSubjectRanksMap] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const [schoolRegion, setSchoolRegion] = useState('');
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

  const loadReportData = useCallback(async () => {
    const schoolId = searchParams.get('school_id');
    const studentRowId = searchParams.get('row_id');
    const studentCode = searchParams.get('id') || searchParams.get('unique_code') || searchParams.get('code');

    if (!schoolId || (!studentCode && !studentRowId)) {
      setIsUnauthenticated(true);
      setIsLoading(false);
      return;
    }

    setIsUnauthenticated(false);

    // Enforce Row-Level Security Context
    await supabase.rpc('set_active_school', { school_id: schoolId });

    // 1. Strict Multi-Tenant Fetch of School Details
    const { data: schoolData } = await supabase
      .from('school_details')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (schoolData) {
      setSchoolName(schoolData.name || schoolData.institution_name || '');
      setSchoolRegion(schoolData.address_location || schoolData.address || schoolData.location || schoolData.region || '');
      setAcademicYear(schoolData.academic_year || '');
      setSchoolMotto(schoolData.motto || schoolData.school_motto || '');
      setAppDeveloper(schoolData.app_developer_credit || '');
      setSchoolLogo(schoolData.logo_url || schoolData.logo || '');
      setSchoolPhone(schoolData.contact_line || schoolData.phone || '');
      setSchoolEmail(schoolData.official_email || schoolData.email || '');
    }

    // 2. Fetch Student Profile
    let profileQuery = supabase.from('students').select('*').eq('school_id', schoolId);
    if (studentRowId) {
      profileQuery = profileQuery.eq('id', studentRowId);
    } else if (studentCode) {
      profileQuery = profileQuery.or(`unique_code.eq.${studentCode},code.eq.${studentCode},student_id.eq.${studentCode},id.eq.${studentCode}`);
    }

    const { data: profile } = await profileQuery.maybeSingle();

    if (!profile) {
      setStudentData(null);
      setIsLoading(false);
      return;
    }

    const sectionVal = profile.section || profile.academic_section || profile.education_type || '';
    if (sectionVal.toLowerCase() !== 'technical industrial (ind)') {
      setIsWrongSection(true);
      setIsLoading(false);
      return;
    }

    setIsWrongSection(false);

    const resolvedStudentData = {
      ...profile,
      display_name: profile.fullName || profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      display_class: profile.classLevel || profile.class_grade || profile.class_level || profile.class_name || profile.class || profile.grade || '—',
      display_section: sectionVal,
      display_series: profile.trades_series || profile.series || profile.trade || profile.specialty || profile.trade_series || '—',
      photo_url: profile.picture || profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null,
      matricule: profile.unique_code || profile.code || profile.student_id || studentCode
    };

    setStudentData(resolvedStudentData);

    const activeCode = profile.unique_code || profile.code || studentCode;
    const activeStudentRowId = profile.id || studentRowId;
    const activeClass = profile.classLevel || profile.class_grade || profile.class_level || profile.class_name || profile.class;
    const activeSeries = profile.trades_series || profile.series || profile.trade || profile.specialty;
    const termString = `Term ${activeTerm}`;

    // 3. Parallel Queries for Class Coefficients, Marks, and Metadata
    let countQuery = supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('classLevel', activeClass)
      .ilike('section', 'Technical Industrial (IND)');

    if (activeSeries) {
      countQuery = countQuery.eq('trades_series', activeSeries);
    }

    let coeffQuery = supabase
      .from('class_coefficients')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_included', true);

    if (activeClass) {
      coeffQuery = coeffQuery.eq('class_level', activeClass);
    }

    const [
      { count: enrollmentCount },
      { data: subData },
      { data: teachersData },
      { data: markData },
      { data: fees },
      { data: avgData },
      { data: rankData },
      { data: discipline },
      { data: annos },
      { data: remarks }
    ] = await Promise.all([
      activeClass ? countQuery : Promise.resolve({ count: null }),
      coeffQuery,
      supabase.from('teachers').select('*').eq('school_id', schoolId),
      supabase.from('marks').select('*').eq('school_id', schoolId).eq('student_id', activeStudentRowId).eq('term', termString),
      supabase.from('bursar_fees').select('*').eq('school_id', schoolId).eq('student_id', activeStudentRowId).maybeSingle(),
      supabase.rpc('calculate_class_average', { target_school_id: schoolId, target_term: termString }),
      supabase.rpc('calculate_student_rank', { target_school_id: schoolId, student_code: activeCode, target_term: termString }),
      supabase.from('discipline_summaries').select('*').eq('school_id', schoolId).eq('student_id', activeStudentRowId).eq('term', termString).maybeSingle(),
      supabase.from('principal_announcements').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('principal_remarks').select('*').eq('school_id', schoolId).eq('student_id', activeStudentRowId).eq('term', termString).maybeSingle()
    ]);

    // Map Teacher Specialty/Subject
    const teacherMap = {};
    if (teachersData) {
      teachersData.forEach(t => {
        const tName = t.fullName || t.full_name || t.name || t.teacher_name || `${t.first_name || ''} ${t.last_name || ''}`.trim();
        const tSubject = t.subject || t.subject_name || t.specialty;
        if (tSubject) {
          teacherMap[tSubject.toLowerCase()] = tName;
        }
      });
    }

    // Always Load Subjects from Class Coefficients
    const enrichedSubjects = (subData || []).map(sub => {
      const sName = sub.subject_name || sub.name || sub.subject_code || '';
      const assignedInstructor = sub.instructor || sub.teacher_name || teacherMap[sName.toLowerCase()] || '—';
      return {
        ...sub,
        resolved_instructor: assignedInstructor
      };
    });

    // Score & Rank Mapping
    const scoreLookup = {};
    const rankLookup = {};
    if (markData) {
      markData.forEach((m) => {
        const sKey = m.subject_name || m.subject_code;
        scoreLookup[sKey] = m.score;
        if (m.subject_rank) {
          rankLookup[sKey] = m.subject_rank;
        }
      });
    }

    setTotalStudents(enrollmentCount ?? rankData?.total_students ?? null);
    setSubjects(enrichedSubjects);
    setMarksMap(scoreLookup);
    setSubjectRanksMap(rankLookup);
    setFeesRecord(fees || null);
    setClassAverage(avgData ?? null);
    setStudentRank(rankData?.rank ?? null);
    setDisciplineRecord(discipline || null);
    setAnnouncements(annos || []);
    setAdminRemarks(remarks || null);
    setIsLoading(false);
  }, [activeTerm, searchParams]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/student-dashboard${window.location.search}`;
      navigator.clipboard.writeText(link);
    }
  };

  let totalPoints = 0;
  let totalCoef = 0;
  let hasAnyMarks = false;

  subjects.forEach((sub) => {
    const subKey = sub.subject_name || sub.name || sub.subject_code;
    const score = marksMap[subKey];
    const coef = Number(sub.coefficient || sub.coef || 1);
    if (score !== undefined && score !== null) {
      hasAnyMarks = true;
      totalPoints += Number(score) * coef;
      totalCoef += coef;
    } else {
      totalCoef += coef;
    }
  });

  const termAverage = totalCoef > 0 && hasAnyMarks ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'Passed' : 'Failed') : null;

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-amber-200 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600">No valid student or school parameter was provided. Please log in through your institution's portal.</p>
        </div>
      </div>
    );
  }

  if (isWrongSection) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-amber-200 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">i</div>
          <h2 className="text-lg font-bold text-slate-900">Wrong Section Access</h2>
          <p className="text-xs text-slate-600">This report card is strictly restricted to Technical Industrial (IND) students.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-2 sm:p-6 print:p-0 print:bg-white">
      {/* Print Styles for Single A4 Page Layout */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center no-print">
          <a href="/" className="text-xs font-semibold text-amber-800 hover:underline">
            &larr; Back to Portal
          </a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition">
              Print Report Card
            </button>
            <button onClick={handleShare} className="px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition shadow-md shadow-amber-700/20">
              Share Report Link
            </button>
          </div>
        </div>

        {/* Dynamic A4 Report Card Container */}
        <div className="print-a4-container bg-white border border-amber-200 rounded-2xl p-5 sm:p-8 shadow-xl space-y-4 text-xs">
          
          {/* Header Branding (Strictly loaded from database) */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3 flex flex-row items-center gap-3">
            <div className="w-20 h-20 border border-amber-200 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-slate-400 text-center uppercase">LOGO</span>
              )}
            </div>

            <div className="flex-1 border border-amber-200 rounded-lg bg-white divide-y divide-amber-200 text-center">
              <div className="p-1.5">
                <h1 className="text-lg font-black text-amber-900 uppercase tracking-tight">
                  {schoolName || '—'}
                </h1>
                {academicYear && (
                  <p className="text-[10px] font-semibold text-amber-700">
                    Academic Year: {academicYear}
                  </p>
                )}
              </div>

              <div className="p-1">
                <p className="text-xs font-bold text-amber-900">
                  {schoolRegion || '—'}
                </p>
              </div>

              <div className="p-1 flex justify-center gap-x-6 text-[10px] font-bold text-amber-800">
                <span>Phone: {schoolPhone || '—'}</span>
                <span>Email: {schoolEmail || '—'}</span>
              </div>
            </div>
          </div>

          {/* School Motto Banner */}
          {schoolMotto && (
            <div className="p-2 bg-amber-50/50 border border-amber-200 rounded-xl text-center">
              <p className="text-xs font-serif italic font-bold text-amber-950">
                Motto: "{schoolMotto}"
              </p>
            </div>
          )}

          {/* Term Report Header */}
          <div className="p-2 bg-amber-50/50 border border-amber-200 rounded-xl text-center">
            <h2 className="text-xs font-serif italic font-black text-amber-950 uppercase tracking-wider">
              {getOrdinalTermWord(activeTerm)} Report Card - Technical Industrial (IND)
            </h2>
          </div>

          {/* Student Profile & Financial Overview */}
          <div className="flex flex-row gap-4 items-center bg-amber-50/20 p-3 rounded-xl border border-amber-200 text-[11px]">
            <div className="w-16 h-16 rounded-xl bg-amber-100/50 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-amber-700/60 font-medium text-center">No Photo</span>
              )}
            </div>

            <div className="flex-1 grid grid-cols-4 gap-2">
              <div>
                <span className="text-slate-400 block text-[9px]">Full Name</span>
                <strong className="text-slate-900 block truncate">{studentData?.display_name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">CLASS</span>
                <strong className="text-slate-900 block">{studentData?.display_class || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">SECTION</span>
                <strong className="text-amber-900 block truncate">{studentData?.display_section || 'Technical Industrial (IND)'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Trade / Specialty</span>
                <strong className="text-slate-900 block truncate">{studentData?.display_series || '—'}</strong>
              </div>

              <div className="col-span-2 border-t border-amber-100 pt-1">
                <span className="text-slate-400 block text-[9px]">Matricule (Unique ID)</span>
                <strong className="text-amber-900 font-mono block">{studentData?.matricule || '—'}</strong>
              </div>
              <div className="border-t border-amber-100 pt-1 text-right">
                <span className="text-slate-400 block text-[9px]">Fees Paid</span>
                <strong className="text-amber-800 block">{feesRecord?.fees_paid ?? '—'}</strong>
              </div>
              <div className="border-t border-amber-100 pt-1 text-right">
                <span className="text-slate-400 block text-[9px]">Fee Balance</span>
                <strong className="text-red-600 font-bold block">{feesRecord?.fee_balance ?? '—'}</strong>
              </div>
            </div>
          </div>

          {/* Term Switcher */}
          <div className="flex justify-between items-center border-b border-amber-200 no-print">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button 
                  key={term}
                  onClick={() => setActiveTerm(term)}
                  className={`px-4 py-1.5 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-amber-700 text-amber-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Term {term}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600">
              Class Enrolment: <span className="text-amber-900">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span>
            </div>
          </div>

          {/* Dynamic Marks Table */}
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-amber-200 rounded-lg overflow-hidden">
                <thead className="bg-amber-900 text-white uppercase text-[9px]">
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
                <tbody className="divide-y divide-amber-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="p-3 text-center text-slate-400 italic">Loading evaluation records...</td>
                    </tr>
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-3 text-center text-slate-400 italic">No configured subjects found for this class in class_coefficients table.</td>
                    </tr>
                  ) : (
                    subjects.map((sub) => {
                      const subKey = sub.subject_name || sub.name || sub.subject_code;
                      const score = marksMap[subKey];
                      const coef = Number(sub.coefficient || sub.coef || 1);
                      const totalScore = (score !== undefined && score !== null) ? (Number(score) * coef).toFixed(1) : '—';
                      const grade = score >= 16 ? 'A' : score >= 14 ? 'B' : score >= 12 ? 'C' : score >= 10 ? 'D' : score !== undefined && score !== null ? 'F' : '—';
                      const rawRank = subjectRanksMap[subKey];
                      const formattedRank = rawRank ? getOrdinalSuffix(rawRank) : '—';

                      return (
                        <tr key={sub.id || subKey} className="hover:bg-amber-50/20">
                          <td className="p-1.5 font-bold text-slate-900">{subKey}</td>
                          <td className="p-1.5 text-center font-bold">{coef}</td>
                          <td className="p-1.5 text-center font-bold text-amber-900">
                            {score !== undefined && score !== null ? `${score} / 20` : '—'}
                          </td>
                          <td className="p-1.5 text-center font-black text-slate-900">{totalScore}</td>
                          <td className="p-1.5 text-center font-black text-slate-800">{grade}</td>
                          <td className="p-1.5 text-center font-bold text-amber-800">{formattedRank}</td>
                          <td className="p-1.5 text-slate-600">{sub.resolved_instructor || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary Bar */}
          <div className="grid grid-cols-5 gap-2 bg-amber-900 text-white p-2.5 rounded-xl text-center">
            <div>
              <span className="text-[9px] text-amber-200 uppercase block">Total Points</span>
              <strong className="text-xs">{hasAnyMarks ? `${totalPoints} / ${totalCoef * 20}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-amber-200 uppercase block">Student Average</span>
              <strong className="text-sm font-black text-amber-300">{termAverage ? `${termAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-amber-200 uppercase block">Class Rank</span>
              <strong className="text-xs">{studentRank && totalStudents ? `${studentRank} / ${totalStudents}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-amber-200 uppercase block">Class Average</span>
              <strong className="text-xs">{classAverage ? `${classAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-amber-200 uppercase block">Status</span>
              <strong className={`text-xs font-bold ${termStatus === 'Passed' ? 'text-amber-300' : termStatus === 'Failed' ? 'text-red-300' : 'text-slate-300'}`}>
                {termStatus || '—'}
              </strong>
            </div>
          </div>

          {/* Discipline & Principal Remarks Grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 bg-amber-50/20 border border-amber-200 rounded-xl space-y-0.5">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Discipline Record</span>
              <p className="text-slate-600">Unjustified Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? '—'}</strong></p>
              <p className="text-slate-600">Late Arrivals: <strong className="text-slate-900">{disciplineRecord?.latecomings ?? '—'}</strong></p>
              <p className="text-slate-700 italic text-[10px]">{disciplineRecord?.punishments ? `"${disciplineRecord.punishments}"` : '—'}</p>
            </div>
            <div className="p-2.5 bg-amber-50/20 border border-amber-200 rounded-xl space-y-0.5">
              <span className="font-extrabold text-slate-900 uppercase block text-[10px]">Principal Remarks</span>
              <p className="text-slate-700 italic text-[10px]">{adminRemarks?.remark_text ? `"${adminRemarks.remark_text}"` : '—'}</p>
            </div>
          </div>

          {/* Announcements Section */}
          {announcements.length > 0 && (
            <div className="p-2.5 bg-amber-50/20 border border-amber-200 rounded-xl space-y-1 text-[10px]">
              <span className="font-extrabold text-slate-900 uppercase block">Announcements</span>
              {announcements.map((anno, idx) => (
                <div key={anno.id || idx} className="border-t border-amber-200 pt-1 first:border-t-0 first:pt-0">
                  <span className="font-bold text-slate-900">{anno.title}: </span>
                  <span className="text-slate-600">{anno.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* Signatures & Endorsement Section */}
          <div className="pt-4 border-t border-amber-200 grid grid-cols-2 gap-8 text-[11px] text-center">
            <div>
              <p className="font-bold text-slate-900 uppercase">Head of Technical Department</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Signature & Stamp</p>
              <div className="h-12 border-b border-dashed border-amber-300 mt-2"></div>
            </div>
            <div>
              <p className="font-bold text-slate-900 uppercase">The Principal</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Signature & Stamp</p>
              <div className="h-12 border-b border-dashed border-amber-300 mt-2"></div>
            </div>
          </div>

        </div>

        {/* App Developer Footer Credit */}
        {appDeveloper && (
          <div className="text-center py-1 text-[10px] text-slate-500 font-medium">
            {appDeveloper}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TechnicalIndustrialReportCard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">Loading Technical Industrial Report...</div>}>
      <TechnicalIndustrialReportContent />
    </Suspense>
  );
}