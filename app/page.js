'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LandingPage() {
  // Student Direct Access Form State
  const [selectedSchool, setSelectedSchool] = useState('');
  const [studentId, setStudentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Searchable School Dropdown State
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Authentication Modals State
  const [activeModal, setActiveModal] = useState(null); // 'staff' | 'forgot_password' | 'about' | 'contact' | null
  const [selectedRole, setSelectedRole] = useState('');
  const [rolePath, setRolePath] = useState('');

  // Staff Credentials & Smooth UX States
  const [staffId, setStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recentTeacherId, setRecentTeacherId] = useState('');
  const [rememberTeacherId, setRememberTeacherId] = useState(true);
  const [staffLoginError, setStaffLoginError] = useState('');

  // Adaptive Verification Window (Only shown on slow/no network, or flashed momentarily during fast auth)
  // 0 = form, 1 = verifying credentials, 2 = verifying school details, 3 = searching teacher info, 4 = boom login
  const [loginStep, setLoginStep] = useState(0);
  const [isSlowNetworkMode, setIsSlowNetworkMode] = useState(false);
  const [verifiedTeacherPreview, setVerifiedTeacherPreview] = useState(null);

  const [resetEmailOrId, setResetEmailOrId] = useState('');
  const [resetStatusMessage, setResetStatusMessage] = useState('');

  // Dynamic Assigned Schools (Fetched from Master Admin / Supabase assignments)
  const [assignedSchools, setAssignedSchools] = useState([]);

  // Forceful App Download Pop-Up State
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  useEffect(() => {
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

    if (!isStandalone) {
      setShowDownloadPopup(true);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowDownloadPopup(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  // Load saved recent Teacher ID on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('classlogs_recent_teacher_id');
      if (savedId) {
        setRecentTeacherId(savedId);
      }
    }
  }, []);

  const handleDirectInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      setDeferredInstallPrompt(null);
      setShowDownloadPopup(false);
    } else {
      alert('To install ClassLogs on your phone:\n\n• Android (Chrome): Tap the 3 dots (⋮) at the top right → "Install app" or "Add to Home screen".\n• iPhone (Safari): Tap the Share icon (↑) at the bottom → "Add to Home Screen".');
      setShowDownloadPopup(false);
    }
  };

  // Fetch assigned schools on load
  React.useEffect(() => {
    const fetchAssignedSchools = async () => {
      try {
        const { data, error } = await supabase.from('assigned_schools').select('*');
        if (!error && data) {
          setAssignedSchools(data);
        }
      } catch (err) {
        setAssignedSchools([]);
      }
    };
    fetchAssignedSchools();
  }, []);

  // Close searchable dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSchoolDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered schools based on search input
  const filteredSchools = assignedSchools.filter((school) => {
    const name = school.name || school.institution_name || '';
    return name.toLowerCase().includes(schoolSearchQuery.toLowerCase());
  });

  const selectedSchoolObj = assignedSchools.find(s => (s.school_id || s.id) === selectedSchool);

  // 1-Tap Clipboard Paste Helper
  const handlePasteId = async () => {
    setStaffLoginError('');
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setStaffId(text.trim());
        } else {
          setStaffLoginError('Clipboard is currently empty.');
        }
      } else {
        setStaffLoginError('Tap and hold the box to paste your copied code.');
      }
    } catch (err) {
      setStaffLoginError('Please allow clipboard permission or paste manually into the box.');
    }
  };

  // Handlers
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    const selectedSchoolData = assignedSchools.find(s => (s.school_id || s.id) === selectedSchool);
    if (selectedSchoolData && selectedSchoolData.status === 'Restricted') {
      setErrorMessage('Your school has been restricted. Please contact your school administrator for more details.');
      return;
    }
    if (!selectedSchool || !studentId) {
      setErrorMessage('Please select a school and enter your Student Unique ID.');
      return;
    }

    setErrorMessage('');

    // Query student tables directly with school and unique ID matching without prefix barriers
    let matchedStudent = null;

    const { data: studentData, error: studentErr } = await supabase
      .from('students')
      .select('id, school_id, unique_code')
      .eq('unique_code', studentId.trim())
      .eq('school_id', selectedSchool)
      .maybeSingle();

    if (!studentErr && studentData) {
      matchedStudent = studentData;
    } else {
      const { data: techData } = await supabase
        .from('technical_commercial_students')
        .select('id, school_id, unique_code')
        .eq('unique_code', studentId.trim())
        .eq('school_id', selectedSchool)
        .maybeSingle();

      if (techData) {
        matchedStudent = techData;
      } else {
        const { data: indData } = await supabase
          .from('technical_industrial_students')
          .select('id, school_id, unique_code')
          .eq('unique_code', studentId.trim())
          .eq('school_id', selectedSchool)
          .maybeSingle();

        if (indData) {
          matchedStudent = indData;
        } else {
          const { data: genData } = await supabase
            .from('general_education_students')
            .select('id, school_id, unique_code')
            .eq('unique_code', studentId.trim())
            .eq('school_id', selectedSchool)
            .maybeSingle();

          if (genData) {
            matchedStudent = genData;
          }
        }
      }
    }

    if (!matchedStudent) {
      setErrorMessage('Authentication Failed: Student ID not found for the selected school.');
      return;
    }

    // Bind active school context for multi-tenant isolation
    localStorage.setItem('active_school_id', selectedSchool);
    localStorage.setItem('student_unique_id', studentId.trim());
    localStorage.setItem('student_row_id', matchedStudent.id);

    // Set active school session context in PostgreSQL
    await supabase.rpc('set_active_school', { school_id: selectedSchool });

    // Redirect to Student Dashboard Router
    const targetSchool = assignedSchools.find(s => (s.school_id || s.id) === selectedSchool);
    const schoolName = targetSchool ? (targetSchool.name || targetSchool.institution_name) : '';

    window.location.href = `/student-dashboard?id=${encodeURIComponent(studentId.trim())}&row_id=${encodeURIComponent(matchedStudent.id)}&school_name=${encodeURIComponent(schoolName)}&school_id=${encodeURIComponent(selectedSchool)}`;
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffLoginError('');
    setVerifiedTeacherPreview(null);

    if (!staffId || !staffPassword) {
      setStaffLoginError('Please enter your credentials and password.');
      return;
    }

    const inputIdentifier = staffId.trim();
    const inputPassword = staffPassword.trim();
    const isEmail = inputIdentifier.includes('@');

    // Detect slow or offline network: if requests take > 1100ms or offline, show step progress window
    const isOfflineInitially = typeof navigator !== 'undefined' && navigator.onLine === false;
    setIsSlowNetworkMode(isOfflineInitially);
    setLoginStep(1);

    const slowTimer = setTimeout(() => {
      setIsSlowNetworkMode(true);
    }, 1100);

    const resetLoginState = (msg) => {
      clearTimeout(slowTimer);
      setLoginStep(0);
      setIsSlowNetworkMode(false);
      setStaffLoginError(msg);
    };

    // 1. TEACHER LOGIN
    if (selectedRole === 'Teacher') {
      let targetEmail = inputIdentifier.toLowerCase();
      let teacherData = null;

      let teacherQuery = supabase
        .from('teachers')
        .select('*');

      if (isEmail) {
        teacherQuery = teacherQuery.eq('email', inputIdentifier.toLowerCase());
      } else {
        teacherQuery = teacherQuery.eq('teacher_id', inputIdentifier);
      }

      const { data: teacher, error: teacherErr } = await teacherQuery.maybeSingle();

      if (teacherErr || !teacher) {
        resetLoginState('Invalid Email or Unique Code.');
        return;
      }

      teacherData = teacher;
      targetEmail = teacher.email
        ? teacher.email.trim().toLowerCase()
        : `${teacher.teacher_id.toLowerCase()}@nsuhrecords.internal`;

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: inputPassword,
      });

      if (authErr) {
        resetLoginState('Invalid password. Please check your credentials.');
        return;
      }

      setLoginStep(2);

      const teacherName = teacherData.full_name || teacherData.name || teacherData.teacher_name || 'Teacher';
      const schoolName = teacherData.assigned_schools?.institution_name || teacherData.school_name || 'Assigned School';
      setVerifiedTeacherPreview({ name: teacherName, school: schoolName });

      setLoginStep(3);

      localStorage.setItem('active_teacher_id', teacherData.teacher_id || '');
      localStorage.setItem('active_teacher_name', teacherName);
      localStorage.setItem('active_school_id', teacherData.school_id || '');
      localStorage.setItem('active_school_name', schoolName);

      if (rememberTeacherId) {
        const idToSave = teacherData.teacher_id || inputIdentifier;
        localStorage.setItem('classlogs_recent_teacher_id', idToSave);
        setRecentTeacherId(idToSave);
      } else {
        localStorage.removeItem('classlogs_recent_teacher_id');
        setRecentTeacherId('');
      }

      if (teacherData.school_id) {
        await supabase.rpc('set_active_school', { school_id: teacherData.school_id });
      }

      clearTimeout(slowTimer);
      setLoginStep(4);
      window.location.href = rolePath;
      return;
    }

    // 2. OTHER SCHOOL STAFF (Administrators, Bursar, Supervisor, Discipline Master, Principal, etc.)
    if (selectedRole !== 'Administrator') {
      const cleanId = inputIdentifier.trim();

      const [pRes, aRes] = await Promise.all([
        supabase
          .from('school_personnel')
          .select('*')
          .or(`unique_id.eq.${cleanId},email.eq.${cleanId.toLowerCase()}`)
          .maybeSingle(),
        supabase
          .from('assigned_schools')
          .select('*')
          .or(`unique_id.eq.${cleanId},email.eq.${cleanId.toLowerCase()}`)
          .maybeSingle()
      ]);

      const personnel = pRes.data || aRes.data;

      if (!personnel) {
        resetLoginState('Invalid Email or Unique Code.');
        return;
      }

      const targetEmail = personnel.email
        ? personnel.email.trim().toLowerCase()
        : `${personnel.unique_id.toLowerCase()}@nsuhrecords.internal`;

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: inputPassword,
      });

      if (authErr) {
        resetLoginState('Invalid password. Please check your credentials.');
        return;
      }

      setLoginStep(2);

      let verifiedSchoolName = personnel.school_name || '';
      if (personnel.school_id) {
        const { data: schoolData } = await supabase
          .from('assigned_schools')
          .select('institution_name, name')
          .eq('school_id', personnel.school_id)
          .maybeSingle();

        if (schoolData) {
          verifiedSchoolName = schoolData.institution_name || schoolData.name || verifiedSchoolName;
        }
      }

      setLoginStep(3);

      const staffName = personnel.full_name || personnel.name || 'Staff Member';
      setVerifiedTeacherPreview({ name: staffName, school: verifiedSchoolName });

      localStorage.setItem('active_staff_id', personnel.unique_id || '');
      localStorage.setItem('active_staff_name', staffName);

      if (personnel.school_id) {
        localStorage.setItem('active_school_id', personnel.school_id);
        localStorage.setItem('active_school_name', verifiedSchoolName);
        await supabase.rpc('set_active_school', { school_id: personnel.school_id });
      }

      clearTimeout(slowTimer);
      setLoginStep(4);

      if (personnel?.role && personnel.role.toLowerCase().trim() === 'bursar') {
        window.location.href = '/bursar-dashboard';
        return;
      }
      window.location.href = rolePath;
      return;
    }

    // 3. ADMINISTRATOR & FALLBACK (assigned_schools table)
    let query = supabase.from('assigned_schools').select('*');

    if (isEmail) {
      query = query.eq('admin_email', inputIdentifier.toLowerCase());
    } else {
      query = query.or(`admin_code.eq.${inputIdentifier},school_id.eq.${inputIdentifier}`);
    }

    const { data: school, error } = await query.maybeSingle();

    if (error || !school) {
      resetLoginState('Invalid Email or Unique Code.');
      return;
    }

    if (school.status === 'Restricted') {
      resetLoginState('Access Restricted: Your school account is currently restricted. Please contact the school administrator.');
      return;
    }

    if (school.admin_password !== inputPassword) {
      resetLoginState('Invalid password. Please check your credentials.');
      return;
    }

    setLoginStep(2);
    setVerifiedTeacherPreview({ name: 'School Administrator', school: school.institution_name || '' });
    setLoginStep(3);

    localStorage.setItem('active_school_id', school.school_id);
    localStorage.setItem('active_school_name', school.institution_name || '');
    localStorage.setItem('active_school_email', school.admin_email || '');

    await supabase.rpc('set_active_school', { school_id: school.school_id });

    clearTimeout(slowTimer);
    setLoginStep(4);
    window.location.href = rolePath;
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetStatusMessage('');

    if (!resetEmailOrId) {
      alert('Please enter your Registered Email.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmailOrId.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setResetStatusMessage(`Error: ${error.message}`);
      } else {
        alert(`Password reset instructions have been successfully sent to: ${resetEmailOrId}`);
        setActiveModal('staff');
      }
    } catch (err) {
      setResetStatusMessage('An unexpected error occurred. Please try again.');
    }
  };

  const openStaffModal = (roleName, path) => {
    setSelectedRole(roleName);
    setRolePath(path);
    setStaffLoginError('');
    setLoginStep(0);
    setIsSlowNetworkMode(false);
    setShowPassword(false);
    setStaffPassword('');

    if (roleName === 'Teacher' && typeof window !== 'undefined') {
      const savedTeacherId = localStorage.getItem('classlogs_recent_teacher_id') || '';
      setStaffId(savedTeacherId);
      setRecentTeacherId(savedTeacherId);
    } else {
      setStaffId('');
    }

    setActiveModal('staff');
  };

  const verificationSteps = [
    { step: 1, title: 'Verifying credentials', desc: 'Checking your Unique Code & Password' },
    { step: 2, title: 'Verifying school details', desc: 'Confirming active institution registry' },
    { step: 3, title: 'Searching teacher information', desc: 'Loading assigned subjects & classes' },
    { step: 4, title: 'Boom! Authenticated', desc: 'Entering your portal now...' },
  ];

  const showVerificationWindow = isSlowNetworkMode && loginStep > 0;

  return (
    <div className="min-h-screen bg-[#0b132b] text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-6 border-b border-slate-800 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shadow-blue-500/30">
            CLs
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ClassLogs</h1>
            <p className="text-xs text-slate-400">Academic Year 2026 - 2027</p>
          </div>
        </div>

        {/* Top Header Menu Navigation */}
        <nav className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveModal('about')}
            className="text-slate-300 hover:text-blue-400 transition cursor-pointer"
          >
            ABOUT
          </button>
          <button
            type="button"
            onClick={handleDirectInstall}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg transition shadow cursor-pointer"
          >
            DOWNLOAD APP
          </button>
          <button
            onClick={() => setActiveModal('contact')}
            className="text-slate-300 hover:text-blue-400 transition cursor-pointer"
          >
            CONTACT
          </button>
        </nav>
      </header>

      {/* Hero Content Area */}
      <section className="max-w-7xl mx-auto px-6 py-8 sm:py-12 grid md:grid-cols-2 gap-12 items-start w-full my-auto">
        <div className="space-y-6">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Modern Mobile Registry for General & Technical Education
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Eliminating paper delays across Cameroonian schools. Teachers submit sequence scores and progression sheets instantly, parents track live grades, and school leaders manage complete fee records—online or offline.
          </p>
          
          <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">
              Why ClassLogs?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For decades, manual result compilation delayed term performance and results updates. ClassLogs brings real-time Modern-style registry standards to General and Technical (CAP, Industrial F-Series, Commercial STT) schools, featuring instant student access and enterprise-grade data security.
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
            
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select School</label>
              <div 
                onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white cursor-pointer flex justify-between items-center focus:border-blue-500"
              >
                <span className={selectedSchoolObj ? 'text-white' : 'text-slate-400'}>
                  {selectedSchoolObj ? (selectedSchoolObj.name || selectedSchoolObj.institution_name) : (assignedSchools.length === 0 ? '-- No schools assigned yet --' : '-- Choose your school --')}
                </span>
                <span className="text-slate-400 text-xs">▼</span>
              </div>

              {isSchoolDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-slate-700">
                    <input
                      type="text"
                      placeholder="Type school name to search..."
                      value={schoolSearchQuery}
                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedSchool('');
                        setIsSchoolDropdownOpen(false);
                        setSchoolSearchQuery('');
                      }}
                      className="px-3 py-2 text-xs text-slate-400 hover:bg-slate-700 cursor-pointer"
                    >
                      -- Choose your school --
                    </div>
                    {filteredSchools.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500 text-center">No school found</div>
                    ) : (
                      filteredSchools.map((school) => {
                        const sName = school.name || school.institution_name;
                        const sId = school.school_id || school.id;
                        return (
                          <div
                            key={sId}
                            onClick={() => {
                              setSelectedSchool(sId);
                              setIsSchoolDropdownOpen(false);
                              setSchoolSearchQuery('');
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-600 hover:text-white ${selectedSchool === sId ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-200'}`}
                          >
                            {sName}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Unique ID</label>
              <input 
                type="text" 
                placeholder="E.G. DT-TACY1COM15G26"
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
                onClick={() => openStaffModal('Administrator', '/admin-dashboard')}
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
                onClick={() => openStaffModal('Discipline Master', '/discipline-master-dashboard')}
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
        <p className="text-xs text-slate-500">&copy; 2026 ClassLogs by NsuRecords. All rights reserved.</p>
      </footer>

      {/* ABOUT MODAL */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 sticky top-0 bg-slate-900 z-10">
              <div>
                <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Product Overview</span>
                <h3 className="text-xl font-extrabold text-white">What is ClassLogs</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
            </div>

            <div className="space-y-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <p className="text-sm font-semibold text-white bg-blue-900/30 p-3.5 rounded-xl border border-blue-700/40">
                ClassLogs by NsuRecords is not just as an ordinary school management app like any other, It is an operational control center for school administrators, teachers and students.
              </p>

              <p className="font-bold text-white text-base pt-1">
                Here is why ClassLogs is an Indispensible Tool for all Secondary and High Schools:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-blue-400 text-sm">
                    "ClassLogs is Built Specifically for Cameroonian Classrooms, Not Generic Schools"
                  </h4>
                  <p className="text-slate-300">
                    "Other apps force you to adapt your technical or commercial trade series to their basic template. ClassLogs comes pre-configured for official MINSEC trade codes and academic series out of the box."
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-amber-400 text-sm">
                    Real-Time Inspectorate & Syllabus Tracking
                  </h4>
                  <p className="text-slate-300">
                    Stop flipping through physical paper logbooks. ClassLogs digitizes daily teacher log sheets so administrators can track lesson progression per subject in real time across the entire term and year. This is coupled with an official MINSEC link that can be sent to supervisors to track teacher progression sheets.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-emerald-400 text-sm">
                    One Minute Report Generation and Instant Download
                  </h4>
                  <p className="text-slate-300">
                    Do not disturb teachers to fill report cards manually, rather enforce them to fill marks from their phones and get them centralised into a unified master mark sheet that automatically calculates averages, ranks students, and produce report cards that can be downloaded instantly with just a click from any devise.
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-purple-400 text-sm">
                    "Zero Software Maintenance via Multi-Tenancy"
                  </h4>
                  <p className="text-slate-300">
                    "You don't need local IT servers or complex database maintenance when there is any technical error. Our cloud multi-tenant framework means your school gets instant access, enterprise-level security, and continuous updates without taking down your system."
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-cyan-400 text-sm">
                    "Blazing Fast on Any Device"
                  </h4>
                  <p className="text-slate-300">
                    "Built on modern React and web standards, the app loads instantly on cheap smartphones, tablets, or old desktop computers, even on slow mobile connections." Though it requires the internet
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <h4 className="font-bold text-pink-400 text-sm">
                    Parents track their student performance at home
                  </h4>
                  <p className="text-slate-300">
                    With a dedicated Parent/students portal, parents can track the results of their children back by using just the student matricule.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveModal('contact')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/30"
              >
                Claim Your 03 Months Free Trial →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Direct Onboarding & Support</span>
                <h3 className="text-xl font-extrabold text-white">CONTACT US</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
            </div>

            <div className="space-y-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-700/50 space-y-2">
                <h4 className="text-base font-bold text-white">Need an app like this for your school?</h4>
                <p className="text-slate-200">
                  Installation is simple, contact us via the number <strong className="text-emerald-400 text-sm">682491149</strong> and get a <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">03 months free trial version</span>. You only pay once you are satisfied with the results.
                </p>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">About The Engineering Team</h4>
                <p className="text-slate-300">
                  NsuRecords is a Software Engineering Company specialised in the production of all kinds of software that solves real life problems. Front end, and back end web developement, mobile applications and any digital product on demand are related services.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-800">
              <span className="text-xs text-slate-400">Call / WhatsApp: 682491149</span>
              <button
                onClick={() => setActiveModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF / TEACHER LOGIN MODAL */}
      {activeModal === 'staff' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity duration-150">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/70 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(37,99,235,0.25)] relative overflow-hidden">

            {/* VIEW A: INSTANT CREDENTIAL FORM */}
            {!showVerificationWindow && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-800/80 pb-4">
                  <div className="space-y-1 pr-4">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      {selectedRole} Portal
                    </div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      {selectedRole} Portal Access
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedRole === 'Teacher'
                        ? 'Input your Unique Code and Password to proceed to the teacher portal.'
                        : 'Enter your Email or Unique Code and password'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-8 h-8 rounded-full bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Recent Teacher ID Quick-Select Pill */}
                {selectedRole === 'Teacher' && recentTeacherId && staffId !== recentTeacherId && (
                  <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/50 rounded-2xl px-3.5 py-2.5">
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Recent Teacher Code</span>
                      <span className="text-blue-300 font-bold">{recentTeacherId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaffId(recentTeacherId)}
                      className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                    >
                      Use Code
                    </button>
                  </div>
                )}

                <form onSubmit={handleStaffLogin} className="space-y-4">
                  {/* Unique Code Input + 1-Tap Paste Button */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        {selectedRole === 'Teacher' ? 'Unique Teacher Code (or Email)' : `Email or Unique ${selectedRole} ID / Code`}
                      </label>
                      {staffId && (
                        <button
                          type="button"
                          onClick={() => setStaffId('')}
                          className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        name="username"
                        placeholder={selectedRole === 'Teacher' ? 'e.g. TCH-2026-089' : 'e.g. staff@school.cm or STF-2026-089'}
                        value={staffId}
                        onChange={(e) => {
                          setStaffId(e.target.value);
                          setStaffLoginError('');
                        }}
                        autoComplete="username"
                        className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-4 pr-20 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={handlePasteId}
                        title="Paste copied Unique Code"
                        className="absolute right-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 hover:border-blue-500 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* Password Input + Show/Hide Eye Toggle */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setActiveModal('forgot_password')}
                        className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline transition"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="Enter your password"
                        value={staffPassword}
                        onChange={(e) => {
                          setStaffPassword(e.target.value);
                          setStaffLoginError('');
                        }}
                        autoComplete="current-password"
                        className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Unique Code Checkbox for Teachers */}
                  {selectedRole === 'Teacher' && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
                      <input
                        type="checkbox"
                        checked={rememberTeacherId}
                        onChange={(e) => setRememberTeacherId(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-300">
                        Remember my Unique Code on this device for instant next login
                      </span>
                    </label>
                  )}

                  {/* Soft Inline Error Alert */}
                  {staffLoginError && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium flex items-center gap-2">
                      <span className="text-red-400 font-bold">!</span>
                      <span>{staffLoginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginStep > 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-75 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-[0.99] cursor-pointer"
                  >
                    {loginStep > 0 ? 'Signing in...' : `Login to ${selectedRole} Portal`}
                  </button>
                </form>
              </div>
            )}

            {/* VIEW B: SLOW / NO NETWORK VERIFICATION WINDOW */}
            {showVerificationWindow && (
              <div className="py-4 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                    <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    {loginStep === 4 ? 'Boom! Authenticated' : 'Slow Network Detected — Verifying...'}
                  </h3>
                  <p className="text-xs text-amber-300/90">
                    {typeof navigator !== 'undefined' && navigator.onLine === false
                      ? 'No internet connection detected. Waiting for connection...'
                      : 'Connection is slow. Step-by-step verification is active.'}
                  </p>
                  {verifiedTeacherPreview && (
                    <p className="text-xs text-emerald-400 font-semibold">
                      {verifiedTeacherPreview.name} • {verifiedTeacherPreview.school}
                    </p>
                  )}
                </div>

                <div className="space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                  {verificationSteps.map((item) => {
                    const isCompleted = loginStep > item.step || loginStep === 4;
                    const isActive = loginStep === item.step && loginStep < 4;

                    return (
                      <div
                        key={item.step}
                        className={`flex items-center gap-3 ${
                          loginStep < item.step ? 'opacity-35' : 'opacity-100'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                          ) : isActive ? (
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                              {item.step}
                            </span>
                          )}
                        </div>

                        <div className="text-left">
                          <p
                            className={`text-xs font-bold ${
                              isCompleted
                                ? 'text-emerald-300'
                                : isActive
                                ? 'text-white'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                <p className="text-xs text-slate-400">Restore your portal access via email</p>
              </div>
              <button onClick={() => setActiveModal('staff')} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={resetEmailOrId}
                  onChange={(e) => setResetEmailOrId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {resetStatusMessage && (
                <p className={`text-xs font-medium ${resetStatusMessage.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {resetStatusMessage}
                </p>
              )}

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

      {/* FORCEFUL APP DOWNLOAD POP-UP */}
      {showDownloadPopup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg">
                CLs
              </div>
              <img
                src="/cls-logo.png"
                alt="ClassLogs Logo"
                className="w-14 h-14 rounded-2xl bg-white p-1 object-contain shadow"
              />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Action Required • Official ClassLogs App
              </span>
              <h3 className="text-2xl font-black text-white">
                Download & Install ClassLogs Now
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Install the ClassLogs app on your phone or computer now for instant live schedule updates with sound, faster login, and zero manual page refreshes.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition shadow-lg"
              >
                Install App Now (1-Tap)
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadPopup(false)}
                className="w-full text-slate-400 hover:text-slate-200 text-xs font-semibold pt-1 transition"
              >
                Continue to Web Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}