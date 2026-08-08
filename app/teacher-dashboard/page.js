'use client';

import React, { useState, useEffect } from 'react';

export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  const [currentTime, setCurrentTime] = useState(null);

  // Motivational Quotes state
  const [currentQuote, setCurrentQuote] = useState({
    quote: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela"
  });

  const quotesList = [
    { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { quote: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
    { quote: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein" },
    { quote: "Teaching kids to count is fine, but teaching them what counts is best.", author: "Bob Talbert" }
  ];

  // Dynamically assigned Teacher Profile with real-world assignment data (reset/empty states for new assignments)
  const [teacherProfile, setTeacherProfile] = useState({
    id: 'TC-9041-CM',
    name: 'Mr. Ngwa',
    email: 'ngwa.teacher@nsuhrecords.cm',
    phone: '682491189',
    residence: 'Bamenda, Cameroon',
    section: 'Secondary & High School',
    subjects: ['Mathematics', 'Physics'],
    schedules: {
      'Mathematics': [
        { className: 'Form 1 (F1)', day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' },
        { className: 'Form 2 (F2)', day: 'Wednesday', startTime: '09:15 AM', endTime: '10:45 AM' }
      ],
      'Physics': [
        { className: 'Form 4 (F4)', day: 'Tuesday', startTime: '11:00 AM', endTime: '12:30 PM' }
      ]
    }
  });

  // Attendance & Marks State
  const [selectedClassForAction, setSelectedClassForAction] = useState('Form 1 (F1)');
  const [selectedSubjectForAction, setSelectedSubjectForAction] = useState('Mathematics');
  
  // Clean student list initialized for the assigned class with zero/empty initial marks
  const [classStudents, setClassStudents] = useState([
    { id: 'NR-ST-001', fullName: 'Student One', gender: 'Male' },
    { id: 'NR-ST-002', fullName: 'Student Two', gender: 'Female' },
    { id: 'NR-ST-003', fullName: 'Student Three', gender: 'Male' }
  ]);

  // Attendance records map: studentId -> status
  const [attendanceRecords, setAttendanceRecords] = useState({});
  // Marks records map initialized to zero/empty for a fresh assignment
  const [marksRecords, setMarksRecords] = useState({});
  
  // Admin integration state: tracks submission status so Master Admin can view completion status
  const [submissionStatus, setSubmissionStatus] = useState({
    attendanceSubmitted: false,
    marksSubmitted: false,
    lastUpdated: null
  });

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const randomQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
    setCurrentQuote(randomQuote);

    return () => clearInterval(timer);
  }, []);

  const changeTab = (tabId) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setNavigationHistory(prev => [...prev, tabId]);
    }
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousTab = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveTab(previousTab);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkChange = (studentId, score) => {
    setMarksRecords(prev => ({
      ...prev,
      [studentId]: score
    }));
  };

  const submitAttendance = () => {
    setSubmissionStatus(prev => ({ ...prev, attendanceSubmitted: true, lastUpdated: new Date().toLocaleTimeString() }));
    alert(`Attendance successfully recorded for ${selectedClassForAction} - ${selectedSubjectForAction}. Reflected instantly in Master Admin & Student portals.`);
  };

  const submitMarks = () => {
    setSubmissionStatus(prev => ({ ...prev, marksSubmitted: true, lastUpdated: new Date().toLocaleTimeString() }));
    alert(`Marks successfully uploaded and locked for ${selectedClassForAction} - ${selectedSubjectForAction}. Master Admin dashboard updated: Teacher completion status marked as FILLED.`);
  };

  const downloadTimetable = () => {
    alert(`Timetable downloaded successfully! Thank you for using NsuhRecords`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans">
      <header className="bg-[#111827] border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          {navigationHistory.length > 1 && (
            <button 
              onClick={handleGoBack}
              className="bg-gray-800 hover:bg-gray-700 text-amber-400 border border-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-400">NsuhRecords</h1>
            <p className="text-xs text-gray-400">Teacher Portal | Welcome, <strong className="text-white">{teacherProfile.name}</strong> ({teacherProfile.id})</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-amber-300 font-semibold">
              {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Loading date...'}
            </div>
            <div className="text-xs font-mono text-gray-400">
              {currentTime ? currentTime.toLocaleTimeString() : ''}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs bg-blue-900/60 text-blue-400 border border-blue-700/50 px-3 py-1 rounded-full font-medium">
              Teacher Active Session
            </span>
            <span className="text-[10px] text-emerald-400 mt-1 font-mono">
              Admin Sync: {submissionStatus.marksSubmitted ? 'Marks Uploaded (Completed)' : 'Pending Marks Entry'}
            </span>
          </div>
        </div>
      </header>

      {/* Motivational Quote Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-blue-900/30 to-[#111827] border-b border-gray-800 px-6 py-3 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-xs italic text-amber-200/90 font-serif">
          &ldquo;{currentQuote.quote}&rdquo; — <span className="font-semibold text-white">{currentQuote.author}</span>
        </p>
        <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider">NsuhRecords Daily Inspiration</span>
      </div>

      <nav className="bg-[#111827]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'My Overview & Timetable' },
          { id: 'attendance', label: 'Mark Attendance' },
          { id: 'grades', label: 'Upload Scores & Marks' },
          { id: 'profile', label: 'My Credentials & ID' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
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

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Subjects Assigned</h3>
                <p className="text-2xl font-black mt-2 text-amber-400">{teacherProfile.subjects.length}</p>
                <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-1">
                  {teacherProfile.subjects.map((sub, i) => (
                    <span key={i} className="bg-blue-900/30 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded text-[11px]">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Teacher ID</h3>
                <p className="text-xl font-mono font-bold mt-2 text-amber-300 select-all">{teacherProfile.id}</p>
                <p className="text-[11px] text-gray-500 mt-1">Assigned official identification code.</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Section</h3>
                <p className="text-2xl font-black mt-2 text-white">{teacherProfile.section}</p>
              </div>
            </div>

            {/* My Personal Timetable */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  My Class Schedule & Timetable
                </h3>
                <button 
                  onClick={downloadTimetable}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow transition-colors"
                >
                  Download Timetable
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">Subject</th>
                      <th className="p-3 border border-gray-700">Class Form</th>
                      <th className="p-3 border border-gray-700">Day</th>
                      <th className="p-3 border border-gray-700">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {Object.entries(teacherProfile.schedules).map(([sub, rows]) => (
                      rows.map((row, rIdx) => (
                        <tr key={`${sub}-${rIdx}`} className="hover:bg-gray-800/40">
                          <td className="p-3 border border-gray-700 font-bold text-white">{sub}</td>
                          <td className="p-3 border border-gray-700 text-amber-300 font-semibold">{row.className}</td>
                          <td className="p-3 border border-gray-700">{row.day}</td>
                          <td className="p-3 border border-gray-700 font-mono text-emerald-400">{row.startTime} - {row.endTime}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Take Class Attendance</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Subject</label>
                <select 
                  value={selectedSubjectForAction}
                  onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold"
                >
                  {teacherProfile.subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Class / Form</label>
                <select 
                  value={selectedClassForAction}
                  onChange={(e) => setSelectedClassForAction(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white"
                >
                  <option value="Form 1 (F1)">Form 1 (F1)</option>
                  <option value="Form 2 (F2)">Form 2 (F2)</option>
                  <option value="Form 4 (F4)">Form 4 (F4)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-300">Student Roll Call for {selectedClassForAction}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">ID</th>
                      <th className="p-3 border border-gray-700">Student Name</th>
                      <th className="p-3 border border-gray-700 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {classStudents.map((stu) => {
                      const currentStatus = attendanceRecords[stu.id] || 'Present';
                      return (
                        <tr key={stu.id} className="hover:bg-gray-800/40">
                          <td className="p-3 border border-gray-700 font-mono text-amber-400">{stu.id}</td>
                          <td className="p-3 border border-gray-700 font-semibold text-white">{stu.fullName}</td>
                          <td className="p-3 border border-gray-700 text-center">
                            <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
                              {['Present', 'Absent', 'Late'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleAttendanceChange(stu.id, st)}
                                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                                    currentStatus === st
                                      ? st === 'Present' ? 'bg-emerald-600 text-white' : st === 'Absent' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                      : 'bg-[#1f2937] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={submitAttendance}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg"
            >
              Submit Attendance Record
            </button>
          </div>
        )}

        {/* GRADES & MARKS TAB */}
        {activeTab === 'grades' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h2 className="text-lg font-bold text-white">Upload Student Sequence / Exam Scores</h2>
              <span className={`text-xs px-2.5 py-1 rounded font-mono font-semibold ${
                submissionStatus.marksSubmitted ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700' : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
              }`}>
                Admin Status: {submissionStatus.marksSubmitted ? 'FILLED (Submitted)' : 'PENDING (Reset to 0)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Subject</label>
                <select 
                  value={selectedSubjectForAction}
                  onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold"
                >
                  {teacherProfile.subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Class / Form</label>
                <select 
                  value={selectedClassForAction}
                  onChange={(e) => setSelectedClassForAction(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white"
                >
                  <option value="Form 1 (F1)">Form 1 (F1)</option>
                  <option value="Form 2 (F2)">Form 2 (F2)</option>
                  <option value="Form 4 (F4)">Form 4 (F4)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-300">Enter Marks (Over 20) for {selectedClassForAction}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">ID</th>
                      <th className="p-3 border border-gray-700">Student Name</th>
                      <th className="p-3 border border-gray-700">Score (/20)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {classStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-gray-800/40">
                        <td className="p-3 border border-gray-700 font-mono text-amber-400">{stu.id}</td>
                        <td className="p-3 border border-gray-700 font-semibold text-white">{stu.fullName}</td>
                        <td className="p-3 border border-gray-700">
                          <input 
                            type="number" 
                            max="20"
                            min="0"
                            step="0.5"
                            placeholder="0 (Reset)"
                            value={marksRecords[stu.id] !== undefined ? marksRecords[stu.id] : ''}
                            onChange={(e) => handleMarkChange(stu.id, e.target.value)}
                            className="bg-[#1f2937] border border-gray-700 rounded px-3 py-1.5 w-28 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={submitMarks}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg"
            >
              Upload & Submit Scores (Updates Student & Master Admin Sections)
            </button>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-2xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Teacher Professional Credentials & ID</h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                <input type="text" value={teacherProfile.name} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Teacher ID</label>
                <div className="flex gap-2">
                  <input type="text" value={teacherProfile.id} disabled className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg p-3 font-mono text-amber-300 font-bold" />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(teacherProfile.id);
                      alert('Teacher ID copied!');
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded-lg font-bold text-xs"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
                  <input type="text" value={teacherProfile.email} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Phone</label>
                  <input type="text" value={teacherProfile.phone} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Place of Residence</label>
                <input type="text" value={teacherProfile.residence} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>
    </div>
  );
}