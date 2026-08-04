'use client';
import { useState } from 'react';

export default function LandingPage() {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [studentId, setStudentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStudentLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSchool) {
      setErrorMessage('Please select your official school from the list first.');
      return;
    }

    // Logic for Student ID validation (GE... / TE...)
    const isGeneral = studentId.startsWith('GE');
    const isTechnical = studentId.startsWith('TE');

    if (!isGeneral && !isTechnical) {
      setErrorMessage('Invalid Student ID format. ID must start with "GE" (General) or "TE" (Technical). Contact your school administrator.');
      return;
    }

    // Redirect to Student Portal
    window.location.href = `/student-dashboard?id=${studentId}&school=${encodeURIComponent(selectedSchool)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header / Brand */}
      <header className="px-6 py-6 border-b border-slate-800 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/30">
            NR
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">NsuhRecords</h1>
            <p className="text-xs text-slate-400">Academic Year 2026 - 2027</p>
          </div>
        </div>
        <a href="/developer-backend" className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
          Master Developer Link
        </a>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 items-center w-full">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
            Northwest & Southwest Regions
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mt-4 leading-tight">
            Modern Mobile Registry for General & Technical Education
          </h2>
          <p className="text-slate-400 mt-4 text-base leading-relaxed">
            Eliminating paper delays across Cameroonian schools. Teachers submit sequence scores instantly, parents track live grades, and school leaders manage complete fee records—online or offline.
          </p>
          
          <div className="mt-8 p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">About NsuhRecords</h3>
            <p className="text-xs text-slate-300 leading-normal">
              For decades, manual result compilation delayed term performance updates. NsuhRecords brings real-time American-style registry standards to General and Technical (CAP, Industrial F-Series, Commercial STT) schools, featuring instant student access and enterprise-grade data security.
            </p>
          </div>
        </div>

        {/* Portals Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-2">Access Portal</h3>
          <p className="text-xs text-slate-400 mb-6">Select your designated access role below</p>

          {/* Student Direct Access Form */}
          <form onSubmit={handleStudentLogin} className="space-y-4 mb-8 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Student / Parent Direct Access</span>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select School</label>
              <select 
                value={selectedSchool} 
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose your school --</option>
                <option value="Wisdom College Bamenda">Wisdom College Bamenda</option>
                <option value="CGS Technical High School">CGS Technical High School</option>
                <option value="Abakwa Grammar Academy">Abakwa Grammar Academy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Unique ID</label>
              <input 
                type="text" 
                placeholder="e.g. TEF1NG100126 or GEF1NG100126"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/30">
              View Student Dashboard & Report Cards
            </button>
          </form>

          {/* Role Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a href="/admin-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Administrator Login
            </a>
            <a href="/teacher-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Teacher Portal
            </a>
            <a href="/bursar-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Bursar Login
            </a>
            <a href="/discipline-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Discipline Master
            </a>
            <a href="/principal-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Principal Overview
            </a>
            <a href="/supervisor-dashboard" className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition">
              Supervisor Portal
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}