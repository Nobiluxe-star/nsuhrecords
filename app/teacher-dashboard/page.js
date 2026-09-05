'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  const [currentTime, setCurrentTime] = useState(null);
const [isLoadingStudents, setIsLoadingStudents] = useState(false);
const [selectedClassLog, setSelectedClassLog] = useState(/** @type {any} */ (null));
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
 const [schoolName, setSchoolName] = useState('Loading School...');
 const [selectedTerm, setSelectedTerm] = useState('Term 1');
const [teacherProfile, setTeacherProfile] = useState({
  school_id: '',
  id: '',
  name: '',
  email: '',
  phone: '',
  residence: '',
  section: '',
  subjects: [],
  schedules: {}
});
const [lessonText, setLessonText] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
const [logsList, setLogsList] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
const [isMarksLocked, setIsMarksLocked] = useState(false);
  useEffect(() => {
    if (!selectedClassLog || !teacherProfile?.school_id) return;

    const fetchClassLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const { data, error } = await supabase
          .from('lesson_logs')
          .select('*')
          .eq('school_id', teacherProfile.school_id)
          .eq('class_name', selectedClassLog.className)
          .eq('subject', selectedClassLog.subject)
          .order('logged_at', { ascending: false });

        if (error) throw error;
        setLogsList(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchClassLogs();
  }, [selectedClassLog, teacherProfile?.school_id]);
  const handleSaveLessonLog = async () => {
    if (!lessonText.trim() || !selectedClassLog) {
      alert('Please enter lesson remarks before saving.');
      return;
    }
    
    setIsSavingLog(true);

    try {
      const { error } = await supabase.from('lesson_logs').insert([
        {
          school_id: teacherProfile?.school_id || '',
          teacher_id: teacherProfile?.teacher_id || '',
          teacher_name: teacherProfile?.name || '',
          class_name: selectedClassLog.className,
          subject: selectedClassLog.subject,
          lesson_content: lessonText,
          status: 'SUBMITTED',
          logged_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert('Lesson log saved successfully!');
      setLessonText('');
    } catch (err) {
      console.error('Error saving lesson log:', err);
      alert('Failed to save log. Please try again.');
    } finally {
      setIsSavingLog(false);
    }
  };
useEffect(() => {
    const fetchTeacherAndSchool = async () => {
      const savedSchoolId = localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
      const teacherId = localStorage.getItem('active_teacher_id') || localStorage.getItem('teacher_id');

      if (savedSchoolId && teacherId) {
        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('school_id', savedSchoolId)
          .maybeSingle();

        if (teacherData && !error) {
          setTeacherProfile(teacherData);
        }
      }

      const currentSchoolId = savedSchoolId || teacherProfile?.school_id;
      if (currentSchoolId) {
        const { data: schoolData } = await supabase
          .from('assigned_schools')
          .select('name')
          .eq('school_id', currentSchoolId)
          .maybeSingle();

        if (schoolData?.name) {
          setSchoolName(schoolData.name);
        } else {
          setSchoolName('Assigned School');
        }
      }
    };

    fetchTeacherAndSchool();
  }, [teacherProfile?.school_id]);
  // Attendance & Marks State
  
  const [selectedClassForAction, setSelectedClassForAction] = useState('');
  const [selectedSubjectForAction, setSelectedSubjectForAction] = useState('');
const [selectedSection, setSelectedSection] = useState('General');
  // Clean student list initialized for the assigned class with zero/empty initial marks
  const [classStudents, setClassStudents] = useState([]);

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
// Auto-set initial assigned Class and Subject from teacher profile
  useEffect(() => {
    if (teacherProfile?.classes && teacherProfile.classes.length > 0) {
      if (!selectedClassForAction) {
        setSelectedClassForAction(teacherProfile.classes[0]);
      }
    }
    if (teacherProfile?.subjects && teacherProfile.subjects.length > 0) {
      if (!selectedSubjectForAction) {
        // Sort subjects alphabetically for smooth selection
        const sortedSubjects = [...teacherProfile.subjects].sort((a, b) => a.localeCompare(b));
        setSelectedSubjectForAction(sortedSubjects[0]);
      }
    }
  }, [teacherProfile]);
  // Fetch students filtered by active school and selected class
  const fetchStudents = async () => {
    const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
    
    if (!activeSchoolId || !selectedClassForAction) {
      setClassStudents([]);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, gender, roll_number, class_name, school_id')
      .eq('school_id', activeSchoolId)
      .eq('class_name', selectedClassForAction);

    if (data && !error) {
      setClassStudents(data);
    } else {
      setClassStudents([]);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassForAction, teacherProfile?.school_id]);
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const savedSchoolId = localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
    if (savedSchoolId) {
      setTeacherProfile(prev => ({ ...prev, school_id: savedSchoolId }));
    }

    // Dynamic Online Quotes API with Fallback
    fetch('https://api.quotable.io/random?tags=education|wisdom|success|learning')
      .then(res => res.json())
      .then(data => {
        if (data?.content) {
          setCurrentQuote(`"${data.content}" — ${data.author || 'Unknown'}`);
        }
      })
      .catch(() => {
        const randomFallback = quotesList[Math.floor(Math.random() * quotesList.length)];
        setCurrentQuote(randomFallback);
      });

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

  const handleMarkChange = (studentId, field, rawValue) => {
    const numValue = parseFloat(rawValue);
    const clampedValue = isNaN(numValue) ? '' : Math.max(0, Math.min(20, numValue));

    setMarksRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: clampedValue
      }
    }));
  };
  useEffect(() => {
    const fetchExistingMarks = async () => {
      const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
      
      if (!activeSchoolId || !selectedClassForAction || !selectedSubjectForAction || !selectedTerm) {
        return;
      }

      const { data, error } = await supabase
        .from('marks')
        .select('student_id, seq1_mark, seq2_mark, seq3_mark, seq4_mark, seq5_mark, seq6_mark, edit_count')
        .eq('school_id', activeSchoolId)
        .eq('class_name', selectedClassForAction)
        .eq('subject', selectedSubjectForAction)
        .eq('term', selectedTerm);

      if (error) {
        console.error('Error fetching existing marks:', error);
        return;
      }

      if (data) {
        const hasBeenEdited = data.some(item => (item.edit_count || 0) >= 1);
setIsMarksLocked(hasBeenEdited);
        const loadedMarks = {};
        data.forEach(item => {
          loadedMarks[item.student_id] = {
            seq1: item.seq1_mark !== null ? item.seq1_mark : '',
            seq2: item.seq2_mark !== null ? item.seq2_mark : '',
            seq3: item.seq3_mark !== null ? item.seq3_mark : '',
            seq4: item.seq4_mark !== null ? item.seq4_mark : '',
            seq5: item.seq5_mark !== null ? item.seq5_mark : '',
            seq6: item.seq6_mark !== null ? item.seq6_mark : ''
          };
        });
        setMarksRecords(loadedMarks);
      }
    };

    fetchExistingMarks();
  }, [selectedClassForAction, selectedSubjectForAction, selectedTerm, teacherProfile]);
useEffect(() => {
  const fetchTenantStudents = async () => {
    if (!teacherProfile?.school_id) return;

    setIsLoadingStudents(true);

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', teacherProfile.school_id);

    if (error) {
      console.error('Error fetching tenant students:', error);
    } else if (data) {
      setClassStudents(data);
    }

    setIsLoadingStudents(false);
  };

  fetchTenantStudents();
}, [teacherProfile?.school_id]);
// Helper to get sequence labels based on selected term
  const getSequenceLabels = (term) => {
    switch (term) {
      case 'Term 2':
        return { seq1Label: '3rd Sequence', seq2Label: '4th Sequence' };
      case 'Term 3':
        return { seq1Label: '5th Sequence', seq2Label: '6th Sequence' };
      default:
        return { seq1Label: '1st Sequence', seq2Label: '2nd Sequence' };
    }
  };
  const submitAttendance = async () => {
    const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
    const teacherId = localStorage.getItem('teacher_id') || teacherProfile?.id;

    if (!activeSchoolId || !selectedClassForAction) {
      toast.error('Missing school or class context');
      return;
    }

    if (classStudents.length === 0) {
      toast.error('No students found for this class');
      return;
    }

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    const currentDayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const recordsToInsert = classStudents.map((student) => ({
      school_id: activeSchoolId,
      teacher_id: teacherId,
      student_id: student.id,
      class_name: selectedClassForAction,
      subject: selectedSubjectForAction,
      status: attendanceRecords[student.id] || 'Present',
      date: currentDateStr,
      day_of_week: currentDayStr,
      time_recorded: currentTimeStr
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(recordsToInsert, { onConflict: 'school_id,student_id,date,subject' });

    if (!error) {
      toast.success(`Attendance submitted for ${currentDayStr}, ${currentDateStr}!`);
      setSubmissionStatus((prev) => ({
        ...prev,
        attendanceSubmitted: true,
        lastUpdated: `${currentDayStr} at ${currentTimeStr}`
      }));
    } else {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to submit attendance');
    }
  };
 const submitMarks = async () => {
  if (isMarksLocked) {
      toast.error("You can only edit student marks once. Please contact your school administrator to request further modifications.");
      return;
    }
    const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
    const teacherId = localStorage.getItem('teacher_id') || teacherProfile?.id;

    if (!activeSchoolId || !selectedClassForAction || !selectedSubjectForAction) {
      toast.error('Missing school, class, or subject selection');
      return;
    }

    if (classStudents.length === 0) {
      toast.error('No students found for this class');
      return;
    }

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    const currentDayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Fetch class coefficients for multi-tenant mapping
  const { data: activeCoefficients } = await supabase
    .from('class_coefficients')
    .select('id, subject_name, subject_code, trades_series')
    .eq('school_id', activeSchoolId);

  // 2. Build multi-tier resolution map
  const coeffMap = new Map();
  (activeCoefficients || []).forEach(c => {
    if (c.id) coeffMap.set(c.id, c.subject_name);

    const rawSeries = c.trades_series ? String(c.trades_series).trim().toLowerCase() : '';
    const rawName = c.subject_name ? String(c.subject_name).trim().toLowerCase() : '';
    const rawCode = c.subject_code ? String(c.subject_code).trim().toLowerCase() : '';

    if (rawName) coeffMap.set(rawName, c.subject_name);
    if (rawCode) coeffMap.set(rawCode, c.subject_name);

    if (rawSeries) {
      if (rawName) coeffMap.set(`${rawName}_${rawSeries}`, c.subject_name);
      if (rawCode) coeffMap.set(`${rawCode}_${rawSeries}`, c.subject_name);
    }
  });

  // 3. Prepare base subject key
  const rawSubName = (selectedSubjectForAction || '').toString().trim().toLowerCase();

  const recordsToInsert = classStudents.map((student) => {
    const studentEntry = marksRecords[student.id] || {};

    // Per-student trades_series resolution strictly inside map callback
    const rawStudentSeries = (student?.trades_series || student?.series || '').toString().trim().toLowerCase();
    const resolvedSubjectName = (rawStudentSeries ? coeffMap.get(`${rawSubName}_${rawStudentSeries}`) : null) || 
                                coeffMap.get(rawSubName) || 
                                selectedSubjectForAction;

    // Parse individual sequence fields if present in UI state
    const s1 = studentEntry.seq1 !== '' && studentEntry.seq1 !== undefined ? parseFloat(studentEntry.seq1) : null;
    const s2 = studentEntry.seq2 !== '' && studentEntry.seq2 !== undefined ? parseFloat(studentEntry.seq2) : null;
    const s3 = studentEntry.seq3 !== '' && studentEntry.seq3 !== undefined ? parseFloat(studentEntry.seq3) : null;
    const s4 = studentEntry.seq4 !== '' && studentEntry.seq4 !== undefined ? parseFloat(studentEntry.seq4) : null;
    const s5 = studentEntry.seq5 !== '' && studentEntry.seq5 !== undefined ? parseFloat(studentEntry.seq5) : null;
    const s6 = studentEntry.seq6 !== '' && studentEntry.seq6 !== undefined ? parseFloat(studentEntry.seq6) : null;

    const record = {
      school_id: activeSchoolId,
      teacher_id: teacherId,
      student_id: student.id,
      unique_code: student.unique_code,
      section: student.section,
      class_name: selectedClassForAction,
      subject: resolvedSubjectName,
      trades_series: student?.trades_series || student?.series || '',
      coefficient: selectedSubjectCoeff || 1, // Attaches class specific coefficient
      term: selectedTerm,
      date_recorded: currentDateStr,
      edit_count: 1
    };

    // Only attach non-null sequence values so existing DB sequence values are preserved on upsert
    if (s1 !== null) record.seq1_mark = s1;
    if (s2 !== null) record.seq2_mark = s2;
    if (s3 !== null) record.seq3_mark = s3;
    if (s4 !== null) record.seq4_mark = s4;
    if (s5 !== null) record.seq5_mark = s5;
    if (s6 !== null) record.seq6_mark = s6;

    return record;
  });

    const { error } = await supabase
      .from('marks')
      .upsert(recordsToInsert, { onConflict: 'school_id,student_id,subject,term' });

    if (!error) {
      toast.success(`Marks successfully submitted for ${selectedClassForAction} - ${selectedSubjectForAction}!`);
      setSubmissionStatus((prev) => ({
        ...prev,
        marksSubmitted: true,
        lastUpdated: `${currentDayStr} at ${currentTimeStr}`
      }));
    } else {
      console.error('Error submitting marks:', error);
      toast.error('Failed to submit marks to database');
    }
  };

  const downloadTimetable = () => {
    toast.success('Timetable downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans">
      <header className="bg-[#111827] border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center justify-between gap-4 w-full">
          {navigationHistory.length > 1 && (
            <button 
              onClick={handleGoBack}
              className="bg-gray-800 hover:bg-gray-700 text-amber-400 border border-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
          )}
         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          {/* Left: School Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
              LOGO
            </div>
            <div>
  <h1 className="text-lg font-bold text-amber-400 tracking-tight">
  {schoolName || teacherProfile?.school_name || teacherProfile?.schoolName || 'Assigned School'}
</h1>
  <p className="text-xs text-slate-400">
    Teacher Portal | Welcome, <strong className="text-white">{teacherProfile?.name || 'Teacher'}</strong>
  </p>
</div>
          </div>

          {/* Right: Clock & Teacher Active Session */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono text-amber-300 font-semibold">
                {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {currentTime ? currentTime.toLocaleTimeString() : ''}
              </div>
            </div>
            <div className="flex flex-col items-end ml-auto gap-1">
  <span className="text-xs bg-blue-900/60 text-blue-400 border border-blue-700/50 px-3 py-1 rounded-full font-medium whitespace-nowrap">
    Teacher Active Session
  </span>
  <span className="text-[10px] text-emerald-400 mt-1 font-mono whitespace-nowrap">
    Admin Sync: {submissionStatus?.marksSubmitted ? 'Marks Uploaded (Completed)' : 'Pending Marks Entry'}
  </span>
</div>
        </div>
      </div>
    </div>
  </header>

      {/* Motivational Quote Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-blue-900/30 to-[#111827] border-b border-gray-800 px-6 py-3 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-xs italic text-amber-200/90 font-serif">
          &ldquo;{currentQuote.quote}&rdquo; — <span className="font-semibold text-white">{currentQuote.author}</span>
        </p>
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">NsuhRecords Daily Inspiration</span>
      </div>

      <nav className="bg-[#111827]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
      {[
          { id: 'overview', label: 'My Overview & Timetable' },
          { id: 'attendance', label: 'Mark Attendance' },
          { id: 'grades', label: 'Fill Student Marks' },
          { id: 'progression', label: 'Lesson Logs & Progression' },
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
            {/* Teacher Credentials & ID Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {teacherProfile?.photo ? (
                <img src={teacherProfile.photo} alt="Teacher Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-amber-400">
                  {teacherProfile?.full_name?.charAt(0) || 'T'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{teacherProfile?.name || 'Teacher Profile'}</h2>
              <p className="text-xs text-slate-400">{teacherProfile?.email || 'No email provided'}</p>
              <p className="text-xs text-slate-400">{teacherProfile?.phone || 'No phone provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-700 w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Teacher ID</span>
              <span className="text-xs font-mono font-bold text-amber-400">{teacherProfile?.teacher_id || 'ID Pending'}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(teacherProfile?.teacher_id || '')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded transition-colors"
            >
              Copy ID
            </button>
          </div>
        </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Subjects Assigned</h3>
                <p className="text-2xl font-black mt-2 text-amber-400">{teacherProfile.subjects.length}</p>
               <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-1">
  {teacherProfile.subjects && teacherProfile.subjects.length > 0 ? (
    teacherProfile.subjects.map((sub, i) => (
      <span key={i} className="bg-amber-900/40 text-amber-300 px-3 py-1 rounded text-xs border border-amber-700/50">
        {sub}
      </span>
    ))
  ) : (
    <p className="text-xs text-gray-400 italic">No subjects assigned yet by administrator.</p>
  )}
</div>
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
                    {teacherProfile.schedules && Object.keys(teacherProfile.schedules).length > 0 ? (
  Object.entries(teacherProfile.schedules).map(([sub, rows]) =>
    rows.map((row, rIdx) => (
      <tr key={`${sub}-${rIdx}`} className="hover:bg-gray-800/40">
        <td className="p-3 border border-gray-700 font-bold text-white">{sub}</td>
        <td className="p-3 border border-gray-700 text-amber-300 font-semibold">{row.className}</td>
        <td className="p-3 border border-gray-700">{row.day}</td>
        <td className="p-3 border border-gray-700 font-mono text-emerald-400">{row.startTime} - {row.endTime}</td>
      </tr>
    ))
  )
) : (
  <tr>
    <td colSpan="4" className="p-6 text-center text-gray-500 italic">
      No class schedule assigned yet by administrator for this school ID.
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
{/* LESSON LOGS & PROGRESSION TAB */}
      {activeTab === 'progression' && (
        <div className="space-y-6">
          {/* Targeted 3-Hour Mobile Reminder Notice */}
          <div className="bg-[#2D5A27]/20 border-2 border-[#2D5A27] p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Active Timetable Reminder System Enabled
                </h4>
                <p className="text-xs text-gray-200 mt-0.5">
                  Reminders trigger every 3 hours post-lesson for <strong className="text-white">{teacherProfile?.name || 'Teacher'}</strong>. 
                  Unfilled slots lock permanently as <span className="text-red-400 font-bold uppercase">Absent</span> after 24 hours.
                </p>
              </div>
            </div>
          </div>
          {/* Header Card */}
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📄</span> Lesson Logs & Progression
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Record daily covered topics. Missed slots lock after 24 hours and are marked ABSENT.
              </p>
            </div>
          </div>

          {/* Active Class & Subject Selection Bar */}
          <div className="bg-[#1f2937] border border-gray-700 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Select Class & Subject Sheet</h3>
            <div className="flex flex-wrap gap-2">
              {teacherProfile?.schedules && Object.keys(teacherProfile.schedules).length > 0 ? (
                Object.entries(teacherProfile.schedules).map(([sub, rows]) =>
                  rows.map((row, rIdx) => {
                    const isSelected = selectedClassLog?.className === row.className && selectedClassLog?.subject === sub;
                    return (
                      <button
                        key={`${sub}-${rIdx}`}
                        onClick={() => setSelectedClassLog({ className: row.className, subject: sub, schedule: row })}
                        className={`text-xs font-bold px-3 py-2 rounded-lg transition-all border shadow-sm flex items-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 scale-105 ring-2 ring-amber-300'
                            : 'bg-[#2D5A27] hover:bg-[#1E3E1A] text-white border-emerald-600'
                        }`}
                      >
                        <span>{row.className}</span>
                        <span className={isSelected ? 'text-black/80 font-extrabold' : 'text-emerald-200'}>({sub})</span>
                      </button>
                    );
                  })
                )
              ) : (
                <p className="text-xs text-gray-400 italic">No assigned classes found to generate log sheets.</p>
              )}
            </div>
          </div>

          {/* Continuous Progression Sheet Feed Placeholder */}
          {/* Continuous Progression Sheet Feed Container */}
          <div className="bg-[#FDFBF7] border-2 border-[#2D5A27] rounded-xl p-5 text-gray-900 shadow-xl space-y-6">
            
            {selectedClassLog ? (
              <>
                {/* Active Class Title Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#2D5A27] pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-black text-[#2D5A27] uppercase tracking-wide">
                      {selectedClassLog.className} — {selectedClassLog.subject}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Scheduled Slot: <span className="font-bold text-[#2D5A27]">{selectedClassLog.schedule?.day || 'Today'} ({selectedClassLog.schedule?.startTime} - {selectedClassLog.schedule?.endTime})</span>
                    </p>
                  </div>
                  <span className="bg-[#2D5A27] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start md:self-auto">
                    Active Logging Period
                  </span>
                </div>

                {/* Daily Topic Entry Form */}
              <div className="bg-white border border-emerald-800/30 p-4 rounded-lg shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-[#2D5A27] uppercase tracking-wider">
                    Today's Lesson Taught & Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={lessonText}
                    onChange={(e) => setLessonText(e.target.value)}
                    placeholder="Enter chapter title, main sub-topics covered, practical work, or homework assigned..."
                    className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent outline-none text-gray-800 font-sans"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveLessonLog}
                      disabled={isSavingLog}
                      className="bg-[#2D5A27] hover:bg-[#1E3E1A] text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <span>💾</span> {isSavingLog ? 'Saving...' : 'Save Lesson Entry'}
                    </button>
                  </div>
                </div>

                {/* Continuous Historical Log Flow */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1">
                    Continuous Progression Record History
                  </h4>
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white text-xs">
                    <div className="grid grid-cols-12 bg-[#1E3E1A] text-white font-bold p-2.5 text-center text-[11px]">
                      <span className="col-span-2">Date & Time</span>
                      <span className="col-span-7">Lesson Content Covered</span>
                      <span className="col-span-3">Status / Action</span>
                    </div>
                    {isLoadingLogs ? (
                    <div className="p-4 text-center text-gray-500 italic">Loading progression history...</div>
                  ) : logsList.length > 0 ? (
                    logsList.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        className="grid grid-cols-12 p-2.5 border-b border-gray-200 items-center hover:bg-emerald-50/40 text-gray-800"
                      >
                        <span className="col-span-2 text-center text-[11px] font-semibold text-gray-600">
                          {new Date(log.logged_at).toLocaleDateString()} <br />
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                        <span className="col-span-7 px-2 font-medium">{log.lesson_content}</span>
                        <span className="col-span-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'ABSENT'
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {log.status || 'SUBMITTED'}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 italic">
                      No prior logs submitted for this class yet. Entries logged above will flow here continuously.
                    </div>
                  )}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center space-y-2">
                <span className="text-3xl">👈</span>
                <p className="text-xs font-bold text-[#2D5A27] uppercase tracking-wider">
                  Select a Class & Subject Sheet Above
                </p>
                <p className="text-xs text-gray-600">
                  Click any green class badge at the top to open its active daily log form and past progression history.
                </p>
              </div>
            )}

          </div>

        </div>
      )}
        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-slate-800/90 border border-slate-700 p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Class Attendance — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Select Subject</label>
                <select 
                  value={selectedSubjectForAction}
                  onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                  className="w-full bg-[#1f2937] bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-amber-300 font-bold"
                >
                  {teacherProfile.subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Select Class / Form</label>
                <select 
                  value={selectedClassForAction}
                  onChange={(e) => setSelectedClassForAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
                >
                  {teacherProfile?.classes && teacherProfile.classes.length > 0 ? (
  teacherProfile.classes.map((cls, i) => (
    <option key={i} value={cls}>{cls}</option>
  ))
) : (
  <option value="">No Classes Assigned</option>
)}
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
        <div className="bg-[#111827] rounded-xl border border-gray-800 p-4 sm:p-6 w-full max-w-full overflow-hidden shadow-lg space-y-6">
          
          {/* Header & Sync Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Fill Student Marks
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Marks entered are automatically sent to Student Reports and School Admin for checking.
              </p>
            </div>

            {/* Batch Info Badge */}
            <div className="flex items-center gap-2 bg-[#1f2937] px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-amber-300 font-medium">
              <span>{selectedSubjectForAction || 'No Subject Assigned'}</span>
              <span>•</span>
              <span>{selectedClassForAction || 'No Class Assigned'}</span>
            </div>
          </div>

          {/* Subject & Class Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Select Term
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="Term 1">Term 1 (Seq 1 & 2)</option>
            <option value="Term 2">Term 2 (Seq 3 & 4)</option>
            <option value="Term 3">Term 3 (Seq 5 & 6)</option>
          </select>
        </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Select Subject
              </label>
              <select
                value={selectedSubjectForAction}
                onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              >
                {teacherProfile?.subjects && teacherProfile.subjects.length > 0 ? (
                  teacherProfile.subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))
                ) : (
                  <option value="">No Subjects Assigned</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Select Class / Form
              </label>
              <select
                value={selectedClassForAction}
                onChange={(e) => setSelectedClassForAction(e.target.value)}
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
              >
                {teacherProfile?.classes && teacherProfile.classes.length > 0 ? (
                  teacherProfile.classes.map((cls, i) => (
                    <option key={i} value={cls}>{cls}</option>
                  ))
                ) : (
                  <option value="">No Classes Assigned</option>
                )}
              </select>
            </div>
          </div>

          {/* Empty State: Unassigned Teacher */}
          {(!selectedClassForAction || !selectedSubjectForAction) ? (
            <div className="text-center py-10 px-4 bg-[#1a2234] rounded-lg border border-dashed border-gray-700">
              <p className="text-amber-400 text-sm font-semibold">No Active Class or Subject Assigned</p>
              <p className="text-gray-400 text-xs mt-1">
                Once the school administrator assigns your subjects and classes, they will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW: Large, Computer-Friendly Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                   <tr className="bg-[#fffdf0] text-gray-900 text-xs font-bold uppercase tracking-wider border-b border-amber-200">
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5 text-center">{getSequenceLabels(selectedTerm).seq1Label}</th>
                    <th className="p-3.5 text-center">{getSequenceLabels(selectedTerm).seq2Label}</th>
                    <th className="p-3.5 text-center">Term Avg</th>
                    </tr>
                  </thead>
                 <tbody className="bg-[#fffdf0] text-gray-900 divide-y divide-amber-200 text-sm">
            {classStudents.map((stu) => (
              <tr key={stu.id} className="hover:bg-[#fef9e7] transition-colors">
                <td className="p-3.5 text-gray-900 font-mono font-bold">{stu.id}</td>
                <td className="p-3.5 text-gray-900 font-semibold">{stu.fullName || stu.name}</td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    placeholder={getSequenceLabels(selectedTerm).seq1Label}
                    value={marksRecords[stu.id]?.seq1 ?? ''}
onChange={(e) => handleMarkChange(stu.id, 'seq1', e.target.value)}
                    className="w-20 bg-white border border-amber-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    placeholder={getSequenceLabels(selectedTerm).seq2Label}
                    value={marksRecords[stu.id]?.seq2 ?? ''}
onChange={(e) => handleMarkChange(stu.id, 'seq2', e.target.value)}
                    className="w-20 bg-white border border-amber-300 rounded px-2 py-1 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </td>
                <td className="p-3.5 text-center font-extrabold text-amber-900">
                  -
                </td>
              </tr>
            ))}
          </tbody>
                </table>
              </div>

              {/* MOBILE VIEW: Large Touch-Friendly Cards */}
              <div className="block md:hidden space-y-4">
                {classStudents.map((stu) => (
                  <div key={stu.id} className="bg-[#1a2234] p-4 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <div>
                        <p className="text-white font-bold text-sm">{stu.fullName || stu.name}</p>
                        <p className="text-xs text-amber-400 font-mono">ID: {stu.id}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 rounded border border-emerald-800">
                        Auto-Sent
                      </span>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Score (/20)</label>
                      <input
                        type="number"
                        placeholder="0 (Reset)"
                        max="20"
                        min="0"
                        step="0.5"
                        value={marksRecords[stu.id]?.seq1 ?? ''}
onChange={(e) => handleMarkChange(stu.id, 'seq1', e.target.value)}
                        className="w-full text-center bg-[#0b0f19] border border-gray-600 rounded-lg py-2.5 text-base text-white font-bold focus:border-amber-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Action Button */}
              <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={submitMarks}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg transition-all active:scale-95 text-sm"
                >
                  Upload & Submit Scores
                </button>
              </div>
            </>
          )}
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
                  <input type="text" value={teacherProfile.teacher_id || ''} disabled className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg p-3 font-mono text-amber-300 font-bold" />
                  <button 
                    onClick={() => {
                     navigator.clipboard.writeText(teacherProfile.teacher_id || ''); 
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