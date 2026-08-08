'use client';

import React, { useState } from 'react';

export default function LandingPage() {
  // Student Direct Access Form State
  const [selectedSchool, setSelectedSchool] = useState('');
  const [studentId, setStudentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Authentication Modals State
  const [activeModal, setActiveModal] = useState(null); // 'master' | 'staff' | 'forgot_password' | null
  const [selectedRole, setSelectedRole] = useState('');
  const [rolePath, setRolePath] = useState('');

  // Staff Credentials
  const [staffId, setStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [resetEmailOrId, setResetEmailOrId] = useState('');

  // Master Developer Credentials
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerPassword, setDeveloperPassword] = useState('');
  const [masterError, setMasterError] = useState('');

  // Password Helper
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // ONLY Assigned Active Schools (No random or unassigned schools)
  const assignedSchools = [
    { id: 'WCB', name: 'Wisdom College Bamenda' },
    { id: 'GBHSB', name: 'Government Bilingual High School (GBHS) Bamenda' },
    { id: 'GTHSB', name: 'Government Technical High School (GTHS) Bamenda' },
  ];

  // Auto-generate strong 16-character password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSuggestedPassword(pass);
    setStaffPassword(pass);
  };

  const copySuggestedPassword = () => {
    if (suggestedPassword) {
      navigator.clipboard.writeText(suggestedPassword);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  // Handlers
  const handleStudentLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSchool) {
      setErrorMessage('Please select your official school from the list first.');
      return;
    }

    const isGeneral = studentId.startsWith('GE');
    const isTechnical = studentId.startsWith('TE');

    if (!isGeneral && !isTechnical) {
      setErrorMessage('Invalid Student ID format. ID must start with "GE" (General) or "TE" (Technical). Contact your school administrator.');
      return;
    }

    window.location.href = `/student-dashboard?id=${studentId}&school=${encodeURIComponent(selectedSchool)}`;
  };

  const handleStaffLogin = (e) => {
    e.preventDefault();
    if (!staffId || !staffPassword) {
      alert('Please enter your Unique Staff ID and Password.');
      return;
    }
    window.location.href = rolePath;
  };

  // Hardcoded Master Developer Authentication Check
  const handleMasterDevLogin = (e) => {
    e.preventDefault();
    setMasterError('');

    if (
      developerEmail.trim().toLowerCase() === 'newlife8525@gmail.com' &&
      developerPassword === '2026$NCmillions?'
    ) {
      // Redirect directly to the Master Admin Dashboard
      window.location.href = '/master-admin';
    } else {
      setMasterError('Unauthorized access attempt. Invalid Master Developer credentials.');
    }
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (!resetEmailOrId) {
      alert('Please enter your Unique ID or Registered Email.');
      return;
    }
    alert(`Password reset instructions sent for: ${resetEmailOrId}`);
    setActiveModal('staff');
  };

  const openStaffModal = (roleName, path) => {
    setSelectedRole(roleName);
    setRolePath(path);
    setStaffId('');
    setStaffPassword('');
    setSuggestedPassword('');
    setActiveModal('staff');
  };

  return (
    <div className="min-h-screen bg-[#0b132b] text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
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
        
        {/* Master Developer Access Trigger */}
        <button
          onClick={() => {
            setMasterError('');
            setActiveModal('master');
          }}
          className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700 hover:border-blue-500/50"
        >
          Master Developer Link
        </button>
      </header>

      {/* Hero Content Area */}
      <section className="max-w-7xl mx-auto px-6 py-8 sm:py-12 grid md:grid-cols-2 gap-12 items-start w-full my-auto">
        <div className="space-y-6">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Modern Mobile Registry for General & Technical Education
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Eliminating paper delays across Cameroonian schools. Teachers submit sequence scores instantly, parents track live grades, and school leaders manage complete fee records—online or offline.
          </p>
          
          {/* Explicitly standard casing heading (not forced uppercase) */}
          <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">
              ABOUT NsuhRecords
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For decades, manual result compilation delayed term performance updates. NsuhRecords brings real-time American-style registry standards to General and Technical (CAP, Industrial F-Series, Commercial STT) schools, featuring instant student access and enterprise-grade data security.
            </p>
          </div>
        </div>

        {/* Access Portal */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Access Portal</h3>
            <p className="text-xs text-slate-400">Select your designated access role below</p>
          </div>

          {/* Student Direct Access Form */}
          <form onSubmit={handleStudentLogin} className="space-y-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-700/50">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              STUDENT / PARENT DIRECT ACCESS
            </span>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select School</label>
              <select 
                value={selectedSchool} 
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Choose your school --</option>
                {assignedSchools.map((school) => (
                  <option key={school.id} value={school.name}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Unique ID</label>
              <input 
                type="text" 
                placeholder="E.G. TEF1NG100126 OR GEF1NG100126"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                required
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/30">
              View Student Dashboard & Report Cards
            </button>
          </form>

          {/* Staff Portals */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              STAFF & ADMINISTRATIVE PORTALS
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openStaffModal('Administrator', '/admin-login')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Administrator Login
              </button>

              <button
                type="button"
                onClick={() => openStaffModal('Teacher', '/teacher-dashboard')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Teacher Portal
              </button>

              <button
                type="button"
                onClick={() => openStaffModal('Bursar', '/bursar-dashboard')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Bursar Login
              </button>

              <button
                type="button"
                onClick={() => openStaffModal('Discipline Master', '/discipline-dashboard')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Discipline Master
              </button>

              <button
                type="button"
                onClick={() => openStaffModal('Principal', '/principal-dashboard')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Principal Overview
              </button>

              <button
                type="button"
                onClick={() => openStaffModal('Supervisor', '/supervisor-dashboard')}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-center text-xs font-semibold text-slate-200 transition"
              >
                Supervisor Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="p-6 border-t border-slate-800 text-center space-y-1">
        <p className="text-xs text-slate-500">&copy; 2026 NsuhRecords. All rights reserved.</p>
      </footer>

      {/* STAFF LOGIN MODAL */}
      {activeModal === 'staff' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedRole} Portal Access</h3>
                <p className="text-xs text-slate-400">Enter your Unique ID and password</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unique {selectedRole} ID</label>
                <input
                  type="text"
                  placeholder="e.g. STF-2026-089"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <button type="button" onClick={() => setActiveModal('forgot_password')} className="text-[11px] text-blue-400 hover:underline">
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Password Security Tool</span>
                  <button type="button" onClick={generateStrongPassword} className="text-[10px] font-bold text-blue-400 hover:underline">
                    Auto-Generate Password
                  </button>
                </div>
                {suggestedPassword && (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                    <span className="text-xs font-mono text-emerald-400 break-all">{suggestedPassword}</span>
                    <button type="button" onClick={copySuggestedPassword} className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-200 shrink-0">
                      {copiedNotification ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-blue-600/30">
                Login to {selectedRole} Portal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MASTER DEVELOPER AUTHENTICATION MODAL */}
      {activeModal === 'master' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                  Restricted Access
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Master Developer Portal</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleMasterDevLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Developer Email</label>
                <input
                  type="email"
                  placeholder="newlife8525@gmail.com"
                  value={developerEmail}
                  onChange={(e) => setDeveloperEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Master Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={developerPassword}
                  onChange={(e) => setDeveloperPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {masterError && (
                <p className="text-xs text-red-400 font-medium">{masterError}</p>
              )}

              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-amber-600/20">
                Authenticate & Access Master Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {activeModal === 'forgot_password' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Reset Staff Password</h3>
                <p className="text-xs text-slate-400">Restore your portal access</p>
              </div>
              <button onClick={() => setActiveModal('staff')} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unique Staff ID or Registered Email</label>
                <input
                  type="text"
                  placeholder="Enter your ID or email"
                  value={resetEmailOrId}
                  onChange={(e) => setResetEmailOrId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition">
                  Send Reset Link
                </button>
                <button type="button" onClick={() => setActiveModal('staff')} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-xs transition">
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}