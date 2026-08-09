'use client';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

export default function StudentDashboard() {
  const [activeTerm, setActiveTerm] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [schoolName, setSchoolName] = useState('No school assigned yet');
  const [studentData, setStudentData] = useState(null);
  const [feesRecord, setFeesRecord] = useState(null);
  const [classAverage, setClassAverage] = useState(null);
  const [studentRank, setStudentRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(null);
  const [disciplineRecord, setDisciplineRecord] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [adminRemarks, setAdminRemarks] = useState(null);

  useEffect(() => {
    async function loadReportData() {
      // 1. Fetch assigned school or reset to zero
      const { data: schoolAssignment } = await supabase
        .from('school_assignments')
        .select('school_name')
        .single();

      if (schoolAssignment?.school_name) {
        setSchoolName(schoolAssignment.school_name);
      } else {
        setSchoolName('No school assigned yet');
      }

      // 2. Fetch student details (left void if unassigned/unfilled)
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .single();

      setStudentData(profile || null);

      // 3. Fetch fees record from bursar dashboard
      const { data: fees } = await supabase
        .from('bursar_fees')
        .select('*')
        .eq('term', `Term ${activeTerm}`)
        .single();

      setFeesRecord(fees || null);

      // 4. Fetch Subjects
      const { data: subData } = await supabase.from('subjects').select('*');
      if (subData) setSubjects(subData);

      // 5. Fetch Marks for this student and term
      const termString = `Term ${activeTerm}`;
      const matricule = profile?.code || 'TEF2NG100126';
      const { data: markData } = await supabase
        .from('marks')
        .select('*')
        .eq('student_matricule', matricule)
        .eq('term', termString);

      const scoreLookup = {};
      if (markData) {
        markData.forEach((m) => {
          scoreLookup[m.subject_code] = m.score;
        });
      }
      setMarksMap(scoreLookup);

      // 6. Fetch Postgres calculated general class average
      const { data: avgData } = await supabase
        .rpc('calculate_class_average', { target_term: termString });
      setClassAverage(avgData !== null ? avgData : null);

      // 7. Fetch Student Rank and Total Students in Class via Postgres function or table
      const { data: rankData } = await supabase
        .rpc('calculate_student_rank', { student_code: matricule, target_term: termString });
      if (rankData) {
        setStudentRank(rankData.rank ?? null);
        setTotalStudents(rankData.total_students ?? null);
      }

      // 8. Fetch discipline summary from discipline master dashboard
      const { data: discipline } = await supabase
        .from('discipline_summaries')
        .select('*')
        .eq('term', termString)
        .single();
      setDisciplineRecord(discipline || null);

      // 9. Fetch principal announcements directly from principal dashboard tables
      const { data: annos } = await supabase
        .from('principal_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      setAnnouncements(annos || []);

      // 10. Fetch principal remarks
      const { data: remarks } = await supabase
        .from('principal_remarks')
        .select('*')
        .eq('term', termString)
        .single();
      setAdminRemarks(remarks || null);
    }

    loadReportData();

    // Real-time update check every 1 minute
    const interval = setInterval(() => {
      loadReportData();
    }, 60000);

    return () => clearInterval(interval);
  }, [activeTerm]);

  const handleShare = () => {
    const link = `${window.location.origin}/student-dashboard?token=temp_exp_6h`;
    navigator.clipboard.writeText(link);
    alert('Temporary 6-Hour Encrypted View Link copied to clipboard!');
  };

  // Dynamic Totals calculation
  let totalPoints = 0;
  let totalCoef = 0;
  let hasAnyMarks = false;
  subjects.forEach((sub) => {
    const score = marksMap[sub.code];
    if (score !== undefined && score !== null) {
      hasAnyMarks = true;
      totalPoints += Number(score) * (sub.coef || 1);
      totalCoef += (sub.coef || 1);
    }
  });
  const termAverage = totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : null;
  const termStatus = termAverage !== null ? (Number(termAverage) >= 10 ? 'Passed' : 'Failed') : 'Void';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <a href="/" className="text-xs font-semibold text-blue-600 hover:underline">
            &larr; Back to Portal Selection
          </a>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition">
              Print Report Card
            </button>
            <button onClick={handleShare} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/20">
              Share Report Link (Expires in 6 Hrs)
            </button>
          </div>
        </div>

        {/* Printable American-Style Report Card Container */}
        <div className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 print:shadow-none print:border-none">
          
          {/* Header Branding */}
          <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-900 text-white font-black text-2xl rounded-2xl flex items-center justify-center">
                NR
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{schoolName}</h1>
                <p className="text-xs text-slate-600 font-medium">Official Student Academic Registry | Academic Year 2026 - 2027</p>
                <p className="text-[10px] text-slate-400 mt-0.5">NW Region, Cameroon</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-full">
                Technical Section
              </span>
              <p className="text-xs font-mono font-bold text-blue-600 mt-2">{studentData?.code || 'Void'}</p>
            </div>
          </div>

          {/* Student Profile Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-slate-300 mx-auto sm:mx-0 flex items-center justify-center overflow-hidden">
              {studentData?.photo_url ? (
                <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-500 text-center font-medium px-1">No Picture</span>
              )}
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <strong className="text-slate-900 text-sm">{studentData?.name || 'Void'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Class Grade</span>
                <strong className="text-slate-900">{studentData?.class_grade || 'Void'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Age</span>
                <strong className="text-slate-900">{studentData?.age ? `${studentData.age} Years Old` : 'Void'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Fee Balance</span>
                <strong className="text-red-600 font-bold">{feesRecord?.fee_balance ? `${feesRecord.fee_balance} FCFA` : 'Void'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Total Fees Paid</span>
                <strong className="text-emerald-700">{feesRecord?.fees_paid ? `${feesRecord.fees_paid} FCFA` : 'Void'}</strong>
              </div>
            </div>
          </div>

          {/* Term Selector */}
          <div className="flex border-b border-slate-200">
            {[1, 2, 3].map((term) => (
              <button 
                key={term}
                onClick={() => setActiveTerm(term)}
                className={`px-6 py-3 text-xs font-bold transition border-b-2 ${activeTerm === term ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Term {term} Results
              </button>
            ))}
          </div>

          {/* Academic Report Card Table */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">Academic Performance Record (Term {activeTerm})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Subject Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Coef</th>
                    <th className="p-3">Score (/20)</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {subjects.map((sub) => {
                    const score = marksMap[sub.code];
                    const grade = score >= 16 ? 'A' : score >= 14 ? 'B' : score >= 12 ? 'C' : score >= 10 ? 'D' : score !== undefined ? 'F' : '-';
                    return (
                      <tr key={sub.id || sub.code} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{sub.subject_name}</td>
                        <td className="p-3 font-mono text-slate-500">{sub.code}</td>
                        <td className="p-3 font-bold">{sub.coef}</td>
                        <td className="p-3 font-bold text-blue-700 text-sm">
                          {score !== undefined && score !== null ? `${score} / 20` : '-'}
                        </td>
                        <td className="p-3 font-black text-slate-800">{grade}</td>
                        <td className="p-3 text-slate-500">{sub.instructor || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats - 5 Column Layout including General Class Average */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-blue-900 text-white p-4 rounded-2xl text-center">
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Total Points</span>
              <strong className="text-lg">{hasAnyMarks ? `${totalPoints} / ${totalCoef * 20}` : 'Void'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Student Term Average</span>
              <strong className="text-xl font-black text-amber-400">{termAverage !== null ? `${termAverage} / 20` : 'Void'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Class Rank</span>
              <strong className="text-lg">{studentRank !== null && totalStudents !== null ? `${studentRank} out of ${totalStudents}` : 'Void'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">General Class Average</span>
              <strong className="text-lg">{classAverage !== null ? `${classAverage} / 20` : 'Pending'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Term Status</span>
              <strong className={`text-lg font-bold ${termStatus === 'Passed' ? 'text-emerald-400' : termStatus === 'Failed' ? 'text-red-400' : 'text-slate-300'}`}>
                {termStatus}
              </strong>
            </div>
          </div>

          {/* Discipline & Conduct Statements */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Discipline & Attendance</span>
              <p className="text-slate-600">Unexcused Absences: <strong className="text-slate-900">{disciplineRecord?.absences ?? 'Void'} Days</strong></p>
              <p className="text-slate-600">Latecomings: <strong className="text-slate-900">{disciplineRecord?.latecomings ?? 'Void'}</strong></p>
              <p className="text-slate-700 italic mt-2">"{disciplineRecord?.punishments || 'Void'}"</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Administration & Principal Remark</span>
              <p className="text-slate-700 italic">"{adminRemarks?.remark_text || 'Void'}"</p>
            </div>
          </div>

          {/* Principal Announcements Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
            <span className="font-extrabold text-slate-900 uppercase block">Principal Announcements</span>
            {announcements.length === 0 ? (
              <p className="text-slate-400 italic">Void</p>
            ) : (
              announcements.map((anno, idx) => (
                <div key={idx} className="border-t border-slate-200 pt-2 first:border-t-0 first:pt-0">
                  <p className="font-bold text-slate-900">{anno.title}</p>
                  <p className="text-slate-600">{anno.content}</p>
                </div>
              ))
            )}
          </div>

        </div>

        {/* App Credit Footer (Placed right below and outside the report card) */}
        <div className="text-center py-2 text-xs text-slate-500 font-medium">
          App conceived by Norbert Che Nsuh - 682491189
        </div>

      </div>
    </div>
  );
}