'use client';
import { supabase } from '../../lib/supabase';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function getOrdinalSuffix(i) {
  if (!i || isNaN(i)) return '—';
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
}

function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  return now.getMonth() >= 8 
    ? `${currentYear}-${currentYear + 1}` 
    : `${currentYear - 1}-${currentYear}`;
}

function StudentDashboardContent() {
  const searchParams = useSearchParams();

  const [activeTerm, setActiveTerm] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [subjectRanksMap, setSubjectRanksMap] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const [schoolRegion, setSchoolRegion] = useState('');
  const [academicYear, setAcademicYear] = useState('');
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

  useEffect(() => {
    async function loadReportData() {
      // 1. Resolve parameters from URL
      const schoolId = searchParams.get('school_id');
      const studentRowId = searchParams.get('row_id');
      const studentCode = searchParams.get('id') || searchParams.get('unique_code') || searchParams.get('code');
      const urlSchoolName = searchParams.get('school_name');

      if (!schoolId || !studentCode) {
        setIsUnauthenticated(true);
        return;
      }

      setIsUnauthenticated(false);

      // 2. Set active school context for multi-tenant RLS
      await supabase.rpc('set_active_school', { school_id: schoolId });

      // 3. Fetch school metadata from admin settings
      const { data: schoolData } = await supabase
        .from('assigned_schools')
        .select('name, institution_name, region, location, academic_year, app_developer_credit, logo_url, phone, email, address')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolData) {
        setSchoolName(urlSchoolName || schoolData.name || schoolData.institution_name || '');
        setSchoolRegion(schoolData.address || schoolData.location || schoolData.region || '');
        setAcademicYear(schoolData.academic_year || getCurrentAcademicYear());
        setAppDeveloper(schoolData.app_developer_credit || '');
        setSchoolLogo(schoolData.logo_url || '');
        setSchoolPhone(schoolData.phone || '');
        setSchoolEmail(schoolData.email || '');
      } else if (urlSchoolName) {
        setSchoolName(urlSchoolName);
      }

      // 4. Fetch registered student details from admin dashboard registration
      let profileQuery = supabase.from('general_education_students').select('*').eq('school_id', schoolId);
      if (studentRowId) {
        profileQuery = profileQuery.eq('id', studentRowId);
      }

      if (studentCode) {
        profileQuery = profileQuery.or(`unique_code.eq.${studentCode},code.eq.${studentCode},student_id.eq.${studentCode},id.eq.${studentCode}`);
      }

      const { data: profile } = await profileQuery.maybeSingle();

      if (profile) {
        setStudentData({
          ...profile,
          display_name: profile.full_name || profile.name || profile.student_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          display_class: profile.class_grade || profile.class_level || profile.class_name || profile.class || profile.grade || '—',
          display_section: profile.section || profile.academic_section || profile.education_type || 'General Education',
          display_series: profile.series || profile.trade || profile.specialty || profile.trade_series || '—',
          photo_url: profile.photo_url || profile.avatar_url || profile.student_photo || profile.image_url || null
        });
      } else {
        setStudentData(null);
      }

      const activeCode = profile?.unique_code || studentCode;
      const activeStudentRowId = profile?.id || studentRowId;
      const activeClass = profile?.class_grade || profile?.class_level || profile?.class_name || profile?.class;
      const activeSeries = profile?.series || profile?.trade || profile?.specialty;
      const termString = `Term ${activeTerm}`;

      if (!activeStudentRowId && !activeCode) return;

      // 5. Fetch class enrollment count from admin registration database
      if (activeClass) {
        let countQuery = supabase
          .from('general_education_students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('class_grade', activeClass);

        if (activeSeries) {
          countQuery = countQuery.eq('series', activeSeries);
        }

        const { count } = await countQuery;
        setTotalStudents(count || null);
      }

      // 6. Fetch subjects configured in admin dashboard (class_coefficients)
      let coeffQuery = supabase
        .from('class_coefficients')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_included', true);

      if (activeClass) {
        coeffQuery = coeffQuery.eq('class_level', activeClass);
      }

      const { data: subData } = await coeffQuery;
      if (subData) {
        setSubjects(subData);
      }

      // 7. Fetch marks & subject ranks for active term
      const { data: markData } = await supabase
        .from('marks')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', activeStudentRowId)
        .eq('term', termString);

      const scoreLookup = {};
      const rankLookup = {};

      if (markData) {
        markData.forEach((m) => {
          scoreLookup[m.subject_name || m.subject_code] = m.score;
          if (m.subject_rank) {
            rankLookup[m.subject_name || m.subject_code] = m.subject_rank;
          }
        });
      }
      setMarksMap(scoreLookup);
      setSubjectRanksMap(rankLookup);

      // 8. Fetch financial records from Bursar Dashboard
      const { data: fees } = await supabase
        .from('bursar_fees')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', activeStudentRowId)
        .maybeSingle();
      setFeesRecord(fees || null);

      // 9. Performance RPC calls
      const { data: avgData } = await supabase
        .rpc('calculate_class_average', { target_school_id: schoolId, target_term: termString });
      setClassAverage(avgData !== null ? avgData : null);

      const { data: rankData } = await supabase
        .rpc('calculate_student_rank', { target_school_id: schoolId, student_code: activeCode, target_term: termString });
      if (rankData) {
        setStudentRank(rankData.rank ?? null);
        if (rankData.total_students) {
          setTotalStudents(rankData.total_students);
        }
      }

      // 10. Fetch discipline summary
      const { data: discipline } = await supabase
        .from('discipline_summaries')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', activeStudentRowId)
        .eq('term', termString)
        .maybeSingle();
      setDisciplineRecord(discipline || null);

      // 11. Fetch announcements
      const { data: annos } = await supabase
        .from('principal_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      setAnnouncements(annos || []);

      // 12. Fetch principal remarks
      const { data: remarks } = await supabase
        .from('principal_remarks')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', activeStudentRowId)
        .eq('term', termString)
        .maybeSingle();
      setAdminRemarks(remarks || null);
    }

    loadReportData();
  }, [activeTerm, searchParams]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/student-dashboard${window.location.search}`;
      navigator.clipboard.writeText(link);
    }
  };

  // Dynamic Score Calculations
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
    }
  });

  const termAverage = totalCoef > 0 && hasAnyMarks ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'Passed' : 'Failed') : null;

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-300 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600">
            No valid student or school parameter was provided. Please log in through your institution's portal.
          </p>
          <a href="/" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition">
            Return to Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <a href="/" className="text-xs font-semibold text-blue-600 hover:underline">
            &larr; Back to Portal
          </a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition">
              Print Report Card
            </button>
            <button onClick={handleShare} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/20">
              Share Report Link
            </button>
          </div>
        </div>

        {/* Dynamic Report Card Container */}
        <div className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 print:shadow-none print:border-none">
          
          {/* Header Branding (Admin Dashboard) */}
          <div className="border border-slate-300 bg-blue-50/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            {/* Left Column: School Logo */}
            <div className="w-28 h-28 border border-slate-300 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-2">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] font-bold text-slate-400 text-center uppercase">
                  INSERT SCHOOL LOGO
                </span>
              )}
            </div>

            {/* Right Column: Stacked School Information */}
            <div className="flex-1 w-full border border-slate-300 rounded-xl bg-white divide-y divide-slate-300 text-center">
              <div className="p-2">
                <h1 className="text-xl sm:text-2xl font-black text-blue-600 uppercase tracking-tight">
                  {schoolName || 'SCHOOL NAME'}
                </h1>
                <p className="text-xs font-semibold text-blue-500 mt-0.5">
                  Academic Year: {academicYear || getCurrentAcademicYear()}
                </p>
              </div>

              <div className="p-2">
                <p className="text-xs sm:text-sm font-bold text-blue-600">
                  {schoolRegion || 'Address / Location Not Set'}
                </p>
              </div>

              <div className="p-2 flex flex-wrap justify-center gap-x-6 text-xs font-bold text-blue-600">
                <span>Phone: {schoolPhone || 'N/A'}</span>
                <span>Email: {schoolEmail || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Student Profile & Financial Overview */}
          <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-200">
            {/* Registered Student Photo (Admin Dashboard) */}
            <div className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400 font-medium text-center px-1">No Image</span>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs">
              {/* Row 1: Academic Student Information */}
              <div>
                <span className="text-slate-400 block mb-0.5">Full Name</span>
                <strong className="text-slate-900 text-sm block">{studentData?.display_name || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">CLASS</span>
                <strong className="text-slate-900 text-sm block">{studentData?.display_class || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">SECTION</span>
                <strong className="text-slate-900 block">{studentData?.display_section || 'General Education'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Trade / Series</span>
                <strong className="text-slate-900 block">{studentData?.display_series || '—'}</strong>
              </div>

              {/* Row 2: Financial Details (Bursar Dashboard) pushed to the right */}
              <div className="col-span-2 hidden sm:block"></div> {/* Grid Spacer */}
              <div>
                <span className="text-slate-400 block mb-0.5">Total Fees Paid</span>
                <strong className="text-emerald-700 text-sm block">{feesRecord?.fees_paid ?? '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Fee Balance</span>
                <strong className="text-red-600 text-sm font-bold block">{feesRecord?.fee_balance ?? '—'}</strong>
              </div>
            </div>
          </div>

          {/* Term Selector & Class Enrollment Count */}
          <div className="flex justify-between items-center border-b border-slate-200">
            <div className="flex">
              {[1, 2, 3].map((term) => (
                <button 
                  key={term}
                  onClick={() => setActiveTerm(term)}
                  className={`px-6 py-3 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Term {term}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600 pr-2">
              Class Enrolment: <span className="text-blue-600">{totalStudents !== null ? `${totalStudents} Students` : '—'}</span>
            </div>
          </div>

          {/* Dynamic Marks Table */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">Academic Performance Record</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Subject Name</th>
                    <th className="p-3">Coef</th>
                    <th className="p-3">Score (/20)</th>
                    <th className="p-3">Total Marks</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-slate-400 italic">No subject data found.</td>
                    </tr>
                  ) : (
                    subjects.map((sub) => {
                      const subKey = sub.subject_name || sub.name || sub.subject_code;
                      const score = marksMap[subKey];
                      const coef = Number(sub.coefficient || sub.coef || 1);
                      const totalScore = (score !== undefined && score !== null) ? (Number(score) * coef).toFixed(1) : null;
                      const grade = score >= 16 ? 'A' : score >= 14 ? 'B' : score >= 12 ? 'C' : score >= 10 ? 'D' : score !== undefined && score !== null ? 'F' : '—';
                      const rawRank = subjectRanksMap[subKey];
                      const formattedRank = rawRank ? getOrdinalSuffix(rawRank) : '—';

                      return (
                        <tr key={sub.id || subKey} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{subKey}</td>
                          <td className="p-3 font-bold">{coef}</td>
                          <td className="p-3 font-bold text-blue-700 text-sm">
                            {score !== undefined && score !== null ? `${score} / 20` : '—'}
                          </td>
                          <td className="p-3 font-black text-slate-900">
                            {totalScore !== null ? `${totalScore} / ${coef * 20}` : '—'}
                          </td>
                          <td className="p-3 font-black text-slate-800">{grade}</td>
                          <td className="p-3 font-bold text-blue-600">{formattedRank}</td>
                          <td className="p-3 text-slate-500">{sub.instructor || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Summary Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-blue-900 text-white p-4 rounded-2xl text-center">
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Total Points</span>
              <strong className="text-lg">{hasAnyMarks ? `${totalPoints} / ${totalCoef * 20}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Student Average</span>
              <strong className="text-xl font-black text-amber-400">{termAverage ? `${termAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Class Rank</span>
              <strong className="text-lg">{studentRank && totalStudents ? `${studentRank} / ${totalStudents}` : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Class Average</span>
              <strong className="text-lg">{classAverage ? `${classAverage} / 20` : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Status</span>
              <strong className={`text-lg font-bold ${termStatus === 'Passed' ? 'text-emerald-400' : termStatus === 'Failed' ? 'text-red-400' : 'text-slate-300'}`}>
                {termStatus || '—'}
              </strong>
            </div>
          </div>

          {/* Discipline & Remarks */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Discipline & Attendance</span>
              <p className="text-slate-600">Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? '—'}</strong></p>
              <p className="text-slate-600">Tardiness: <strong className="text-slate-900">{disciplineRecord?.latecomings ?? '—'}</strong></p>
              <p className="text-slate-700 italic mt-2">{disciplineRecord?.punishments ? `"${disciplineRecord.punishments}"` : '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Principal Remarks</span>
              <p className="text-slate-700 italic">{adminRemarks?.remark_text ? `"${adminRemarks.remark_text}"` : '—'}</p>
            </div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <span className="font-extrabold text-slate-900 uppercase block">Announcements</span>
              {announcements.map((anno, idx) => (
                <div key={anno.id || idx} className="border-t border-slate-200 pt-2 first:border-t-0 first:pt-0">
                  <p className="font-bold text-slate-900">{anno.title}</p>
                  <p className="text-slate-600">{anno.content}</p>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Dynamic Footer Credit */}
        {appDeveloper && (
          <div className="text-center py-2 text-xs text-slate-500 font-medium">
            {appDeveloper}
          </div>
        )}

      </div>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback="Loading...">
      <StudentDashboardContent />
    </Suspense>
  );
}
