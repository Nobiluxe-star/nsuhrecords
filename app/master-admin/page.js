'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// All 10 Regions of Cameroon as requested
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

  // Assigned schools list including initial and mock tenants
  const [schools, setSchools] = useState([
    {
      id: 'SCH-001',
      name: 'Nsuh High School Bamenda',
      region: 'Northwest',
      contactEmail: 'contact@nsuhhigh.cm',
      contactPhone: '670000001',
      status: 'Active',
      isDeleted: false,
      plan: 'Enterprise',
      students: [
        { id: 'TEF1NG100026', name: 'Nformi Brian', contact: '680111222', guardianName: 'Nformi Senior', guardianContact: '670222333', className: 'Form 1' },
        { id: 'GEU6NG100126', name: 'Mbiydzenyuy Clarise', contact: '680333444', guardianName: 'Mbiydzenyuy Paul', guardianContact: '670444555', className: 'Upper Sixth' }
      ],
      teachers: [
        { name: 'Mr. Tikum Emmanuel', contact: '671111222', subjects: 'Mathematics F1-F3' },
        { name: 'Mrs. Nji Cynthia', contact: '672222333', subjects: 'Chemistry U6' }
      ]
    },
    {
      id: 'SCH-002',
      name: 'Assurance Bilingual Academy',
      region: 'Northwest',
      contactEmail: 'info@assuranceacademy.cm',
      contactPhone: '670000002',
      status: 'Active',
      isDeleted: false,
      plan: 'Standard',
      students: [
        { id: 'GEF2AG100026', name: 'Che Roland', contact: '678999888', guardianName: 'Che Grace', guardianContact: '678111222', className: 'Form 2' }
      ],
      teachers: [
        { name: 'Mr. Nsuh Norbert', contact: '682491189', subjects: 'Computer Science F1-U6' }
      ]
    },
    {
      id: 'SCH-003',
      name: 'Mankon Comprehensive College',
      region: 'Northwest',
      contactEmail: 'mankoncc@nsuhrecords.cm',
      contactPhone: '670000003',
      status: 'Active',
      isDeleted: false,
      plan: 'Basic',
      students: [],
      teachers: []
    }
  ]);

  // Selected school for deep student & teacher auditing
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  // Form state for assigning a new school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolRegion, setNewSchoolRegion] = useState('Northwest');
  const [newSchoolPlan, setNewSchoolPlan] = useState('Standard');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeveloperLogin = (e) => {
    e.preventDefault();
    if (developerPassword === '2026$Ncmillions') {
      setIsDeveloperAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid Master Developer Password. Access Denied.');
    }
  };

  // Safe navigation handler for returning to Homepage / Root App Main Home
  const handleReturnHome = (e) => {
    e.preventDefault();
    setIsDeveloperAuthenticated(false);
    setSelectedSchoolId(null);
    window.location.href = '/';
  };

  // Toggle school active/restricted access status
  const toggleSchoolRestriction = (schoolId) => {
    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        const newStatus = sch.status === 'Active' ? 'Restricted' : 'Active';
        return { ...sch, status: newStatus };
      }
      return sch;
    }));
  };

  // Soft Delete: School disappears completely from active dashboard but records/tokens are safely kept in trash
  const handleSoftDeleteSchool = (schoolId) => {
    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        return { ...sch, isDeleted: true };
      }
      return sch;
    }));
    if (selectedSchoolId === schoolId) setSelectedSchoolId(null);
  };

  // Restore school and its records back to the dashboard if deleted by mistake
  const handleRestoreSchool = (schoolId) => {
    setSchools(prev => prev.map(sch => {
      if (sch.id === schoolId) {
        return { ...sch, isDeleted: false };
      }
      return sch;
    }));
  };

  // Assign a new school with name, contact number, email, and region
  const handleAddSchool = (e) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolEmail.trim() || !newSchoolPhone.trim()) return;

    const nextIdNum = schools.length + 1;
    const formattedId = `SCH-00${nextIdNum}`;

    const newSchoolObj = {
      id: formattedId,
      name: newSchoolName.trim(),
      region: newSchoolRegion,
      contactEmail: newSchoolEmail.trim(),
      contactPhone: newSchoolPhone.trim(),
      status: 'Active',
      isDeleted: false,
      plan: newSchoolPlan,
      students: [],
      teachers: []
    };

    setSchools(prev => [...prev, newSchoolObj]);
    setNewSchoolName('');
    setNewSchoolEmail('');
    setNewSchoolPhone('');
    setActiveTab('schools');
    alert(`School "${newSchoolName}" successfully assigned and activated across NsuhRecords with link identifier: nsuhrecords.com/school/${formattedId.toLowerCase()}`);
  };

  if (!isDeveloperAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 font-sans relative">
        {/* Absolute Back Button on Login Screen to ensure root redirection works everywhere */}
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
            <h1 className="text-xl font-bold tracking-tight text-white">NsuhRecords Core Control</h1>
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
                  {showPassword ? '👁️‍🗨️' : '👁️'}
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
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-colors text-sm"
            >
              Verify Developer Credentials
            </button>
          </form>

          <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-gray-800">
            Norbert Che Nsuh — Master Infrastructure Portal
          </div>
        </div>
      </div>
    );
  }

  const activeSchools = schools.filter(s => !s.isDeleted);
  const deletedSchools = schools.filter(s => s.isDeleted);
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  // Total system registration count calculation across all records
  const totalRegisteredUsers = schools.reduce((acc, s) => acc + s.students.length + s.teachers.length + 1, 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans">
      {/* Header with Back to Root App Home interface link pointing directly to root */}
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
              <h1 className="text-lg font-bold tracking-tight text-white">NsuhRecords</h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                Master Developer Console
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
            onClick={() => setIsDeveloperAuthenticated(false)}
            className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
          >
            Lock Session
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-[#0f172a]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
        {[
          { id: 'schools', label: 'Assigned Schools & Dashboard' },
          { id: 'register', label: 'Assign / Onboard School' },
          { id: 'bin', label: `Trash / Restore (${deletedSchools.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedSchoolId(null); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
        {/* DETAILED SCHOOL AUDIT VIEW (Triggered when a school is clicked) */}
        {selectedSchool ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#0f172a] border border-amber-500/40 p-5 rounded-xl shadow-lg">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">Active Audit View — School ID: {selectedSchool.id}</span>
                <h2 className="text-2xl font-bold text-white mt-1">{selectedSchool.name}</h2>
                <p className="text-xs text-gray-400 mt-1">Region: {selectedSchool.region} | Email: {selectedSchool.contactEmail} | Phone: {selectedSchool.contactPhone}</p>
              </div>
              <button 
                onClick={() => setSelectedSchoolId(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-xs font-semibold shadow transition-colors"
              >
                ← Back to All Schools Dashboard
              </button>
            </div>

            {/* Metrics cards showing total students and teachers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Registered Students</span>
                <p className="text-4xl font-black mt-2 text-emerald-400">{selectedSchool.students.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">Full verified student roster and guardian contacts</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Registered Teachers</span>
                <p className="text-4xl font-black mt-2 text-blue-400">{selectedSchool.teachers.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">Complete faculty directory and phone contacts</p>
              </div>
            </div>

            {/* Students Table */}
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
                          <td className="p-3.5 font-mono text-amber-400 font-bold">{stu.id}</td>
                          <td className="p-3.5 font-semibold text-white">{stu.name}</td>
                          <td className="p-3.5">{stu.className}</td>
                          <td className="p-3.5 font-mono">{stu.contact}</td>
                          <td className="p-3.5">{stu.guardianName}</td>
                          <td className="p-3.5 font-mono">{stu.guardianContact}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teachers Table */}
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
                          <td className="p-3.5 font-semibold text-white">{tch.name}</td>
                          <td className="p-3.5 font-mono text-blue-400">{tch.contact}</td>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Assigned Educational Institutions (Main Dashboard)</h3>
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">Click any school row below to view full student & teacher records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1e293b] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">School ID</th>
                      <th className="p-3.5">Institution Name</th>
                      <th className="p-3.5">Region</th>
                      <th className="p-3.5">Contact Email / Phone</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">Toggle Access</th>
                      <th className="p-3.5 text-center">Remove / Trash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {activeSchools.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-gray-500">No schools assigned yet. Use the "Assign / Onboard School" tab to add one.</td></tr>
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
                          <td className="p-3.5 font-mono text-gray-400">{sch.contactEmail}<br/>{sch.contactPhone}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              sch.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {sch.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSchoolRestriction(sch.id); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors ${
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
                              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs font-semibold"
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
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Assign New School & Activate Profile</h2>

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
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white"
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
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Standard">Standard Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-colors mt-2"
              >
                Assign & Activate School on Main Dashboard
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-gray-800 rounded-xl shadow-xl overflow-hidden p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2">Deleted Schools Trash & Safe Recovery</h3>
              <p className="text-xs text-gray-400 mb-6">Schools deleted here are hidden from the active dashboard, but all underlying student rosters, teacher directories, and database records are preserved safely. You can restore them instantly if deleted by mistake.</p>
              
              {deletedSchools.length === 0 ? (
                <p className="text-xs text-gray-500 bg-[#1e293b]/40 p-4 rounded-lg border border-gray-800 text-center">Trash is currently empty.</p>
              ) : (
                <div className="space-y-3">
                  {deletedSchools.map(sch => (
                    <div key={sch.id} className="flex justify-between items-center bg-[#1e293b] p-4 rounded-lg border border-gray-700 shadow">
                      <div>
                        <span className="text-xs font-mono text-amber-400 font-bold">{sch.id}</span>
                        <h4 className="font-bold text-white text-sm mt-0.5">{sch.name}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">{sch.region} Region | Students: {sch.students.length} | Teachers: {sch.teachers.length}</p>
                      </div>
                      <button
                        onClick={() => handleRestoreSchool(sch.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Restore School & Records
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
        App conceived by Norbert Che Nsuh — 682491189
      </footer>
    </div>
  );
}