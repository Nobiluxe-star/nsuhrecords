'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('schools');
  const [currentTime, setCurrentTime] = useState(null);

  // Master Developer Authentication State
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerPassword, setDeveloperPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeveloperAuthenticated, setIsDeveloperAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Schools state loaded dynamically from Supabase `assigned_schools` table
  const [schools, setSchools] = useState([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // Selected school for deep student & teacher auditing
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  // Edit School Modal State
  const [editingSchool, setEditingSchool] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRegion, setEditRegion] = useState('Northwest');

  // Form state for assigning a new school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolRegion, setNewSchoolRegion] = useState('Northwest');
  const [newSchoolPlan, setNewSchoolPlan] = useState('Standard');

  // Modal / view state for copying generated school sign-up link
  const [createdSchoolResult, setCreatedSchoolResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDeveloperAuthenticated) {
      fetchAssignedSchools();
    }
  }, [isDeveloperAuthenticated]);

  const fetchAssignedSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const [schoolsRes, personnelRes, teachersRes] = await Promise.all([
        supabase.from('assigned_schools').select('*'),
        supabase.from('school_personnel').select('school_id, id'),
        supabase.from('teachers').select('school_id, teacher_id')
      ]);

      if (schoolsRes.error) {
        console.error('Error fetching assigned schools:', schoolsRes.error);
      } else if (schoolsRes.data) {
        const personnelData = personnelRes.data || [];
        const teachersData = teachersRes.data || [];

        const mappedSchools = await Promise.all(schoolsRes.data.map(async (item) => {
          const sId = item.school_id || item.id;
          
          // Query all student tables for complete student count
          const [baseStudents, genRes, techCommRes, techIndRes] = await Promise.all([
            supabase.from('students').select('*').eq('school_id', sId),
            supabase.from('general_education_students').select('*').eq('school_id', sId),
            supabase.from('technical_commercial_students').select('*').eq('school_id', sId),
            supabase.from('technical_industrial_students').select('*').eq('school_id', sId)
          ]);

          const bStu = baseStudents.data || [];
          const genStu = genRes.data || [];
          const tcStu = techCommRes.data || [];
          const tiStu = techIndRes.data || [];
          const allStudents = [...bStu, ...genStu, ...tcStu, ...tiStu];

          const schoolPersonnelCount = personnelData.filter(p => p.school_id === sId).length;
          const schoolTeachers = item.teachers || teachersData.filter(t => t.school_id === sId);

          return {
            id: sId,
            name: item.name || 'Unnamed Institution',
            region: item.region || 'Northwest',
            contactEmail: item.admin_email || item.email || item.contact_email || 'admin@school.cm',
            contactPhone: item.contact_phone || item.phone || '670000000',
            status: item.status || 'Active',
            isDeleted: item.is_deleted === true || item.isDeleted === true,
            plan: item.plan || 'Standard',
            portalLink: item.portal_link || '',
            registrationUsed: item.registration_used === true,
            students: allStudents,
            teachers: schoolTeachers,
            personnelCount: schoolPersonnelCount
          };
        }));
        setSchools(mappedSchools);
      }
    } catch (err) {
      console.error('Unexpected error fetching schools:', err);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const handleDeveloperLogin = (e) => {
    e.preventDefault();
    if (developerPassword === '2026$Ncmillions') {
      setIsDeveloperAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid Master Developer Password. Access Denied.');
    }
  };

  const handleReturnHome = (e) => {
    e.preventDefault();
    setIsDeveloperAuthenticated(false);
    setSelectedSchoolId(null);
    window.location.href = '/';
  };

  const toggleSchoolRestriction = async (schoolId) => {
    const targetSchool = schools.find(s => s.id === schoolId);
    if (!targetSchool) return;

    const newStatus = targetSchool.status === 'Active' ? 'Restricted' : 'Active';

    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        return { ...sch, status: newStatus };
      }
      return sch;
    }));

    await supabase
      .from('assigned_schools')
      .update({ status: newStatus })
      .eq('school_id', schoolId);
  };

  const handleSoftDeleteSchool = async (schoolId) => {
    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        return { ...sch, isDeleted: true };
      }
      return sch;
    }));
    if (selectedSchoolId === schoolId) setSelectedSchoolId(null);

    await supabase
      .from('assigned_schools')
      .update({ is_deleted: true })
      .eq('school_id', schoolId);
  };

  const handlePermanentDeleteSchool = async (schoolId) => {
    if (!confirm('Are you sure you want to permanently delete this school? This action cannot be undone.')) {
      return;
    }

    setSchools(prev => prev.filter(sch => sch.id !== schoolId));

    await supabase
      .from('assigned_schools')
      .delete()
      .eq('school_id', schoolId);
  };

  const handleRestoreSchool = async (schoolId) => {
    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        return { ...sch, isDeleted: false };
      }
      return sch;
    }));

    await supabase
      .from('assigned_schools')
      .update({ is_deleted: false })
      .eq('school_id', schoolId);
  };

  const openEditModal = (sch) => {
    setEditingSchool(sch);
    setEditName(sch.name);
    setEditEmail(sch.contactEmail);
    setEditPhone(sch.contactPhone);
    setEditRegion(sch.region);
  };

  const handleSaveEditSchool = async (e) => {
    e.preventDefault();
    if (!editingSchool) return;

    // Fixed: strict schema payload without 'institution_name'
    const updatedPayload = {
      name: editName.trim(),
      admin_email: editEmail.trim(),
      contact_phone: editPhone.trim(),
      region: editRegion
    };

    const { error } = await supabase
      .from('assigned_schools')
      .update(updatedPayload)
      .eq('school_id', editingSchool.id);

    if (error) {
      alert('Error updating school: ' + error.message);
      return;
    }

    setSchools(prev => prev.map(sch => {
      if (sch.id === editingSchool.id) {
        return {
          ...sch,
          name: editName.trim(),
          contactEmail: editEmail.trim(),
          contactPhone: editPhone.trim(),
          region: editRegion
        };
      }
      return sch;
    }));

    setEditingSchool(null);
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolEmail.trim() || !newSchoolPhone.trim()) return;

    const generatedSchoolUuid = crypto.randomUUID();
    const portalToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    
    const origin = 'https://classlogs.cc';
    const slugifiedName = encodeURIComponent(newSchoolName.trim());
    const portalLink = `${origin}/newadminregister?school_id=${generatedSchoolUuid}&school_name=${slugifiedName}&token=${portalToken}`;
    
    // Fixed: payload matched strictly to Supabase columns (name, admin_email, contact_phone)
    const newSchoolSupabasePayload = {
      school_id: generatedSchoolUuid,
      name: newSchoolName.trim(),
      region: newSchoolRegion,
      admin_email: newSchoolEmail.trim(),
      contact_phone: newSchoolPhone.trim(),
      status: 'Active',
      plan: newSchoolPlan,
      portal_link: portalLink,
      portal_token: portalToken,
      registration_used: false,
      is_deleted: false
    };

    const { error } = await supabase
      .from('assigned_schools')
      .insert([newSchoolSupabasePayload]);

    if (error) {
      alert('Error saving school to Supabase: ' + error.message);
      return;
    }

    const newSchoolObj = {
      id: generatedSchoolUuid,
      name: newSchoolName.trim(),
      region: newSchoolRegion,
      contactEmail: newSchoolEmail.trim(),
      contactPhone: newSchoolPhone.trim(),
      status: 'Active',
      isDeleted: false,
      plan: newSchoolPlan,
      portalLink: portalLink,
      registrationUsed: false,
      students: [],
      teachers: [],
      personnelCount: 0
    };

    setSchools(prev => [...prev, newSchoolObj]);
    setCreatedSchoolResult({ name: newSchoolName.trim(), link: portalLink, phone: newSchoolPhone.trim() });
    setNewSchoolName('');
    setNewSchoolEmail('');
    setNewSchoolPhone('');
    setCopiedLink(false);
  };

  const copyToClipboard = (linkText) => {
    navigator.clipboard.writeText(linkText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const shareViaWhatsApp = (schoolName, linkText, phone) => {
    const message = encodeURIComponent(`Hello Administrator, here is your official ClassLogs portal onboarding link for ${schoolName}:\n\n${linkText}\n\nPlease click to set up your master password and complete your registration.`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (!isDeveloperAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 font-sans relative">
        <button 
          onClick={handleReturnHome}
          className="absolute top-6 left-6 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-lg cursor-pointer z-50"
        >
          ← Back to Root App Home
        </button>

        <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6 mt-10">
          <div className="text-center space-y-2">
            <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono px-3 py-1 rounded-full mb-1">
              Master Developer Restricted Area
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">ClassLogs Core Console</h1>
            <p className="text-xs text-gray-400">Authenticate to manage platform access & authorized schools</p>
          </div>

          <form onSubmit={handleDeveloperLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Developer Email</label>
              <input 
                type="email" 
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                placeholder="Type your developer email..."
                required
                className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Master Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={developerPassword}
                  onChange={(e) => setDeveloperPassword(e.target.value)}
                  placeholder="Enter master password..."
                  required
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 pr-10 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-medium focus:outline-none"
                >
                  {showPassword ? '👁‍🗨️️' : '👁️'}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 p-2.5 rounded-lg text-center font-medium">
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-colors text-sm cursor-pointer"
            >
              Verify Developer Credentials
            </button>
          </form>

          <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-gray-800">
            ClassLogs by NsuRecords — Master Infrastructure Portal
          </div>
        </div>
      </div>
    );
  }

  const activeSchools = schools.filter(s => !s.isDeleted);
  const deletedSchools = schools.filter(s => s.isDeleted);
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  
  // Dynamic user count (Students + Teachers + School Personnel)
  const totalRegisteredUsers = schools.reduce((acc, s) => {
    const studentCount = s.students?.length || 0;
    const teacherCount = s.teachers?.length || 0;
    const personnelCount = s.personnelCount || 1;
    return acc + studentCount + teacherCount + personnelCount;
  }, 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans">
      <header className="bg-[#0f172a] border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReturnHome}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            ← Back to Root App Home
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">ClassLogs</h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                Master Developer Console
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Global Tenant Management & School Access Control (Powered by NsuRecords)</p>
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
            onClick={() => setIsDeveloperAuthenticated(false)}
            className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Lock Session
          </button>
        </div>
      </header>

      <nav className="bg-[#0f172a]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
        {[
          { id: 'schools', label: 'Assigned Schools & Links' },
          { id: 'register', label: 'Create School Sign-Up Link' },
          { id: 'bin', label: `Trash / Restore (${deletedSchools.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedSchoolId(null); setCreatedSchoolResult(null); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
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
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#0f172a] border border-amber-500/40 p-5 rounded-xl shadow-lg">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">Active Audit View — School ID: {selectedSchool.id}</span>
                <h2 className="text-2xl font-bold text-white mt-1">{selectedSchool.name}</h2>
                <p className="text-xs text-gray-400 mt-1">Region: {selectedSchool.region} | Email: {selectedSchool.contactEmail} | Phone: {selectedSchool.contactPhone}</p>
                {selectedSchool.portalLink && (
                  <p className="text-xs text-amber-300/80 font-mono mt-1 break-all">Sign-Up Link: {selectedSchool.portalLink}</p>
                )}
              </div>
              <button 
                onClick={() => setSelectedSchoolId(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                ← Back to All Schools Dashboard
              </button>
            </div>

            {/* User Breakdown Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Students</span>
                <p className="text-3xl font-black mt-2 text-emerald-400">{selectedSchool.students.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">General & Technical Education</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Teachers</span>
                <p className="text-3xl font-black mt-2 text-blue-400">{selectedSchool.teachers.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">Faculty & Logbook Instructors</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">School Personnel</span>
                <p className="text-3xl font-black mt-2 text-purple-400">{selectedSchool.personnelCount || 1}</p>
                <p className="text-[11px] text-gray-500 mt-1">Admins, Bursars, Discipline Masters</p>
              </div>
              <div className="bg-[#0f172a] border border-amber-500/40 p-5 rounded-xl bg-amber-500/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Billable Active Users</span>
                <p className="text-3xl font-black mt-2 text-amber-300">
                  {selectedSchool.students.length + selectedSchool.teachers.length + (selectedSchool.personnelCount || 1)}
                </p>
                <p className="text-[11px] text-amber-200/60 mt-1">Combined Subscription Metric</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 bg-[#1e293b]/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Student Records & Guardian Contacts</h3>
                <span className="text-xs text-gray-400 font-mono">Count: {selectedSchool.students.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase">
                    <tr>
                      <th className="p-3.5">Unique ID</th>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Class</th>
                      <th className="p-3.5">Student Contact</th>
                      <th className="p-3.5">Guardian Name</th>
                      <th className="p-3.5">Guardian Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedSchool.students.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-500">No students registered yet under this school.</td></tr>
                    ) : (
                      selectedSchool.students.map((stu, i) => (
                        <tr key={i} className="hover:bg-gray-800/40">
                          <td className="p-3.5 font-mono text-amber-400 font-bold">{stu.id || stu.unique_code}</td>
                          <td className="p-3.5 font-semibold text-white">{stu.name || stu.full_name}</td>
                          <td className="p-3.5">{stu.className || stu.class_name || 'N/A'}</td>
                          <td className="p-3.5 font-mono">{stu.contact || stu.phone || 'N/A'}</td>
                          <td className="p-3.5">{stu.guardianName || stu.parent_name || 'N/A'}</td>
                          <td className="p-3.5 font-mono">{stu.guardianContact || stu.parent_phone || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 bg-[#1e293b]/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Teacher Directory & Phone Contacts</h3>
                <span className="text-xs text-gray-400 font-mono">Count: {selectedSchool.teachers.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase">
                    <tr>
                      <th className="p-3.5">Teacher Name</th>
                      <th className="p-3.5">Contact Number</th>
                      <th className="p-3.5">Assigned Subjects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedSchool.teachers.length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-gray-500">No teachers registered yet under this school.</td></tr>
                    ) : (
                      selectedSchool.teachers.map((tch, i) => (
                        <tr key={i} className="hover:bg-gray-800/40">
                          <td className="p-3.5 font-semibold text-white">{tch.name || tch.full_name}</td>
                          <td className="p-3.5 font-mono text-blue-400">{tch.contact || tch.phone || tch.teacher_id}</td>
                          <td className="p-3.5 text-gray-300">{tch.subjects || 'General Curriculum'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'schools' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Assigned Schools</span>
                <p className="text-2xl font-black mt-2 text-white">{activeSchools.length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Access Portals</span>
                <p className="text-2xl font-black mt-2 text-emerald-400">{activeSchools.filter(s => s.status === 'Active').length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Restricted Portals</span>
                <p className="text-2xl font-black mt-2 text-red-400">{activeSchools.filter(s => s.status === 'Restricted').length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl shadow">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Project Users</span>
                <p className="text-2xl font-black mt-2 text-amber-400">{totalRegisteredUsers}</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-gray-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Assigned Educational Institutions & Sign-Up Links</h3>
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">Click any school row below to view full student & teacher records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">School ID</th>
                      <th className="p-3.5">Institution Name</th>
                      <th className="p-3.5">Region</th>
                      <th className="p-3.5">One-Time Sign-Up Link</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">Edit / Actions</th>
                      <th className="p-3.5 text-center">Toggle Access</th>
                      <th className="p-3.5 text-center">Remove / Trash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {isLoadingSchools ? (
                      <tr><td colSpan="8" className="p-8 text-center text-gray-400">Loading schools from Supabase...</td></tr>
                    ) : activeSchools.length === 0 ? (
                      <tr><td colSpan="8" className="p-8 text-center text-gray-500">No schools found in database. Use the "Create School Sign-Up Link" tab to add one.</td></tr>
                    ) : (
                      activeSchools.map((sch) => (
                       <tr
                    key={sch.id}
                    onClick={() => setSelectedSchoolId(sch.id)}
                    className="hover:bg-amber-500/10 cursor-pointer transition-colors group"
                  >
                    <td className="p-3.5 font-mono text-amber-400 font-bold">{sch.id}</td>
                    <td className="p-3.5 font-semibold text-white group-hover:text-amber-300 underline decoration-dotted">{sch.name}</td>
                    <td className="p-3.5 text-gray-300">{sch.region}</td>
                    <td className="p-3.5">
                      {sch.portalLink ? (
                        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 p-1.5 rounded-md">
                          <a
                            href={sch.portalLink.replace(/^(https?:\/\/localhost:\d+|^\/)/, 'https://classlogs.cc')}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[11px] text-emerald-300 bg-emerald-900/80 hover:bg-emerald-800 hover:underline px-2 py-0.5 rounded truncate max-w-xs transition"
                            title="Click to open link"
                          >
                            {sch.portalLink.replace(/^(https?:\/\/localhost:\d+|^\/)/, 'https://classlogs.cc')}
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(sch.portalLink.replace(/^(https?:\/\/localhost:\d+|^\/)/, 'https://classlogs.cc'));
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-[10px] transition shrink-0"
                          >
                            Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              shareViaWhatsApp(sch.name, sch.portalLink.replace(/^(https?:\/\/localhost:\d+|^\/)/, 'https://classlogs.cc'), sch.contactPhone);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px] transition shrink-0"
                            title="Share on WhatsApp"
                          >
                            WhatsApp
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No link generated</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${sch.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                        {sch.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(sch); }}
                        className="px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSchoolRestriction(sch.id); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer ${
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
                        onClick={(e) => { e.stopPropagation(); handleSoftDeleteSchool(sch.id); }}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
        ) : activeTab === 'register' ? (
          <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-xl max-w-xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Create School Name & One-Time Sign-Up Link</h2>
            <p className="text-xs text-gray-400">Enter the school's details below. A secure, one-time registration link containing the school name will be generated and saved to your Supabase `assigned_schools` table. You can send this link to the school so their admin can create their own password.</p>

            {createdSchoolResult ? (
              <div className="bg-[#1e293b] border border-amber-500/50 p-6 rounded-xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <span>✅</span> School "{createdSchoolResult.name}" Successfully Created!
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">Generated One-Time Sign-Up Link:</label>
                  <div className="bg-[#07090e] border border-gray-700 p-3 rounded-lg text-xs font-mono text-amber-300 break-all select-all">
                    {createdSchoolResult.link}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => copyToClipboard(createdSchoolResult.link)}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-lg text-xs shadow transition-colors cursor-pointer"
                  >
                    {copiedLink ? 'Copied to Clipboard!' : 'Copy Sign-Up Link'}
                  </button>
                  <button
                    onClick={() => shareViaWhatsApp(createdSchoolResult.name, createdSchoolResult.link, createdSchoolResult.phone)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg text-xs shadow transition-colors cursor-pointer"
                  >
                    Share on WhatsApp
                  </button>
                  <button
                    onClick={() => setCreatedSchoolResult(null)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSchool} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School / Institution Name</label>
                  <input 
                    type="text" 
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="e.g., Bamenda High School" 
                    required
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Contact Email</label>
                    <input 
                      type="email" 
                      value={newSchoolEmail}
                      onChange={(e) => setNewSchoolEmail(e.target.value)}
                      placeholder="admin@school.cm" 
                      required
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Contact Number</label>
                    <input 
                      type="text" 
                      value={newSchoolPhone}
                      onChange={(e) => setNewSchoolPhone(e.target.value)}
                      placeholder="670000000" 
                      required
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Region of Cameroon</label>
                    <select 
                      value={newSchoolRegion}
                      onChange={(e) => setNewSchoolRegion(e.target.value)}
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
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
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Standard">Standard Tier</option>
                      <option value="Premium">Premium Tier</option>
                      <option value="Enterprise">Enterprise Tier</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-colors text-sm cursor-pointer mt-2"
                >
                  Generate One-Time Registration Link
                </button>
              </form>
            )}
          </div>
        ) : activeTab === 'bin' ? (
          <div className="bg-[#0f172a] border border-gray-800 rounded-xl shadow-xl overflow-hidden space-y-4 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Trash Bin / Soft-Deleted Schools</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1e293b] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">School ID</th>
                    <th className="p-3.5">Institution Name</th>
                    <th className="p-3.5">Region</th>
                    <th className="p-3.5">Contact Email</th>
                    <th className="p-3.5 text-center">Restore Access</th>
                    <th className="p-3.5 text-center">Permanent Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {deletedSchools.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Trash is currently empty. No schools have been soft-deleted.</td></tr>
                  ) : (
                    deletedSchools.map((sch) => (
                      <tr key={sch.id} className="hover:bg-gray-800/40">
                        <td className="p-3.5 font-mono text-gray-400">{sch.id}</td>
                        <td className="p-3.5 font-semibold text-white line-through decoration-red-500">{sch.name}</td>
                        <td className="p-3.5 text-gray-400">{sch.region}</td>
                        <td className="p-3.5 text-gray-400">{sch.contactEmail}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleRestoreSchool(sch.id)}
                            className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Restore School
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handlePermanentDeleteSchool(sch.id)}
                            className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-white border border-red-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Delete Permanently
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>

      {/* EDIT SCHOOL MODAL */}
      {editingSchool && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Assigned School Details</h3>
              <button onClick={() => setEditingSchool(null)} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditSchool} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-gray-400 mb-1">Institution Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-gray-400 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-gray-400 mb-1">Region</label>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {CAMEROON_REGIONS.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-xs transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-lg text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}