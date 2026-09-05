'use client';
import { supabase } from '../../lib/supabase';
import React, { useState, useEffect } from 'react';

// All 10 Regions of Cameroon
const CAMEROON_REGIONS = [
  'Northwest',
  'Southwest',
  'Littoral',
  'Centre',
  'West',
  'Adamawa',
  'East',
  'Far North',
  'North',
  'South'
];

export default function MasterDeveloperPortal() {
  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerPassword, setDeveloperPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
const [currentTime, setCurrentTime] = useState(null);

  // Assigned schools state with localStorage sync
  const [schools, setSchools] = useState([]);
const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [auditStudents, setAuditStudents] = useState([]);
  const [auditTeachers, setAuditTeachers] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
const [generatedPass, setGeneratedPass] = useState('');
  const [generatedAdminCode, setGeneratedAdminCode] = useState('');
  useEffect(() => {
    async function fetchSchoolAuditData() {
      if (!selectedSchoolId) {
        setAuditStudents([]);
        setAuditTeachers([]);
        return;
      }

      setLoadingAudit(true);

      try {
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', selectedSchoolId);

        const { data: teachersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .eq('role', 'teacher');

        setAuditStudents(studentsData || []);
        setAuditTeachers(teachersData || []);
      } catch (err) {
        console.error('Error fetching audit data:', err);
      } finally {
        setLoadingAudit(false);
      }
    }

    fetchSchoolAuditData();
  }, [selectedSchoolId]);
  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data, error } = await supabase
      .from('assigned_schools')
      .select('*');
    if (!error && data) {
  const formatted = data.map(sch => ({
    ...sch,
    portalToken: sch.portal_token || sch.portalToken,
    portalLink: sch.portal_link || sch.portalLink
  }));
  setSchools(formatted);
}
  };

  
