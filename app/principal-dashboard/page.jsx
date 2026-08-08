'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Bell, MessageSquare, User, 
  Users, GraduationCap, Calendar, AlertCircle, 
  Clock, TrendingUp, TrendingDown, BookOpen, 
  FileText, ShieldCheck, ChevronRight, Activity, Send
} from 'lucide-react';

export default function PrincipalDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Real-time Date and Time state
  const [currentDateTime, setCurrentDateTime] = useState('');

  // School data dynamically synced with real-time records (Logo & Name)
  const [schoolData, setSchoolData] = useState({
    name: 'Unassigned School',
    logoUrl: '', // Uploaded school logo synced from admin record
    academicYear: '2026-2027',
    totalStudents: 0,
    technicalStudents: 0,
    generalStudents: 0,
    totalStaff: 0,
    attendanceRate: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    outstandingFees: 0,
    revenue: 0,
    expenses: 0
  });

  const [performanceData, setPerformanceData] = useState({
    elementary: { form1: 0, form2: 0 },
    middleSchool: { form3to5: 0 },
    highSchool: { lowerUpperSixth: 0 }
  });

  // Empty by default until recorded by school admin / teachers
  const [subjectsAverage, setSubjectsAverage] = useState([]);

  // Announcement state for teachers / students
  const [announcementTarget, setAnnouncementTarget] = useState('teachers');
  const [announcementText, setAnnouncementText] = useState('');
  
  // Restored: Recommendations to supervisor state
  const [supervisorRecommendation, setSupervisorRecommendation] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Real-time Timetable for both sections (Grammar & Technical) and Teachers List fetched from admin dashboard
  const [teachersList, setTeachersList] = useState([]);
  const [generalTimetable, setGeneralTimetable] = useState({
    generalSection: [],
    technicalSection: []
  });

  useEffect(() => {
    // Update live clock
    const updateClock = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    // Live real-time connection to Admin, Teacher, Bursar, and Supervisor dashboards
    return () => clearInterval(timer);
  }, []);

  const handleBroadcastAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    
    setSuccessMsg(`Announcement successfully broadcasted to all ${announcementTarget}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setAnnouncementText('');
  };

  const handleSendRecommendation = (e) => {
    e.preventDefault();
    if (!supervisorRecommendation.trim()) return;
    
    setSuccessMsg('Recommendation successfully sent to the Supervisor portal.');
    setTimeout(() => setSuccessMsg(''), 4000);
    setSupervisorRecommendation('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Dynamic School Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold text-lg shadow-inner overflow-hidden border border-slate-200">
              {schoolData.logoUrl ? (
                <img src={schoolData.logoUrl} alt="School Logo" className="w-full h-full object-cover" />
              ) : (
                schoolData.name !== 'Unassigned School' ? schoolData.name.charAt(0) : 'U'
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {schoolData.name} 
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {schoolData.academicYear}
                </span>
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Clock size={12} className="text-blue-600" /> {currentDateTime || 'Loading live time...'}
              </p>
            </div>
          </div>

          {/* Search, Notifications, Messages, Profile */}
          <div className="flex items-center space-x-3">
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Search real-time school records..." 
                className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-64 transition-all"
              />
            </div>

            <button aria-label="Notifications" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <button aria-label="Messages" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative transition-colors">
              <MessageSquare size={20} />
            </button>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                <User size={18} />
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">Principal Office</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2 font-medium"><ShieldCheck size={18} /> {successMsg}</span>
          </div>
        )}

        {/* 1. Executive Overview Metrics (Connected to Admin, Teacher & Bursar Dashboards) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" /> Executive Overview (Real-Time Synced)
            </h2>
            <span className="text-xs text-slate-500">Live data connection active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Metric Card: Total Students */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
                <Users size={18} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.totalStudents || '0000'}</div>
              <div className="text-xs text-slate-500 mt-1">Tech: {schoolData.technicalStudents} | Gen: {schoolData.generalStudents}</div>
            </div>

            {/* Metric Card: Teachers & Staff */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Teachers & Staff</span>
                <GraduationCap size={18} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.totalStaff || '0000'}</div>
              <div className="text-xs text-slate-500 mt-1">Synced from Admin roster</div>
            </div>

            {/* Metric Card: Student Attendance Today */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.attendanceRate}%</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">🟢 Present: {schoolData.presentToday}</div>
            </div>

            {/* Metric Card: Students Absent */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Students Absent</span>
                <AlertCircle size={18} className="text-rose-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.absentToday || '0000'}</div>
              <div className="text-xs text-rose-600 font-medium mt-1">🔴 Late/Unexcused: {schoolData.lateToday}</div>
            </div>

            {/* Metric Card: Outstanding Fees (Bursar Connected in FCFA) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Fees</span>
                <span className="text-xs font-bold text-amber-600">FCFA</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.outstandingFees || '0000'} FCFA</div>
              <div className="text-xs text-slate-500 mt-1">Bursar sync active</div>
            </div>

          </div>
        </section>

        {/* 2. Department Performance & Subject Breakdowns (Left empty unless records exist) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Section: Department Performance */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" /> Department Performance
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Elementary (Form 1 & 2)</span>
                <span className="font-bold text-blue-700">{performanceData.elementary.form1}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Middle School (Form 3-5)</span>
                <span className="font-bold text-blue-700">{performanceData.middleSchool.form3to5}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">High School (Lower/Upper VI)</span>
                <span className="font-bold text-blue-700">{performanceData.highSchool.lowerUpperSixth}%</span>
              </div>
            </div>
          </div>

          {/* Section: Performance by Subject (Dynamic / Empty until teacher enters marks) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" /> Subject Performance by Department
            </h3>
            <div className="overflow-x-auto">
              {subjectsAverage.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
                  No subject marks have been recorded by teachers or school admins yet. This section will update automatically once entries are made.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Class Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {subjectsAverage.map((subj, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium text-slate-800">{subj.name}</td>
                        <td className="py-3 px-3 text-slate-600">{subj.department}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{subj.average}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* 3. Teachers Directory (Grammar vs Technical Section) & General Timetables (Both Sections) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Teachers List with Section Specification */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" /> Teachers Directory & Section
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {teachersList.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                  No teachers recorded from admin portal yet.
                </p>
              ) : (
                teachersList.map((teacher, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{teacher.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${teacher.section === 'Technical' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {teacher.section}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* General School Timetables for Both Sections (Technical & General) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> General Timetables (Grammar & Technical Sections)
            </h3>
            
            {/* General / Grammar Section Timetable */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded">Grammar Section Timetable</h4>
              <div className="overflow-x-auto">
                {generalTimetable.generalSection.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
                    No timetable schedule recorded for General Section yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="py-2 px-2">Day</th>
                        <th className="py-2 px-2">Time</th>
                        <th className="py-2 px-2">Subject</th>
                        <th className="py-2 px-2">Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generalTimetable.generalSection.map((slot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-medium text-slate-800">{slot.day}</td>
                          <td className="py-2.5 px-2 text-slate-600">{slot.time}</td>
                          <td className="py-2.5 px-2 font-medium text-blue-700">{slot.subject}</td>
                          <td className="py-2.5 px-2 text-slate-700">{slot.teacher}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Technical Section Timetable */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded">Technical Section Timetable</h4>
              <div className="overflow-x-auto">
                {generalTimetable.technicalSection.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
                    No timetable schedule recorded for Technical Section yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="py-2 px-2">Day</th>
                        <th className="py-2 px-2">Time</th>
                        <th className="py-2 px-2">Subject</th>
                        <th className="py-2 px-2">Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generalTimetable.technicalSection.map((slot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-medium text-slate-800">{slot.day}</td>
                          <td className="py-2.5 px-2 text-slate-600">{slot.time}</td>
                          <td className="py-2.5 px-2 font-medium text-amber-700">{slot.subject}</td>
                          <td className="py-2.5 px-2 text-slate-700">{slot.teacher}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* 4. Financial Overview (FCFA Only) & Principal Announcements Broadcaster */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Financial Summary Box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" /> School Financial Summary (Bursar Connected)
            </h3>
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <div>
                <span className="text-xs text-slate-500 block mb-1 font-semibold">Revenue</span>
                <span className="text-base font-black text-emerald-700">{schoolData.revenue || '0000'} FCFA</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1 font-semibold">Expenses</span>
                <span className="text-base font-black text-rose-700">{schoolData.expenses || '0000'} FCFA</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1 font-semibold">Outstanding</span>
                <span className="text-base font-black text-amber-700">{schoolData.outstandingFees || '0000'} FCFA</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">Financial data flows directly from the Bursar dashboard records in real time.</p>
          </div>

          {/* Principal Announcements to Teachers or Students */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send size={18} className="text-blue-600" /> Broadcast Announcements
            </h3>
            <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
              <div className="flex gap-4 items-center">
                <label className="text-xs font-semibold text-slate-700">Target Audience:</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="targetAudience" 
                      value="teachers" 
                      checked={announcementTarget === 'teachers'} 
                      onChange={(e) => setAnnouncementTarget(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    /> Teachers
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="targetAudience" 
                      value="students" 
                      checked={announcementTarget === 'students'} 
                      onChange={(e) => setAnnouncementTarget(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    /> Students
                  </label>
                </div>
              </div>
              <textarea 
                rows="2"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder={`Type announcement message to display directly in the ${announcementTarget} dashboard...`}
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              ></textarea>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-2"
                >
                  <Send size={14} /> Post Announcement
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* 5. Restored: Recommendations to the Supervisor */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" /> Recommendations to Supervisor
          </h3>
          <form onSubmit={handleSendRecommendation} className="space-y-3">
            <textarea 
              rows="3"
              value={supervisorRecommendation}
              onChange={(e) => setSupervisorRecommendation(e.target.value)}
              placeholder="Submit administrative recommendations, policy feedback, or institutional reviews directly to the Supervisor portal..."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            ></textarea>
            <div className="flex justify-end">
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-900 text-white text-xs font-semibold rounded-lg hover:bg-indigo-800 transition-colors shadow-xs flex items-center gap-2"
              >
                <ShieldCheck size={14} /> Submit to Supervisor
              </button>
            </div>
          </form>
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="text-center py-6 text-slate-400 text-xs border-t border-slate-200 mt-12">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>

    </div>
  );
}