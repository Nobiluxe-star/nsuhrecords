'use client';

import React, { useState, useRef, useEffect } from 'react';

// Cameroon Ministry of Secondary Education Official Subjects & Technical Trades
const TECHNICAL_CLASSES_CATALOG = [
  'First Year (Year 1) Technical',
  'Second Year (Year 2) Technical',
  'Third Year (Year 3) Technical / CAPIET / CAP',
  'Fourth Year (Year 4) Technical / Probatoire Tech',
  'Fifth Year (Year 5) Technical / Baccalaureate Tech',
  'Lower Sixth Technical (L6 Tech)',
  'Upper Sixth Technical (U6 Tech)'
];

const GENERAL_CLASSES_CATALOG = [
  'Form 1 (F1)',
  'Form 2 (F2)',
  'Form 3 (F3)',
  'Form 4 (F4)',
  'Form 5 (F5)',
  'Lower Sixth Arts & Science',
  'Upper Sixth Arts & Science'
];

const ALL_AVAILABLE_CLASSES = [
  ...GENERAL_CLASSES_CATALOG,
  ...TECHNICAL_CLASSES_CATALOG
];

const SUBJECTS_CATALOG = {
  General: [
    'English Language', 'French Language', 'Mathematics', 'Integrated Science', 
    'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Citizenship', 
    'Commerce', 'Computer Science', 'Literature in English', 'Economics', 
    'Religious Studies', 'Food and Nutrition', 'Human Biology', 'Philosophy'
  ],
  Technical: [
    'Building Construction', 'Woodwork', 'Metalwork', 'Technical Drawing', 
    'Basic Electricity', 'Electronics', 'Automobile Mechanics', 'Financial Accounting', 
    'Business Management', 'Secretarial Administration', 'Computer Science', 
    'Mathematics', 'English Language', 'French Language', 'General Science',
    'Civil Engineering', 'Plumbing', 'Air Conditioning & Refrigeration', 'Welding & Fabrication'
  ]
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  
  // Real Phone Time State
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Registration Form State
  const [regRole, setRegRole] = useState('student');
  
  // Common Member / Student Form Credentials
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [residence, setResidence] = useState('');
  const [picturePreview, setPicturePreview] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);

  // Student Specific State Fields
  const [section, setSection] = useState('General'); 
  const [classLevel, setClassLevel] = useState(GENERAL_CLASSES_CATALOG[0]); 
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [selectedTechnicalSubject, setSelectedTechnicalSubject] = useState(SUBJECTS_CATALOG.Technical[0]);

  // Other School Personnel Staff Registration Fields (Bursar, Supervisor, Discipline Master, Principal)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffResidence, setStaffResidence] = useState('');

  // Teacher Assignment State Fields (Classes added dynamically per subject, no period field)
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherResidence, setTeacherResidence] = useState('');
  const [teacherSection, setTeacherSection] = useState('General');
  
  // Per-Subject Schedule Configuration State (mapping subject -> list of class schedules with day, startTime, endTime)
  const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState([]);
  const [subjectClassSchedules, setSubjectClassSchedules] = useState({});

  // Application Data States
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [successPopup, setSuccessPopup] = useState(null);
  const [activeTeacherResult, setActiveTeacherResult] = useState(null);
  const [activePersonnelResult, setActivePersonnelResult] = useState(null);
  const [schoolContact, setSchoolContact] = useState('682491189');

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

  // Handle Camera Capture
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Unable to access camera. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setPicturePreview(dataUrl);
    
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPicturePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateCameroonPhone = (number) => {
    if (!number) return true;
    const cameroonPhoneRegex = /^6\d{8}$/;
    return cameroonPhoneRegex.test(number);
  };

  // Student Registration Submission with Gender Included
  const handleStudentRegistration = (e) => {
    e.preventDefault();

    if (!fullName || !guardianPhone || !age || !dob || !gender) {
      alert('Please fill in all mandatory student credential fields including gender.');
      return;
    }

    if (phone && !validateCameroonPhone(phone)) {
      alert('Invalid Student Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }

    if (!validateCameroonPhone(guardianPhone)) {
      alert('Invalid Guardian Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }

    const sectionCode = section === 'Technical' ? 'TE' : 'GE';
    const regCount = 1000 + studentsList.length + 1;
    const uniqueStudentId = `${sectionCode}${regCount}26`;

    const newStudentRecord = {
      id: uniqueStudentId,
      fullName,
      section,
      classLevel,
      gender,
      age,
      dob,
      residence: residence || 'N/A',
      guardianName: guardianName || 'Parent',
      guardianPhone,
      medicalHistory: medicalHistory || 'None',
      picture: picturePreview,
      phone: phone || guardianPhone
    };

    setStudentsList([newStudentRecord, ...studentsList]);
    setSuccessPopup(uniqueStudentId);

    setFullName('');
    setPhone('');
    setResidence('');
    setPicturePreview(null);
    setAge('');
    setDob('');
    setGender('Male');
    setGuardianName('');
    setGuardianPhone('');
    setMedicalHistory('');
  };

  // Other School Personnel Registration (Bursar, Supervisor, Discipline Master, Principal)
  const handlePersonnelRegistration = (e) => {
    e.preventDefault();

    if (!fullName || !phone) {
      alert('Name and Contact Number are mandatory for school personnel registration.');
      return;
    }

    if (!validateCameroonPhone(phone)) {
      alert('Invalid Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }

    // Generate American Standard Unique Credential ID mixed with letters and numbers (e.g. US-PR-79A2B4)
    const roleCodeMap = {
      principal: 'PR',
      supervisor: 'SV',
      discipline_master: 'DM',
      bursar: 'BS'
    };
    const prefix = roleCodeMap[regRole] || 'ST';
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const uniqueStaffId = `US-${prefix}-${randomHex}`;

    const token = Math.random().toString(36).substring(2, 10);
    const signupLink = `http://localhost:3000/staff-signup?token=${token}&id=${uniqueStaffId}`;

    const newStaffRecord = {
      id: uniqueStaffId,
      role: regRole,
      title: regRole === 'discipline_master' ? 'Discipline Master' : regRole.charAt(0).toUpperCase() + regRole.slice(1),
      fullName,
      phone,
      email: staffEmail || 'N/A',
      residence: staffResidence || 'N/A',
      signupLink
    };

    setPersonnelList([newStaffRecord, ...personnelList]);
    setActivePersonnelResult(newStaffRecord);

    setFullName('');
    setPhone('');
    setStaffEmail('');
    setStaffResidence('');
    alert(`${newStaffRecord.title} registered successfully with unique ID ${uniqueStaffId}!`);
  };

  // Handle Toggle Subject & Initialize default schedule rows
  const handleSubjectToggle = (sub, checked) => {
    let updatedSubjects;
    if (checked) {
      updatedSubjects = [...selectedTeacherSubjects, sub];
      setSubjectSchedules(prev => ({
        ...prev,
        [sub]: [
          { className: ALL_AVAILABLE_CLASSES[0], day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' }
        ]
      }));
    } else {
      updatedSubjects = selectedTeacherSubjects.filter(s => s !== sub);
      setSubjectSchedules(prev => {
        const copy = { ...prev };
        delete copy[sub];
        return copy;
      });
    }
    setSelectedTeacherSubjects(updatedSubjects);
  };

  // Helper alias to avoid scope confusion
  const subjectSchedules = subjectClassSchedules;
  const setSubjectSchedules = setSubjectClassSchedules;

  // Add another class session row for a particular subject
  const addClassRowToSubject = (subject) => {
    setSubjectSchedules(prev => ({
      ...prev,
      [subject]: [
        ...(prev[subject] || []),
        { className: ALL_AVAILABLE_CLASSES[0], day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' }
      ]
    }));
  };

  // Remove a class session row for a subject
  const removeClassRowFromSubject = (subject, index) => {
    setSubjectSchedules(prev => {
      const list = [...(prev[subject] || [])];
      list.splice(index, 1);
      return { ...prev, [subject]: list };
    });
  };

  // Update specific class schedule row values for a teacher's subject
  const handleScheduleRowChange = (subject, index, field, value) => {
    setSubjectSchedules(prev => {
      const list = [...(prev[subject] || [])];
      list[index] = {
        ...list[index],
        [field]: value
      };
      return { ...prev, [subject]: list };
    });
  };

  // Teacher Assignment Submission with Validation Rules & Conflict Checks
  const handleTeacherAssignment = (e) => {
    e.preventDefault();

    if (!teacherName || !teacherPhone || !teacherEmail || selectedTeacherSubjects.length === 0) {
      alert('Please provide teacher name, mandatory email, phone number, and select at least one subject with class schedules.');
      return;
    }

    if (!validateCameroonPhone(teacherPhone)) {
      alert('Invalid Teacher Phone Number! Must be 9 digits starting with 6.');
      return;
    }

    // Validation: Prevent duplicate overlapping class time slots
    const assignedSlotsTracker = new Set();
    let hasConflict = false;

    for (const sub of selectedTeacherSubjects) {
      const rows = subjectSchedules[sub] || [];
      for (const row of rows) {
        const slotKey = `${row.day}-${row.startTime}-${row.endTime}-${row.className}`;
        if (assignedSlotsTracker.has(slotKey)) {
          hasConflict = true;
          break;
        }
        assignedSlotsTracker.add(slotKey);
      }
      if (hasConflict) break;
    }

    if (hasConflict) {
      alert('Conflict Error: A class cannot receive two subjects at the exact same day and time slot!');
      return;
    }

    const teacherId = 'US-TC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const signupToken = 'teach_' + Math.random().toString(36).substring(2, 9);
    const generatedLink = `http://localhost:3000/teacher-signup?token=${signupToken}&id=${teacherId}`;

    const newTeacherRecord = {
      id: teacherId,
      name: teacherName,
      phone: teacherPhone,
      email: teacherEmail,
      residence: teacherResidence || 'N/A',
      section: teacherSection,
      subjects: selectedTeacherSubjects,
      schedules: subjectSchedules,
      picture: picturePreview,
      signupLink: generatedLink
    };

    setTeachersList([newTeacherRecord, ...teachersList]);
    setActiveTeacherResult(newTeacherRecord);
    setPicturePreview(null);
    setTeacherName('');
    setTeacherPhone('');
    setTeacherEmail('');
    setTeacherResidence('');
    setSelectedTeacherSubjects([]);
    setSubjectSchedules({});
    alert('Teacher successfully assigned with unique ID, validation passed, and timetable generated!');
  };

  const currentYear = currentTime ? currentTime.getFullYear() : 2026;

  // Compute student counts
  const totalStudents = studentsList.length;
  const technicalStudentsCount = studentsList.filter(s => s.section === 'Technical').length;
  const generalStudentsCount = studentsList.filter(s => s.section === 'General').length;

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
            <h1 className="text-xl font-bold tracking-tight text-amber-400 uppercase">Wisdom College</h1>
            <p className="text-xs text-gray-400">Academic Year: 2026-2027 | Administrator Portal | Contact: {schoolContact}</p>
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
          <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full font-medium">
            Active Session
          </span>
        </div>
      </header>

      <nav className="bg-[#111827]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'register', label: 'Register New Member' },
          { id: 'students', label: 'All Student List' },
          { id: 'teachers', label: 'Assign New Teacher' },
          { id: 'teacher-list', label: 'All Teacher List' },
          { id: 'personnel', label: 'Other School Personnel' },
          { id: 'details', label: 'School Details' }
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Students</h3>
                <p className="text-3xl font-black mt-2 text-white">{totalStudents}</p>
                <div className="text-[11px] text-gray-400 mt-1 flex gap-2">
                  <span>TE = <strong className="text-amber-400">{technicalStudentsCount}</strong></span> | 
                  <span>General = <strong className="text-amber-400">{generalStudentsCount}</strong></span>
                </div>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Teachers</h3>
                <p className="text-3xl font-black mt-2 text-white">{teachersList.length}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Other Personnel</h3>
                <p className="text-3xl font-black mt-2 text-blue-400">{personnelList.length}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Administrators</h3>
                <p className="text-3xl font-black mt-2 text-amber-400">1</p>
              </div>
            </div>

            {/* General Teacher Timetable Collected Summary */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 border-b border-gray-800 pb-3">
                General School Master Timetable & Teacher Subject Allocation Summary
              </h3>
              {teachersList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No teacher timetables collected yet. Assign teachers to build the master schedule.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                    <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
                      <tr>
                        <th className="p-3 border border-gray-700">Teacher Name (ID)</th>
                        <th className="p-3 border border-gray-700">Subjects Taught</th>
                        <th className="p-3 border border-gray-700">Class & Schedule Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {teachersList.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-800/40">
                          <td className="p-3 border border-gray-700 font-bold text-white">
                            <div>{t.name}</div>
                            <span className="text-[10px] font-mono text-amber-400">{t.id}</span>
                          </td>
                          <td className="p-3 border border-gray-700">
                            {t.subjects.map((sub, sIdx) => (
                              <span key={sIdx} className="inline-block bg-blue-900/30 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded text-[11px] mr-1 mb-1">
                                {sub}
                              </span>
                            ))}
                          </td>
                          <td className="p-3 border border-gray-700 font-mono text-[11px]">
                            {Object.entries(t.schedules).map(([sub, rows], rIdx) => (
                              <div key={rIdx} className="mb-1">
                                <span className="text-amber-300 font-bold">{sub}:</span>{' '}
                                {rows.map((row, rowIdx) => (
                                  <span key={rowIdx} className="text-gray-300 block ml-2">
                                    • {row.className} | {row.day} ({row.startTime} - {row.endTime})
                                  </span>
                                ))}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGISTER NEW MEMBER TAB */}
        {activeTab === 'register' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-3xl mx-auto shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-3">Register New Member</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Select Role</label>
                <select 
                  value={regRole} 
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher (Use Assign New Teacher Tab)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="bursar">Bursar</option>
                  <option value="discipline_master">Discipline Master</option>
                  <option value="principal">Principal</option>
                </select>
              </div>

              {regRole === 'student' ? (
                <form onSubmit={handleStudentRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Section</label>
                      <select 
                        value={section} 
                        onChange={(e) => {
                          const newSec = e.target.value;
                          setSection(newSec);
                          setClassLevel(newSec === 'Technical' ? TECHNICAL_CLASSES_CATALOG[0] : GENERAL_CLASSES_CATALOG[0]);
                        }}
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="General">General Section</option>
                        <option value="Technical">Technical Section</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                        {section === 'Technical' ? 'Technical Class / Trade Level' : 'General Class Level'}
                      </label>
                      <select 
                        value={classLevel} 
                        onChange={(e) => setClassLevel(e.target.value)}
                        className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-amber-300 focus:outline-none"
                      >
                        {(section === 'Technical' ? TECHNICAL_CLASSES_CATALOG : GENERAL_CLASSES_CATALOG).map((cls, idx) => (
                          <option key={idx} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {section === 'Technical' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Technical Specialty Trade</label>
                      <select 
                        value={selectedTechnicalSubject} 
                        onChange={(e) => setSelectedTechnicalSubject(e.target.value)}
                        className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-amber-300 focus:outline-none"
                      >
                        {SUBJECTS_CATALOG.Technical.map((sub, i) => (
                          <option key={i} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Nsuh Divine"
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Gender</label>
                      <select 
                        value={gender} 
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-amber-300 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Age</label>
                      <input 
                        type="number" 
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        required
                        placeholder="15"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={dob}
                        min="1995-01-01"
                        max={`${currentYear}-12-31`}
                        onChange={(e) => setDob(e.target.value)}
                        required
                        className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Quarter / Residence</label>
                      <input 
                        type="text" 
                        value={residence}
                        onChange={(e) => setResidence(e.target.value)}
                        placeholder="Mankon"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Student Phone (Opt.)</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="682491189"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Guardian Name</label>
                      <input 
                        type="text" 
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Mr. Che"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Guardian Phone Number (Mandatory)</label>
                    <input 
                      type="text" 
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      required
                      placeholder="670000000"
                      className="w-full bg-[#1f2937] border border-amber-500/60 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Student Picture (Camera or File)</label>
                    <div className="flex items-center gap-4">
                      {picturePreview ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-amber-500">
                          <img src={picturePreview} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-[#1f2937] border border-gray-700 flex items-center justify-center text-xs text-gray-500">
                          No Image
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="bg-[#1f2937] hover:bg-gray-700 border border-gray-700 text-xs text-center py-2 px-3 rounded-lg cursor-pointer font-medium">
                          Upload From Device
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                        <button type="button" onClick={startCamera} className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-xs text-blue-300 py-2 px-3 rounded-lg font-medium">
                          Snap With Phone Camera
                        </button>
                      </div>
                    </div>

                    {isCameraActive && (
                      <div className="mt-4 p-4 bg-[#1f2937] border border-gray-700 rounded-xl text-center space-y-3">
                        <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 rounded object-cover bg-black mx-auto" />
                        <button type="button" onClick={capturePhoto} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-6 rounded-lg">
                          Capture Snapshot Now
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all mt-4">
                    Register Student & Generate Unique ID
                  </button>
                </form>
              ) : (
                /* Personnel Registration Screen for Bursar, Supervisor, Discipline Master, Principal */
                <form onSubmit={handlePersonnelRegistration} className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300">
                    Registering for role: <strong className="uppercase">{regRole.replace('_', ' ')}</strong>. Name and Contact Number are mandatory. A unique American standard ID and signup link will be generated.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Full Name (Mandatory)</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Dr. Mbah Paul"
                      className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Contact Number (Mandatory)</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="682491189"
                      className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address (Optional)</label>
                      <input 
                        type="email" 
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff@wisdomcollege.cm"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Place of Residence</label>
                      <input 
                        type="text" 
                        value={staffResidence}
                        onChange={(e) => setStaffResidence(e.target.value)}
                        placeholder="Up Station, Bamenda"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all mt-4">
                    Register Personnel & Generate Unique American Standard ID & Link
                  </button>
                </form>
              )}
            </div>

            {successPopup && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                <div className="bg-[#111827] border border-amber-500 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                  <h3 className="text-lg font-bold text-white">Student Registered Successfully!</h3>
                  <div className="bg-[#1f2937] border border-dashed border-amber-500/60 p-3 rounded-xl text-amber-400 font-mono text-lg font-bold select-all">
                    {successPopup}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(successPopup);
                      alert('Copied to clipboard!');
                      setSuccessPopup(null);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-lg text-sm"
                  >
                    Copy Code & Close
                  </button>
                </div>
              </div>
            )}

            {activePersonnelResult && (
              <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-emerald-400">Personnel Registered Successfully!</h3>
                <p className="text-xs text-gray-300">Generated ID: <strong className="text-amber-300 font-mono">{activePersonnelResult.id}</strong></p>
                <p className="text-xs text-gray-300">Share this dedicated signup and login link with <strong>{activePersonnelResult.fullName}</strong>:</p>
                <div className="bg-[#1f2937] p-3 rounded border border-emerald-500/40 text-amber-300 font-mono text-xs select-all">
                  {activePersonnelResult.signupLink}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(activePersonnelResult.signupLink);
                    alert('Signup link copied to clipboard!');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg"
                >
                  Copy Signup Link
                </button>
              </div>
            )}
          </div>
        )}

        {/* ALL STUDENT LIST TAB */}
        {activeTab === 'students' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>All Registered Students</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 font-mono">
                Total: {studentsList.length} (TE: {technicalStudentsCount} | General: {generalStudentsCount})
              </span>
            </h2>

            {studentsList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No students registered yet. Use the "Register New Member" tab to add students.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1f2937] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Photo</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Section / Class</th>
                      <th className="p-3">Gender / Age</th>
                      <th className="p-3">Guardian Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {studentsList.map((stu, i) => (
                      <tr key={i} className="hover:bg-gray-800/40">
                        <td className="p-3 font-mono text-amber-400 font-bold">{stu.id}</td>
                        <td className="p-3">
                          {stu.picture ? (
                            <img src={stu.picture} alt="" className="w-8 h-8 rounded-full object-cover border border-amber-500/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">N/A</div>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-white">{stu.fullName}</td>
                        <td className="p-3">
                          <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-700/40">
                            {stu.section}
                          </span>
                          <div className="text-gray-400 mt-0.5">{stu.classLevel}</div>
                        </td>
                        <td className="p-3"><span className="text-amber-300 font-medium">{stu.gender}</span>, {stu.age} yrs</td>
                        <td className="p-3">
                          <div className="font-semibold">{stu.guardianName}</div>
                          <div className="text-amber-300 font-mono">{stu.guardianPhone}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ASSIGN NEW TEACHER TAB (Updated: Dynamic classes per subject click, no period field) */}
        {activeTab === 'teachers' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Assign New Teacher & Configure Timetable</h2>
            
            <form onSubmit={handleTeacherAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Teacher Full Name</label>
                  <input 
                    type="text" 
                    value={teacherName} 
                    onChange={(e) => setTeacherName(e.target.value)} 
                    required 
                    placeholder="e.g. Mr. Ngwa"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Phone Number (Mandatory)</label>
                  <input 
                    type="text" 
                    value={teacherPhone} 
                    onChange={(e) => setTeacherPhone(e.target.value)} 
                    required 
                    placeholder="682491189"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Email Address (Mandatory)</label>
                  <input 
                    type="email" 
                    value={teacherEmail} 
                    onChange={(e) => setTeacherEmail(e.target.value)} 
                    required 
                    placeholder="teacher@wisdomcollege.cm"
                    className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Place of Residence</label>
                  <input 
                    type="text" 
                    value={teacherResidence} 
                    onChange={(e) => setTeacherResidence(e.target.value)} 
                    placeholder="Nkwen, Bamenda"
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Section</label>
                <select 
                  value={teacherSection} 
                  onChange={(e) => {
                    setTeacherSection(e.target.value);
                    setSelectedTeacherSubjects([]);
                    setSubjectSchedules({});
                  }}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                >
                  <option value="General">General Section</option>
                  <option value="Technical">Technical Section</option>
                  <option value="Both">Both Sections</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                  Select Subjects Taught (Click subjects to add forms and configure day, start time, and end time)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-[#1f2937]/50 p-3 rounded-lg border border-gray-700">
                  {SUBJECTS_CATALOG[teacherSection === 'Both' ? 'Technical' : teacherSection].map((sub, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={selectedTeacherSubjects.includes(sub)}
                        onChange={(e) => handleSubjectToggle(sub, e.target.checked)}
                        className="rounded border-gray-700 text-amber-600 focus:ring-0"
                      />
                      {sub}
                    </label>
                  ))}
                  {teacherSection === 'Both' && SUBJECTS_CATALOG.General.map((sub, idx) => (
                    !SUBJECTS_CATALOG.Technical.includes(sub) && (
                      <label key={`gen-${idx}`} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedTeacherSubjects.includes(sub)}
                          onChange={(e) => handleSubjectToggle(sub, e.target.checked)}
                          className="rounded border-gray-700 text-amber-600 focus:ring-0"
                        />
                        {sub}
                      </label>
                    )
                  ))}
                </div>
              </div>

              {selectedTeacherSubjects.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  <h3 className="text-sm font-bold text-amber-400">Configure Class Forms & Schedule (Day, Start Time, End Time) per Subject</h3>
                  {selectedTeacherSubjects.map((subject, subIdx) => {
                    const rows = subjectSchedules[subject] || [];
                    return (
                      <div key={subIdx} className="bg-[#1f2937]/40 border border-gray-700 p-4 rounded-xl space-y-3">
                        <div className="font-bold text-sm text-white flex items-center justify-between">
                          <span>📘 Subject: <span className="text-amber-400">{subject}</span></span>
                          <button 
                            type="button"
                            onClick={() => addClassRowToSubject(subject)}
                            className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs px-3 py-1 rounded"
                          >
                            + Add Another Form/Class
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {rows.map((row, rIdx) => (
                            <div key={rIdx} className="bg-[#111827] p-3 rounded-lg border border-gray-800 flex flex-col md:flex-row gap-3 items-center">
                              <div className="flex-1 w-full">
                                <label className="block text-[10px] uppercase text-gray-400 mb-1">Class / Form</label>
                                <select 
                                  value={row.className}
                                  onChange={(e) => handleScheduleRowChange(subject, rIdx, 'className', e.target.value)}
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-amber-300"
                                >
                                  {ALL_AVAILABLE_CLASSES.map((cls, cId) => (
                                    <option key={cId} value={cls}>{cls}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-full md:w-36">
                                <label className="block text-[10px] uppercase text-gray-400 mb-1">Day</label>
                                <select 
                                  value={row.day}
                                  onChange={(e) => handleScheduleRowChange(subject, rIdx, 'day', e.target.value)}
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-white"
                                >
                                  {DAYS_OF_WEEK.map((d, dId) => (
                                    <option key={dId} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-full md:w-28">
                                <label className="block text-[10px] uppercase text-gray-400 mb-1">Start Time</label>
                                <input 
                                  type="text" 
                                  value={row.startTime}
                                  onChange={(e) => handleScheduleRowChange(subject, rIdx, 'startTime', e.target.value)}
                                  placeholder="07:30 AM"
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-white"
                                />
                              </div>
                              <div className="w-full md:w-28">
                                <label className="block text-[10px] uppercase text-gray-400 mb-1">End Time</label>
                                <input 
                                  type="text" 
                                  value={row.endTime}
                                  onChange={(e) => handleScheduleRowChange(subject, rIdx, 'endTime', e.target.value)}
                                  placeholder="09:00 AM"
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-white"
                                />
                              </div>
                              {rows.length > 1 && (
                                <button 
                                  type="button"
                                  onClick={() => removeClassRowFromSubject(subject, rIdx)}
                                  className="text-red-400 hover:text-red-300 text-xs pt-4 md:pt-0"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg">
                Save Teacher Assignment, Verify Conflicts & Generate Timetable
              </button>
            </form>

            {activeTeacherResult && (
              <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-emerald-400">Teacher Assigned Successfully!</h3>
                <p className="text-xs text-gray-300">Generated Teacher ID: <strong className="text-amber-300 font-mono">{activeTeacherResult.id}</strong></p>
                <p className="text-xs text-gray-300">Share this dedicated signup and timetable portal link with <strong>{activeTeacherResult.name}</strong>:</p>
                <div className="bg-[#1f2937] p-3 rounded border border-emerald-500/40 text-amber-300 font-mono text-xs select-all">
                  {activeTeacherResult.signupLink}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALL TEACHER LIST TAB (Updated: Summary of names, subjects taught, and ID that can be clicked to copy) */}
        {activeTab === 'teacher-list' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>All Assigned Teachers Summary (Click ID to Copy)</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 font-mono">
                Total: {teachersList.length}
              </span>
            </h2>

            {teachersList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No teachers assigned yet. Use the "Assign New Teacher" tab to add faculty members.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachersList.map((teacher) => (
                  <div key={teacher.id} className="bg-[#1f2937]/50 border border-gray-800 p-5 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-white">{teacher.name}</h3>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(teacher.id);
                            alert(`Teacher ID ${teacher.id} copied to clipboard!`);
                          }}
                          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs px-2.5 py-1 rounded cursor-pointer transition-colors"
                          title="Click to copy Teacher ID"
                        >
                          🆔 {teacher.id} (Copy)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Phone: {teacher.phone} | Email: {teacher.email}</p>
                    </div>

                    <div className="border-t border-gray-800 pt-3">
                      <div className="text-xs font-semibold text-gray-300 mb-1.5 uppercase">Subjects Taught:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.subjects.map((sub, sIdx) => (
                          <span key={sIdx} className="bg-blue-900/30 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded text-[11px]">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OTHER SCHOOL PERSONNEL TAB */}
        {activeTab === 'personnel' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>Other School Personnel (Bursar, Supervisors, Discipline Masters, Principals)</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 font-mono">
                Total: {personnelList.length}
              </span>
            </h2>

            {personnelList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No school personnel added yet. Use the "Register New Member" tab to add personnel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">Title Position</th>
                      <th className="p-3 border border-gray-700">Name</th>
                      <th className="p-3 border border-gray-700">Unique ID (Click to Copy)</th>
                      <th className="p-3 border border-gray-700">Contact / Email</th>
                      <th className="p-3 border border-gray-700 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {personnelList.map((person) => (
                      <tr key={person.id} className="hover:bg-gray-800/40">
                        <td className="p-3 border border-gray-700 font-bold text-amber-300 uppercase">{person.title}</td>
                        <td className="p-3 border border-gray-700 font-semibold text-white">{person.fullName}</td>
                        <td className="p-3 border border-gray-700 font-mono">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(person.id);
                              alert(`Personnel ID ${person.id} copied to clipboard!`);
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded font-bold"
                            title="Click to copy ID"
                          >
                            {person.id} 📋
                          </button>
                        </td>
                        <td className="p-3 border border-gray-700">
                          <div>{person.phone}</div>
                          <div className="text-gray-400 text-[11px]">{person.email}</div>
                        </td>
                        <td className="p-3 border border-gray-700 text-center">
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${person.fullName}?`)) {
                                setPersonnelList(personnelList.filter(p => p.id !== person.id));
                              }
                            }}
                            className="bg-red-900/40 hover:bg-red-900/70 border border-red-700/50 text-red-300 px-3 py-1 rounded font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SCHOOL DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-2xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">School Parameters & Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Official Name</label>
                <input 
                  type="text" 
                  value="Wisdom College" 
                  disabled 
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Administrator Contact Line</label>
                <input 
                  type="text" 
                  value={schoolContact} 
                  onChange={(e) => setSchoolContact(e.target.value)} 
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Academic Year</label>
                <input 
                  type="text" 
                  value="2026-2027" 
                  disabled 
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Location</label>
                <input 
                  type="text" 
                  value="Mankon, Bamenda, Northwest Region, Cameroon" 
                  disabled 
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                />
              </div>

              <button 
                onClick={() => alert('School parameters updated successfully!')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
        App conceived by Norbert Che Nsuh - {schoolContact}
      </footer>
    </div>
  );
}