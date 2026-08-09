'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Receipt, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Search, 
  ArrowLeft, 
  LogOut, 
  Bell, 
  MessageSquare,
  UserCheck,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  ChevronRight,
  Eye,
  Filter
} from 'lucide-react';

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(''); // Blank by default until assigned by master admin
  const [teachersTechnical, setTeachersTechnical] = useState([]);
  const [teachersGeneral, setTeachersGeneral] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({ totalCollected: 0, totalOutstanding: 0 });
  const [absentTeachersToday, setAbsentTeachersToday] = useState([]);
  const [principalMessages, setPrincipalMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering states for student registry
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [viewingProfileStudent, setViewingProfileStudent] = useState(null);
  
  const [activeTab, setActiveTab] = useState('overview');

  // Simulated live fetch from school admin portal & Supabase database tables
  useEffect(() => {
    setTimeout(() => {
      setSchoolName(''); 

      setTeachersTechnical([
        { id: 1, name: 'Mr. Nsuh', contact: '+237682491189', email: 'nsuh@nsuhrecords.com', residence: 'Bamenda', subjects: ['Mathematics', 'Mechanics'], section: 'Technical', role: 'Teacher' },
        { id: 2, name: 'Eng. Tambe', contact: '+237670000000', email: 'tambe@nsuhrecords.com', residence: 'Buea', subjects: ['Building Construction'], section: 'Technical', role: 'Teacher' }
      ]);
      
      setTeachersGeneral([
        { id: 3, name: 'Mrs. Clara', contact: '+237671111111', email: 'clara@nsuhrecords.com', residence: 'Bamenda', subjects: ['English Language', 'Literature'], section: 'General', role: 'Teacher' },
        { id: 4, name: 'Mr. Fon', contact: '+237672222222', email: 'fon@nsuhrecords.com', residence: 'Bamenda', subjects: ['Biology', 'Chemistry'], section: 'General', role: 'Teacher' }
      ]);

      setStudentsList([
        { 
          id: 'TEF1NG100026', 
          name: 'Ndoh Gilbert', 
          class: 'Form 1', 
          section: 'Technical', 
          age: 15, 
          dob: '2011-04-12', 
          quarter: 'Ntarikon', 
          guardian: 'Ndoh Senior', 
          phone: '+237670000001', 
          medical: 'None', 
          feesPaid: 45000, 
          feesDue: 60000 
        },
        { 
          id: 'GEF2TA100126', 
          name: 'Mankah Mary', 
          class: 'Form 2', 
          section: 'General', 
          age: 14, 
          dob: '2012-08-22', 
          quarter: 'Mile 2', 
          guardian: 'Mankah Grace', 
          phone: '+237670000002', 
          medical: 'Asthma mild', 
          feesPaid: 60000, 
          feesDue: 60000 
        }
      ]);

      setFinancialSummary({
        totalCollected: 105000,
        totalOutstanding: 15000
      });

      setAbsentTeachersToday([
        { id: 4, name: 'Mr. Fon', section: 'General', reason: 'Medical Leave' }
      ]);

      // Restored previous style with separate sections for Principal Notices & Recommendations
      setPrincipalMessages([
        { 
          id: 1, 
          type: 'Notice',
          date: '2026-08-08', 
          sender: 'Principal (General Section)', 
          message: 'Teacher punctuality has improved significantly this week across the arts and science departments.' 
        },
        { 
          id: 2, 
          type: 'Recommendation',
          date: '2026-08-07', 
          sender: 'Principal (Technical Section)', 
          message: 'Ensure strict supervision of workshop equipment maintenance scheduled for upcoming Wednesday.' 
        }
      ]);

      setLoading(false);
    }, 100);
  }, []);

  // Cameroon secondary education classes pool (General & Technical)
  const cameroonClasses = {
    General: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth (Upper VI)', 'Upper Sixth'],
    Technical: ['Year 1 (IP / First Year)', 'Year 2 (Second Year)', 'Year 3 (Third Year / BEPC)', 'Year 4 (First Year CAP/Probatoire)', 'Year 5 (Terminale / Baccalaureate)']
  };

  // Filter students based on section, class filter, and search input
  const filteredStudents = studentsList.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'All' || student.section === selectedSection;
    const matchesClass = selectedClassFilter === 'All' || student.class === selectedClassFilter;
    return matchesSearch && matchesSection && matchesClass;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-900 text-white p-2 rounded-lg font-bold">NR</div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-blue-950 flex items-center space-x-2">
                <span>{schoolName ? schoolName : <span className="text-slate-400 italic text-sm font-normal">[Unassigned School]</span>}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">Supervisor Portal</span>
              </h1>
              <p className="text-xs text-slate-500">Academic Year: 2026-2027</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search student ID, name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-blue-500 w-64 transition-all"
              />
            </div>
            <button className="p-2 text-slate-600 hover:text-blue-600 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-2 border-l pl-4 border-slate-200">
              <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                SV
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-slate-800">Supervisor Master</p>
                <p className="text-xs text-slate-500">Authorized Official</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-black mb-1">School Inspector & Supervisor Dashboard</h2>
            <p className="text-blue-200 text-sm">Real-time oversight of Technical and General sections, faculty presence, and financial inflows.</p>
          </div>
          <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-300" />
            <span>Live System Synchronized</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-200 mb-8 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Executive Overview
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'teachers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Faculty & Staff Directory
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Student Registry & Fees
          </button>
          <button 
            onClick={() => setActiveTab('recommendations')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'recommendations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Principal Notices & Recommendations
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metric Cards Grid (Dollar sign removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total School Staff</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-2">{teachersTechnical.length + teachersGeneral.length + 1}</h3>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users className="h-6 w-6" /></div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center"><ChevronRight className="h-3 w-3 mr-1 text-blue-600" /> Technical & General Faculty</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-2">{studentsList.length}</h3>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><BookOpen className="h-6 w-6" /></div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center"><ChevronRight className="h-3 w-3 mr-1 text-emerald-600" /> Active Registry Records</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teachers Absent Today</p>
                    <h3 className="text-3xl font-black text-red-600 mt-2">{absentTeachersToday.length}</h3>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl text-red-600"><AlertTriangle className="h-6 w-6" /></div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center"><ChevronRight className="h-3 w-3 mr-1 text-red-600" /> Monitored via Admin Logs</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fees Collected</p>
                    <h3 className="text-3xl font-black text-blue-900 mt-2">{financialSummary.totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span></h3>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Receipt className="h-6 w-6" /></div>
                </div>
                <p className="text-xs text-slate-500 mt-4 flex items-center"><ChevronRight className="h-3 w-3 mr-1 text-indigo-600" /> Real-time Bursar Sync</p>
              </div>
            </div>

            {/* Department Breakdown & Attendance Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" /> Departmental Distribution
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800">Technical Department</p>
                      <p className="text-xs text-slate-500">Industrial & Commercial Trades</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{teachersTechnical.length} Teachers</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800">General Department</p>
                      <p className="text-xs text-slate-500">Arts & Science Programmes</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">{teachersGeneral.length} Teachers</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600" /> Faculty Attendance Alerts
                </h3>
                {absentTeachersToday.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">All faculty members are present and accounted for today.</p>
                ) : (
                  <div className="space-y-3">
                    {absentTeachersToday.map(t => (
                      <div key={t.id} className="p-4 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-red-900">{t.name}</p>
                          <p className="text-xs text-red-700">{t.section} Section — Reason: {t.reason}</p>
                        </div>
                        <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">Absent</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Teachers Directory */}
        {activeTab === 'teachers' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">Faculty & Staff Directory</h3>
                <p className="text-xs text-slate-500">Live data synchronized from administration portal</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">View-Only Protocol</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-bold">Teacher Name</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold">Contact Number</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Residence</th>
                    <th className="p-4 font-bold">Assigned Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {[...teachersTechnical, ...teachersGeneral].map(teacher => (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">
                          {teacher.name.charAt(0)}
                        </div>
                        <span>{teacher.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${teacher.section === 'Technical' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {teacher.section}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-600">{teacher.contact}</td>
                      <td className="p-4 text-slate-600">{teacher.email}</td>
                      <td className="p-4 text-slate-600">{teacher.residence}</td>
                      <td className="p-4 text-slate-600 font-medium">{teacher.subjects.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Student Registry & Fees with Automatic Cameroon Class Groupings */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Filter controls with automatic Cameroon classes pooled based on selected section */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center space-x-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-700">Filter By Section:</span>
                <select 
                  value={selectedSection} 
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setSelectedClassFilter('All'); // Reset class filter when section changes
                  }}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Sections</option>
                  <option value="Technical">Technical Education</option>
                  <option value="General">General Education</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-slate-700">Class Group:</span>
                <select 
                  value={selectedClassFilter} 
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="All">All Classes (Combined)</option>
                  {selectedSection === 'Technical' && cameroonClasses.Technical.map((cls, idx) => (
                    <option key={idx} value={cls}>{cls}</option>
                  ))}
                  {selectedSection === 'General' && cameroonClasses.General.map((cls, idx) => (
                    <option key={idx} value={cls}>{cls}</option>
                  ))}
                  {selectedSection === 'All' && (
                    <>
                      <optgroup label="General Education Classes">
                        {cameroonClasses.General.map((cls, idx) => (
                          <option key={`gen-${idx}`} value={cls}>{cls}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Technical Education Classes">
                        {cameroonClasses.Technical.map((cls, idx) => (
                          <option key={`tech-${idx}`} value={cls}>{cls}</option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Student Registry & Financial Standing</h3>
                  <p className="text-xs text-slate-500">Live records from admin registration & bursar entries</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">Active Sync</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4 font-bold">Student Name</th>
                      <th className="p-4 font-bold">Unique ID</th>
                      <th className="p-4 font-bold">Class & Section</th>
                      <th className="p-4 font-bold">Fees Paid</th>
                      <th className="p-4 font-bold">Balance Due</th>
                      <th className="p-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 italic">No student records found matching the selected filter.</td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{student.name}</td>
                          <td className="p-4 font-mono text-xs font-bold text-blue-600">{student.id}</td>
                          <td className="p-4 text-slate-600">{student.class} ({student.section})</td>
                          <td className="p-4 font-semibold text-emerald-600">{student.feesPaid.toLocaleString()} FCFA</td>
                          <td className="p-4 font-semibold text-red-600">{(student.feesDue - student.feesPaid).toLocaleString()} FCFA</td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => setViewingProfileStudent(student)}
                              className="text-blue-600 font-bold text-xs hover:underline flex items-center justify-end space-x-1 ml-auto"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Profile</span>
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
        )}

        {/* Tab 4: Principal Notices & Recommendations (Maintained previous style with dual structured lists) */}
        {activeTab === 'recommendations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center">
                <Bell className="h-5 w-5 mr-2 text-blue-600" /> Principal Official Notices
              </h3>
              <p className="text-xs text-slate-500 mb-6">Administrative broadcast notices across sections.</p>
              
              <div className="space-y-4">
                {principalMessages.filter(m => m.type === 'Notice').map(msg => (
                  <div key={msg.id} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-900 text-xs">{msg.sender}</span>
                      <span className="text-xs text-slate-400 font-mono">{msg.date}</span>
                    </div>
                    <p className="text-sm text-slate-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-indigo-600" /> Supervisory Recommendations
              </h3>
              <p className="text-xs text-slate-500 mb-6">Direct directives and policy guidance notes.</p>
              
              <div className="space-y-4">
                {principalMessages.filter(m => m.type === 'Recommendation').map(msg => (
                  <div key={msg.id} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-900 text-xs">{msg.sender}</span>
                      <span className="text-xs text-slate-400 font-mono">{msg.date}</span>
                    </div>
                    <p className="text-sm text-slate-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* View-Only Student Profile Modal */}
      {viewingProfileStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">Student Profile (View Only)</h3>
                <p className="text-xs text-slate-500">Strictly non-editable supervisory record</p>
              </div>
              <button 
                onClick={() => setViewingProfileStudent(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl">
                <div className="h-14 w-14 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-lg">
                  {viewingProfileStudent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">{viewingProfileStudent.name}</h4>
                  <p className="font-mono text-xs text-blue-600 font-bold">{viewingProfileStudent.id}</p>
                  <p className="text-xs text-slate-500">{viewingProfileStudent.class} — {viewingProfileStudent.section} Department</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Age & DOB</p>
                  <p className="font-semibold text-slate-800">{viewingProfileStudent.age} yrs ({viewingProfileStudent.dob})</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Quarter / Residence</p>
                  <p className="font-semibold text-slate-800">{viewingProfileStudent.quarter}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Guardian Name</p>
                  <p className="font-semibold text-slate-800">{viewingProfileStudent.guardian}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Guardian Phone</p>
                  <p className="font-semibold text-slate-800 font-mono">{viewingProfileStudent.phone}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-xs text-slate-400 font-bold">Medical History / Notes</p>
                <p className="font-semibold text-slate-800">{viewingProfileStudent.medical}</p>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <button 
                onClick={() => setViewingProfileStudent(null)}
                className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer attribution */}
      <footer className="mt-12 py-6 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-mono">App conceived by Norbert Che Nsuh - 682491189</p>
      </footer>
    </div>
  );
}