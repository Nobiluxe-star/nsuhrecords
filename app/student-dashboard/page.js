'use client';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

export default function StudentDashboard() {
  const [activeTerm, setActiveTerm] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  
  useEffect(() => {
    async function loadReportData() {
      // 1. Fetch Subjects
      const { data: subData, error: subError } = await supabase.from('subjects').select('*');
      console.log('Subjects Data:', subData, 'Error:', subError);
      if (subData) setSubjects(subData);

      // 2. Fetch Marks for this student and term
      const termString = `Term ${activeTerm}`;
      const { data: markData, error: markError } = await supabase
        .from('marks')
        .select('*')
        .eq('student_matricule', 'TEF2NG100126')
        .eq('term', termString);
      console.log('Marks Data:', markData, 'Error:', markError);

      // 3. Map scores by subject_code
      const scoreLookup = {};
      if (markData) {
        markData.forEach((m) => {
          scoreLookup[m.subject_code] = m.score;
        });
      }
      setMarksMap(scoreLookup);
    }

    loadReportData();
  }, [activeTerm]);

  const studentData = {
    name: 'Muh Irene',
    code: 'TEF2NG100126',
    school: 'Wisdom College Mankon',
    academicYear: '2026 - 2027',
    section: 'Technical',
    class: 'Form 2 Technical (MARE - Automobile)',
    age: 14,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    feesPaid: '125,000 FCFA',
    feesDue: '150,000 FCFA',
    feeBalance: '25,000 FCFA',
    absences: 2,
    conduct: 'Exemplary discipline and active workshop participation.',
    parentRecommendation: 'Encourage consistent revision in Applied Mechanics.'
  };

  const handleShare = () => {
    const link = `${window.location.origin}/student-dashboard?id=${studentData.code}&token=temp_exp_6h`;
    navigator.clipboard.writeText(link);
    alert('Temporary 6-Hour Encrypted View Link copied to clipboard!');
  };

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
                WCB
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{studentData.school}</h1>
                <p className="text-xs text-slate-600 font-medium">Official Student Academic Registry | Year {studentData.academicYear}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">NW Region, Cameroon</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-full">
                {studentData.section} Section
              </span>
              <p className="text-xs font-mono font-bold text-blue-600 mt-2">{studentData.code}</p>
            </div>
          </div>

          {/* Student Profile Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <img src={studentData.photoUrl} alt="Student" className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-300 mx-auto sm:mx-0" />
            <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <strong className="text-slate-900 text-sm">{studentData.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Class Grade</span>
                <strong className="text-slate-900">{studentData.class}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Age</span>
                <strong className="text-slate-900">{studentData.age} Years Old</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Fee Balance</span>
                <strong className="text-red-600 font-bold">{studentData.feeBalance}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Total Fees Paid</span>
                <strong className="text-emerald-700">{studentData.feesPaid}</strong>
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

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-blue-900 text-white p-4 rounded-2xl text-center">
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Total Points</span>
              <strong className="text-lg">57.5 / 80</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Term Average</span>
              <strong className="text-xl font-black text-amber-400">14.38 / 20</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Class Rank</span>
              <strong className="text-lg">3rd out of 42</strong>
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase block">Term Status</span>
              <strong className="text-lg text-emerald-400">Passed</strong>
            </div>
          </div>

          {/* Discipline & Conduct Statements */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Discipline & Attendance</span>
              <p className="text-slate-600 mb-2">Unexcused Absences: <strong className="text-slate-900">{studentData.absences} Days</strong></p>
              <p className="text-slate-700 italic">"{studentData.conduct}"</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="font-extrabold text-slate-900 uppercase block mb-1">Administration & Principal Remark</span>
              <p className="text-slate-700 italic">"{studentData.parentRecommendation}"</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}