const [adminTab, setAdminTab] = useState('schools');

  // Form state for onboarding a new school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolRegion, setNewSchoolRegion] = useState('Northwest');
  const [newSchoolPlan, setNewSchoolPlan] = useState('Standard');

  // Portal signup/login simulation states for generated links
  const [activePortalToken, setActivePortalToken] = useState(null);
  const [portalViewMode, setPortalViewMode] = useState('signup');
  const [schoolAdminEmail, setSchoolAdminEmail] = useState('');
  const [schoolAdminPassword, setSchoolAdminPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [schoolAdminConfirmPassword, setSchoolAdminConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [suggestedPassword, setSuggestedPassword] = useState('');
  
  const [schoolAdminRegisteredCredentials, setSchoolAdminRegisteredCredentials] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCreds = localStorage.getItem('nsuh_school_admin_creds');
      if (savedCreds) {
        try { return JSON.parse(savedCreds); } catch (e) { /* ignore */ }
      }
    }
    return {};
  });
  const [portalLoginError, setPortalLoginError] = useState('');

  // Sync registered school admin credentials to localStorage for admin-dashboard login access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nsuh_school_admin_creds', JSON.stringify(schoolAdminRegisteredCredentials));
    }
  }, [schoolAdminRegisteredCredentials]);

  // Student Portal School Selection State
  const [selectedStudentSchoolId, setSelectedStudentSchoolId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
// Sync selected school ID across all sub-dashboards
  useEffect(() => {
    if (selectedSchoolId && typeof window !== 'undefined') {
      localStorage.setItem('school_id', selectedSchoolId);
      localStorage.setItem('currentSchoolId', selectedSchoolId);
    }
  }, [selectedSchoolId]);
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

// Handle Master Developer Login with security code
  const handleDeveloperLogin = (e) => {
    e.preventDefault();
    if (developerPassword === 'NsuhMaster2026_Secure!') {
      setIsAuthenticated(true);
      setLoginError('');
setDeveloperPassword('');
    } else {
      setLoginError('Incorrect Master Developer Code. Access Denied.');
    }
  };

    const handleLogout = () => {
        setIsAuthenticated(false);
    setSelectedSchoolId(null);
    setDeveloperEmail('');
    setDeveloperPassword('');
  };

    const toggleSchoolRestriction = async (schoolId) => {
  const targetSchool = schools.find(s => s.school_id === schoolId);
  if (!targetSchool) return;

  const nextStatus = targetSchool.status === 'Active' ? 'Restricted' : 'Active';

  const { error } = await supabase
    .from('assigned_schools')
    .update({ status: nextStatus })
    .eq('school_id', schoolId);

  if (!error) {
    setSchools(prev => prev.map(sch => 
      sch.school_id === schoolId ? { ...sch, status: nextStatus } : sch
    ));
  } else {
    alert("Error updating school restriction status: " + error.message);
  }
};

   const handleSoftDeleteSchool = async (schoolId) => {
    const { error } = await supabase
      .from('assigned_schools')
      .update({ is_deleted: true })
      .eq('school_id', schoolId);

    if (!error) {
      setSchools(prev => prev.map(sch => 
        sch.school_id === schoolId ? { ...sch, is_deleted: true } : sch
      ));
      if (selectedSchoolId === schoolId) setSelectedSchoolId(null);
    } else {
      alert("Error deleting school: " + error.message);
    }
  };

  const handleRestoreSchool = async (schoolId) => {
    const { error } = await supabase
      .from('assigned_schools')
      .update({ is_deleted: false })
      .eq('school_id', schoolId);

    if (!error) {
      setSchools(prev => prev.map(sch => 
        sch.school_id === schoolId ? { ...sch, is_deleted: false } : sch
      ));
    } else {
      alert("Error restoring school: " + error.message);
    }
  };

 const handlePermanentDeleteSchool = async (schoolId) => {
    const { error } = await supabase
      .from('assigned_schools')
      .delete()
      .eq('school_id', schoolId);

    if (!error) {
      setSchools(prev => prev.filter(sch => sch.school_id !== schoolId));
      if (selectedSchoolId === schoolId) setSelectedSchoolId(null);
    } else {
      alert("Error deleting school: " + error.message);
    }
  };

  // Generate a strong secure password suggestion meeting constraints
  const generateStrongPassword = () => {
    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowers = 'abcdefghijklmnopqrstuvwxyz';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const numbers = '0123456789';
    const allChars = uppers + lowers + specials + numbers;

    let pass = '';
    pass += uppers[Math.floor(Math.random() * uppers.length)];
    pass += lowers[Math.floor(Math.random() * lowers.length)];
    pass += specials[Math.floor(Math.random() * specials.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = 0; i < 5; i++) {
      pass += allChars[Math.floor(Math.random() * allChars.length)];
    }
    return pass;
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolEmail.trim() || !newSchoolPhone.trim()) return;

       const formattedId = crypto.randomUUID();
    const randomToken = Math.random().toString(36).substring(2) + (Date.now()).toString(36);

    const randomSuffix = Math.floor(Math.random() * 89999 + 10000);
    const dynamicDomain = `https://portal-edu-${randomSuffix}.cm`;
    const generatedPortalLink = `/register?schoolId=${formattedId}&token=${randomToken}`;

    // Auto-generate Primary Admin Credentials
    const cleanSchoolPrefix = newSchoolName.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const generatedAdminCode = `ADM-${cleanSchoolPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedMasterPassword = `NSUH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSchoolObj = {
      school_id: formattedId,
      name: newSchoolName.trim(),
      region: newSchoolRegion,
      contactEmail: newSchoolEmail.trim(),
      contactPhone: newSchoolPhone.trim(),
      portalLink: generatedPortalLink,
      portalToken: randomToken,
      status: 'Active',
      isDeleted: false,
      plan: newSchoolPlan,
      adminCode: generatedAdminCode,
      masterPassword: generatedMasterPassword,
      adminSlots: 1, // Pre-allocated 1/4 primary admin slot
      maxAdminSlots: 4,
      hasOnboarded: false, // Triggers welcome message on first login
      students: [],
      teachers: []
    };

    try {
      const { error } = await supabase
        .from('assigned_schools')
        .insert([{
         school_id: newSchoolObj.school_id,
          name: newSchoolObj.name,
          region: newSchoolObj.region,
          contact_email: newSchoolObj.contactEmail,
          contact_phone: newSchoolObj.contactPhone,
          portal_link: newSchoolObj.portalLink,
          portal_token: newSchoolObj.portalToken,
          plan: newSchoolObj.plan,
          status: 'Active',
          is_deleted: false
        }]);

      if (error) {
        alert("Error adding school: " + error.message);
      } else {
      // 1. Calculate dynamic academic year (e.g. "2026-2027")
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed (8 = Sept)
      const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
      const dynamicYearLabel = `${startYear}-${startYear + 1}`;

      // 2. Insert terms 1, 2, and 3 automatically
      const { error: termError } = await supabase.from('academic_terms').insert([
        { school_id: newSchoolObj.school_id, year_label: dynamicYearLabel, term_number: 1, is_active: true },
        { school_id: newSchoolObj.school_id, year_label: dynamicYearLabel, term_number: 2, is_active: false },
        { school_id: newSchoolObj.school_id, year_label: dynamicYearLabel, term_number: 3, is_active: false }
      ]);

      if (termError) {
        console.error("Warning: Failed to create academic terms:", termError.message);
      }

      // 3. Refresh list and clear form
      await fetchSchools();
      setNewSchoolName('');
      setNewSchoolEmail('');
      setNewSchoolPhone('');
}
    } catch (err) {
      console.error('Network Error:', err);
    }
    setAdminTab('schools');
    alert(`School "${newSchoolName}" successfully assigned!\nGenerated Portal Link: ${generatedPortalLink}`);
  };

  const activeSchools = schools.filter(s => !s.is_deleted);
const deletedSchools = schools.filter(s => Boolean(s.is_deleted));
const selectedSchool = schools.find(s => s.school_id === selectedSchoolId);
  const totalProjectUsers = schools.filter(s => !s.is_deleted).reduce((acc, s) => {
  const studentsCount = (s.students || s.students_count || (s.students_list ? s.students_list.length : 0));
  const teachersCount = (s.teachers || s.teachers_count || (s.teachers_list ? s.teachers_list.length : 0));
  const staffCount = (s.school_personnel ? s.school_personnel.length : (s.staff_count || 0));
  const adminCount = s.admin_code ? 1 : 0;
  
  // Sum embedded arrays if available, or fall back to aggregated array states
  const localTotal = (Array.isArray(s.students) ? s.students.length : 0) +
                     (Array.isArray(s.teachers) ? s.teachers.length : 0) +
                     (Array.isArray(s.school_personnel) ? s.school_personnel.length : 0) + 1; // +1 for School Admin

  return acc + localTotal;
}, 0) || (auditStudents.length + auditTeachers.length);

  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.includes('/portal/')) {
      const token = path.split('/portal/')[1];
      const targetSch = schools.find(s => s.portalToken === token);
      if (targetSch) {
        setActivePortalToken(token);
      }
    }
  }, [schools]);

  useEffect(() => {
    if (activePortalToken && portalViewMode === 'signup') {
      const strongPass = generateStrongPassword();
      setSuggestedPassword(strongPass);
      setSchoolAdminPassword(strongPass);
      setSchoolAdminConfirmPassword(strongPass);
    }
  }, [activePortalToken, portalViewMode]);

  // ==========================================
  // EXTERNAL SCHOOL PORTAL SIGNUP / LOGIN SCREEN
  // ==========================================
  if (activePortalToken) {
    const currentPortalSchool = schools.find(s => s.portalToken === activePortalToken);

    if (!currentPortalSchool) {
      return (
        <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 font-sans">
          <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl text-center space-y-4 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-red-400">Portal Not Found or Expired</h2>
            <p className="text-xs text-gray-400">The requested school portal link is invalid or has been removed.</p>
            <button 
              type="button"
              onClick={() => { setActivePortalToken(null); window.location.href = '/'; }}
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2.5 rounded-xl font-semibold cursor-pointer transition-colors"
            >
              Return to Master Portal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 font-sans">
        <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono px-3 py-1 rounded-full">
              {currentPortalSchool.name} Portal
            </span>
            <h2 className="text-xl font-bold text-white">
              {portalViewMode === 'signup' ? 'Administrator Account Setup' : 'Administrator Portal Access'}
            </h2>
            <p className="text-xs text-gray-400">
              {portalViewMode === 'signup' 
                ? 'Sign up with your email & password to activate your school administrative dashboard.'
                : 'Sign in with your email and password'}
            </p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (portalViewMode === 'signup') {
              if (!schoolAdminEmail || !schoolAdminPassword) return;

              const hasUpper = /[A-Z]/.test(schoolAdminPassword);
              const hasLower = /[a-z]/.test(schoolAdminPassword);
              const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(schoolAdminPassword);
              const isLongEnough = schoolAdminPassword.length >= 7;

              if (!hasUpper || !hasLower || !hasSpecial || !isLongEnough) {
                setPortalLoginError('Password must contain at least 7 characters, including one uppercase letter, one lowercase letter, and one special character.');
                return;
              }

              if (schoolAdminPassword !== schoolAdminConfirmPassword) {
                setPortalLoginError('Passwords do not match.');
                return;
              }

              // Save credentials globally so admin-dashboard login page recognizes it
          // Save admin credentials directly into Supabase
        const { error: updateError } = await supabase
          .from('assigned_schools')
          .update({
            admin_email: schoolAdminEmail.trim().toLowerCase(),
            admin_password: schoolAdminPassword.trim()
          })
          .eq('portal_token', activePortalToken);

        if (updateError) {
          console.error('Supabase update error:', updateError);
          setPortalLoginError('Failed to save credentials to database. Please try again.');
          return;
        }

        setPortalLoginError('');
        alert('Account registered successfully! Redirecting to login page...');
        setActivePortalToken(null);
        window.location.href = '/';
            } else {
              const creds = schoolAdminRegisteredCredentials[currentPortalSchool.id] || schoolAdminRegisteredCredentials.globalActive;
              if (creds && creds.email === schoolAdminEmail && creds.password === schoolAdminPassword) {
                setPortalLoginError('');
                window.location.href = '/admin-dashboard';
              } else {
                setPortalLoginError('Invalid administrator credentials. Please sign up if you haven\'t already.');
              }
            }
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
              <input 
                type="email"
                value={schoolAdminEmail}
                onChange={(e) => setSchoolAdminEmail(e.target.value)}
                placeholder="admin@institution.cm"
                required
                className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
                {portalViewMode === 'login' && (
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please check your Master Developer link console or sign up again to reset credentials.'); }} className="text-xs text-blue-400 hover:underline">Forgot Password?</a>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPortalPassword ? "text" : "password"}
                  value={schoolAdminPassword}
                  onChange={(e) => setSchoolAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 pr-16 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPortalPassword(!showPortalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {showPortalPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {portalViewMode === 'signup' && suggestedPassword && (
                <div className="mt-2 bg-[#1e293b]/80 border border-amber-500/30 p-2.5 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-semibold">Suggested Strong Password:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSchoolAdminPassword(suggestedPassword);
                        setSchoolAdminConfirmPassword(suggestedPassword);
                        alert(`Suggested password "${suggestedPassword}" applied!`);
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Use Password
                    </button>
                  </div>
                  <p className="font-mono text-gray-300 bg-[#07090e] p-1.5 rounded select-all">{suggestedPassword}</p>
                </div>
              )}
            </div>

            {portalViewMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={schoolAdminConfirmPassword}
                    onChange={(e) => setSchoolAdminConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 pr-16 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {portalLoginError && (
              <p className="text-xs text-red-400 bg-red-950/60 border border-red-800 p-2.5 rounded-xl text-center">
                {portalLoginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
            >
              {portalViewMode === 'signup' ? 'Complete Sign Up & Go to Dashboard' : 'Login to Admin Dashboard'}
            </button>
          </form>

          <div className="text-center pt-3 border-t border-gray-800 flex justify-between items-center text-xs">
            <button 
              type="button"
              onClick={() => {
                setPortalViewMode(portalViewMode === 'signup' ? 'login' : 'signup');
                setPortalLoginError('');
              }}
              className="text-amber-400 hover:underline cursor-pointer font-semibold"
            >
              {portalViewMode === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
            <button 
              type="button"
              onClick={() => { setActivePortalToken(null); window.location.href = '/'; }}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              Exit to Master
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATION SCREEN (SECURE GATEWAY)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 font-sans relative">
        <a 
          href="/"
          className="absolute top-6 left-6 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-lg"
        >
          ← Return to Root Homepage
        </a>

        <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6 mt-12">
          <div className="text-center space-y-2">
            <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono px-3 py-1 rounded-full mb-1">
              Secure Gateway Link
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Master Developer Portal</h2>
            <p className="text-xs text-gray-400">Authenticate to manage global school assignments & restrictions</p>
          </div>

          <form onSubmit={handleDeveloperLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Developer Email</label>
              <input 
                type="email" 
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                placeholder="developer@nsuhrecords.cm"
                required
                className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Master Security Code</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={developerPassword}
                  onChange={(e) => setDeveloperPassword(e.target.value)}
                  placeholder="Enter secret code..."
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 pr-16 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-400 bg-red-950/60 border border-red-800 p-2.5 rounded-xl text-center font-medium">
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
            >
              Access Developer Dashboard
            </button>
          </form>

          <div className="text-center text-[11px] text-gray-500 pt-3 border-t border-gray-800">
Authorized Personnel Only —             Norbert Che Nsuh
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DIRECT DEVELOPER DASHBOARD INTERFACE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <a 
            href="/"
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-md"
          >
            ← Back to Root App Home
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">NsuhRecords</h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                Master Developer Link Console
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Global Tenant Management & School Access Control</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-amber-400 font-semibold">
              {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
            </div>
            <div className="text-xs font-mono text-gray-400">
              {currentTime ? currentTime.toLocaleTimeString() : ''}
            </div>
          </div>
          <button 
type="button"
            onClick={handleLogout}
            className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs px-3.5 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Lock Session
          </button>
        </div>
      </header>

      {/* Sub Navbar Tabs */}
      <nav className="bg-[#0f172a]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
        {[
          { id: 'schools', label: 'Assigned Schools & Dashboard' },
          { id: 'register', label: 'Assign / Onboard School' },
{ id: 'student-portal', label: 'Student School Selection (Preview)' },
          { id: 'bin', label: `Trash / Restore (${deletedSchools.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
type="button"
            onClick={() => { setAdminTab(tab.id); setSelectedSchoolId(null); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              adminTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
                {selectedSchool ? (
/* SCHOOL DEEP AUDIT VIEW */
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#0f172a] border border-amber-500/40 p-5 rounded-2xl shadow-lg">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">Active Audit View — School ID: {selectedSchool.id}</span>
                <h2 className="text-2xl font-bold text-white mt-1">{selectedSchool.name}</h2>
                <p className="text-xs text-gray-400 mt-1">
Region: {selectedSchool.region} | Contact Phone: <span className="text-amber-300 font-mono">{selectedSchool.contactPhone}</span> | Portal: <button type="button" onClick={() => setActivePortalToken(selectedSchool.portalToken)} className="text-amber-400 underline cursor-pointer">{selectedSchool.portalLink}</button>
</p>
              </div>
            <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={() => setSelectedSchoolId(null)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
            >
              ← Back to All Schools Dashboard
            </button>
          </div>
            </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Registered Students</span>
<div className="flex items-baseline justify-between mt-2">
  <p className="text-4xl font-black text-emerald-400">
    {loadingAudit ? '...' : auditStudents.length}
  </p>
  <div className="flex gap-2 text-xs font-semibold">
    <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
      TE: {auditStudents.filter(s => (s.section || '').toLowerCase().includes('technical')).length}
    </span>
    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg">
      GE: {auditStudents.filter(s => (s.section || '').toLowerCase().includes('general')).length}
    </span>
  </div>
</div>
                              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Registered Teachers</span>
                <p className="text-4xl font-black mt-2 text-blue-400">
  {loadingAudit ? '...' : auditTeachers.length}
</p>
                              </div>
            </div>

            {/* Students Table */}
            <div className="bg-[#0f172a] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 bg-[#1e293b]/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Student Records & Guardian Contacts</h3>
              <button 
                onClick={() => {
                  const csvRows = [
                    ["ID", "Name", "Class", "Student Contact", "Guardian Name", "Guardian Contact"],
                    ...auditStudents.map(s => [
                      s.id || '', 
                      `"${s.full_name || s.name || ''}"`, 
                      `"${s.class_name || s.className || ''}"`, 
                      s.student_phone || s.contact || '', 
                      `"${s.guardian_name || s.guardianName || ''}"`, 
                      s.guardian_phone || s.guardianContact || ''
                    ])
                  ];
                  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `student_audit_school_${selectedSchoolId}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 font-medium transition"
              >
                Export CSV
              </button>
            </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase">
                    <tr>
                      <th className="p-3.5">ID / CODE</th>
<th className="p-3.5">NAME</th>
<th className="p-3.5">CLASS / LEVEL</th>
<th className="p-3.5">SECTION</th>
<th className="p-3.5">DATE OF BIRTH</th>
<th className="p-3.5">GUARDIAN NAME</th>
<th className="p-3.5">GUARDIAN CONTACT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loadingAudit ? (
  <tr><td colSpan="6" className="p-8 text-center text-amber-400 font-mono">Loading live student data from database...</td></tr>
) : auditStudents.length === 0 ? (
  <tr><td colSpan="6" className="p-8 text-center text-gray-500">No students registered yet.</td></tr>
) : (
  auditStudents.map((stu, i) => (
    <tr key={`${stu.id || 'stu'}-${i}`} className="hover:bg-gray-800/40">
 <td className="p-3.5 font-mono text-amber-400 font-bold">{stu.unique_code || stu.student_code || stu.code || stu.id || `STU-${i + 1}`}</td>
<td className="p-3.5 font-semibold text-white">{stu.fullName || stu.full_name || stu.name || 'N/A'}</td>
<td className="p-3.5 text-emerald-400 font-medium">{stu.classLevel || stu.class_name || stu.className || stu.class || 'N/A'}</td>
<td className="p-3.5 text-blue-400 font-medium">{stu.section || 'N/A'}</td>
<td className="p-3.5 font-mono text-amber-300">{stu.dob || 'N/A'}</td>
<td className="p-3.5">{stu.guardianName || stu.guardian_name || 'N/A'}</td>
<td className="p-3.5 font-mono">{stu.guardianPhone || stu.guardian_phone || 'N/A'}</td>
    </tr>
  ))
)}
                  </tbody>
                </table>
                {/* Live Staff & Teachers Table */}
          <div className="mt-6 border-t border-gray-800 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Staff & Teacher Roster</h3>
              <button 
                onClick={() => {
                  const csvRows = [
                    ["ID / Code", "Full Name", "Role / Subject", "Contact Phone"],
                    ...auditTeachers.map(t => [
                      t.id || '', 
                      `"${t.full_name || t.name || ''}"`, 
                      `"${t.subject || t.role || 'Teacher'}"`, 
                      t.phone || t.contact || ''
                    ])
                  ];
                  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `staff_audit_school_${selectedSchoolId}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 font-medium transition"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1e293b] text-gray-400 uppercase">
                  <tr>
                    <th className="p-3.5">ID / Code</th>
                    <th className="p-3.5">Full Name</th>
                    <th className="p-3.5">Role / Subject</th>
                    <th className="p-3.5">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loadingAudit ? (
                    <tr><td colSpan="4" className="p-8 text-center text-blue-400 font-mono">Loading live staff data...</td></tr>
                  ) : auditTeachers.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">No teachers registered yet.</td></tr>
                  ) : (
                    auditTeachers.map((tch, i) => (
                      <tr key={`${tch.id || 'tch'}-${i}`} className="hover:bg-gray-800/40">
                        <td className="p-3.5 font-mono text-blue-400 font-bold">{tch.id || `TCH-${i + 1}`}</td>
                        <td className="p-3.5 font-semibold text-white">{tch.full_name || tch.name || 'N/A'}</td>
                        <td className="p-3.5">{tch.subject || tch.role || 'Teacher'}</td>
                        <td className="p-3.5 font-mono">{tch.phone || tch.contact || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
              </div>
            </div>
          </div>
        ) : adminTab === 'schools' ? (
/* MAIN SCHOOLS DASHBOARD */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Assigned Schools</span>
                <p className="text-2xl font-black mt-2 text-white">{activeSchools.length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Access Portals</span>
                <p className="text-2xl font-black mt-2 text-emerald-400">{activeSchools.filter(s => s.status === 'Active').length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Restricted Portals</span>
                <p className="text-2xl font-black mt-2 text-red-400">{activeSchools.filter(s => s.status === 'Restricted').length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-2xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Project Users</span>
                <p className="text-2xl font-black mt-2 text-amber-400">{totalProjectUsers}</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Assigned Educational Institutions (Main Dashboard)</h3>
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">Click any row to audit records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">School ID</th>
                      <th className="p-3.5">Institution Name</th>
                      <th className="p-3.5">Region</th>
                      <th className="p-3.5">School Phone</th>
<th className="p-3.5">Assigned Portal Link (Clickable Signup)</th>
<th className="p-3.5">Admin Code & Password</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">Toggle Access</th>
                      <th className="p-3.5 text-center">Remove / Trash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {activeSchools.length === 0 ? (
                      <tr><td colSpan="8" className="p-8 text-center text-gray-500">No schools assigned yet.</td></tr>
                    ) : (
                      activeSchools.map((sch, idx) => (
  <tr
    key={sch.school_id || idx}
                          onClick={() => setSelectedSchoolId(sch.school_id)}
                          className="hover:bg-amber-500/10 cursor-pointer transition-colors group"
                        >
                          <td className="p-3.5 font-mono text-amber-400 font-bold">{sch.school_id}</td>
                          <td className="p-3.5 font-semibold text-white group-hover:text-amber-300 underline decoration-dotted">{sch.name}</td>
                          <td className="p-3.5 text-gray-300">{sch.region}</td>
                          <td className="p-3.5 font-mono text-amber-300 font-bold">{sch.contactPhone}</td>
                          <td className="p-3.5 font-mono text-amber-400">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePortalToken(sch.portalToken);
                                setPortalViewMode('signup');
                                setSchoolAdminEmail('');
                                setSchoolAdminPassword('');
                              }}
                              className="hover:underline text-left text-amber-400 cursor-pointer bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 block w-full truncate max-w-[220px]"
                              title="Click to open portal signup screen"
                            >
                              {sch.portalLink} ↗
                            </button>
</td>
<td className="p-3.5 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
  <div className="flex flex-col gap-1">
    <span className="text-amber-300 font-bold">{sch.adminCode || 'ADM-DEFAULT'}</span>
    <span className="text-gray-400 text-[11px]">{sch.masterPassword || 'NSUH-PASS'}</span>
    <button
      type="button"
      onClick={() => {
        const newPass = `NSUH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
       setSchools(prev => prev.map(s => s.school_id === sch.school_id ? { ...s, masterPassword: newPass } : s));
        alert(`New password generated for ${sch.name}: ${newPass}`);
      }}
      className="mt-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded transition-colors w-fit"
    >
      🔑 Regenerate Pass
    </button>
  </div>
</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              sch.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {sch.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
type="button"
                              onClick={(e) => { e.stopPropagation(); toggleSchoolRestriction(sch.school_id); }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-colors cursor-pointer ${
                                sch.status === 'Active' 
                                  ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800' 
                                  : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {sch.status === 'Active' ? 'Restrict School' : 'Lift Restriction'}
                            </button>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
type="button"
                            onClick={(e) => { e.stopPropagation(); handleSoftDeleteSchool(sch.school_id); }}
                              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : adminTab === 'register' ? (
/* ONBOARD SCHOOL FORM WITH AUTOMATIC RANDOM LINK GENERATION */
          <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl max-w-xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Assign New School & Auto-Generate Link</h2>

            <form onSubmit={handleAddSchool} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School / Institution Name</label>
                <input 
                  type="text" 
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g., Bamenda High School" 
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Email</label>
                  <input 
                    type="email" 
                    value={newSchoolEmail}
                    onChange={(e) => setNewSchoolEmail(e.target.value)}
                    placeholder="admin@school.cm" 
                    required
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Phone Number</label>
                  <input 
                    type="text" 
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    placeholder="670000000" 
                    required
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Region</label>
                  <select 
                    value={newSchoolRegion}
                    onChange={(e) => setNewSchoolRegion(e.target.value)}
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white"
                  >
                    {CAMEROON_REGIONS.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Subscription Plan</label>
                  <select 
                    value={newSchoolPlan}
                    onChange={(e) => setNewSchoolPlan(e.target.value)}
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Standard">Standard Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors mt-2 cursor-pointer"
              >
                Assign School & Auto-Generate Random Portal Link
              </button>
            </form>
          </div>
        ) : adminTab === 'student-portal' ? (
          /* STUDENT SCHOOL SELECTION & REGISTRATION PREVIEW */
          <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl max-w-xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Student Portal: Select Assigned School</h2>
            <p className="text-xs text-gray-400">
              Below are all the schools successfully created and assigned from the Master Developer portal. Students can select their institution to register.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!selectedStudentSchoolId || !studentName.trim() || !studentClass.trim()) {
                alert('Please select a school and fill in student details.');
                return;
              }
              setSchools(prev => prev.map(sch => {
                if (sch.id === selectedStudentSchoolId) {
                  return {
                    ...sch,
                    students: [
                      ...sch.students,
                      {
                        id: `STU-${Date.now().toString().slice(-4)}`,
                        name: studentName.trim(),
                        className: studentClass.trim(),
                        contact: '600000000',
                        guardianName: 'Parent / Guardian',
                        guardianContact: '600000000'
                      }
                    ]
                  };
                }
                return sch;
              }));
              alert(`Successfully registered "${studentName}" under the selected school! Check the school audit view to verify.`);
              setStudentName('');
              setStudentClass('');
              setSelectedStudentSchoolId('');
            }} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select School</label>
                <select 
                  value={selectedStudentSchoolId}
                  onChange={(e) => setSelectedStudentSchoolId(e.target.value)}
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white"
                >
                  <option value="">-- Choose Assigned School --</option>
                  {activeSchools.map((sch, idx) => (
  <option key={`${sch.id || 'sch'}-${sch.name || idx}-${idx}`} value={sch.id}>
    {sch.name} ({sch.region} Region - Phone: {sch.contactPhone})
  </option>
))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Student Full Name</label>
                <input 
                  type="text" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., John Nsuh" 
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Class / Form</label>
                <input 
                  type="text" 
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="e.g., Form 5 / Terminale" 
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors mt-2 cursor-pointer"
              >
                Submit Student Registration to Selected School
              </button>
            </form>
          </div>
        ) : (
          /* TRASH BIN */
            <div className="bg-[#0f172a] border border-gray-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Deleted Schools Trash & Safe Recovery / Permanent Removal</h3>
              
              {deletedSchools.length === 0 ? (
                <p className="text-xs text-gray-500 bg-[#1e293b]/40 p-4 rounded-xl border border-gray-800 text-center">Trash is currently empty.</p>
              ) : (
                <div className="space-y-3">
                  {deletedSchools.map(sch => (
                    <div key={sch.school_id} className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl border border-gray-700 shadow">
                      <div>
                        <span className="text-xs font-mono text-amber-400 font-bold">{sch.school_id}</span>
                        <h4 className="font-bold text-white text-sm mt-0.5">{sch.name}</h4>
                        <p className="text-[11px] text-gray-400">{sch.region} Region | Phone: {sch.contactPhone} | Portal: {sch.portalLink}</p>
                      </div>
<div className="flex gap-2">
                      <button
type="button"
                        onClick={() => handleRestoreSchool(sch.school_id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
                      >
                        Restore School
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Permanently remove "${sch.name}"? This action cannot be undone.`)) {
                            handlePermanentDeleteSchool(sch.school_id);
                          }
                        }}
                        className="bg-red-900/80 hover:bg-red-800 text-red-200 text-xs px-3 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
                      >
                        Delete Completely
                      </button>
</div>
                    </div>
                  ))}
                </div>
              )}
                      </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
        App conceived by Norbert Che Nsuh — 682491189
      </footer>
    </div>
  );
}