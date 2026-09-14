'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Building2, Search, Bell, MessageSquare, User, 
  Users, GraduationCap, Calendar, AlertCircle, 
  Clock, TrendingUp, BookOpen, FileText, 
  ShieldCheck, Activity, Send, Download, Eye, Award, Filter,
  Tv, Radio, ExternalLink, PlayCircle, RefreshCw, Volume2, Sparkles, Globe
} from 'lucide-react';
import {
  GENERAL_CLASSES_CATALOG,
  GENERAL_LOWER_CLASSES,
  TECHNICAL_COMMERCIAL_CATALOG,
  TECHNICAL_INDUSTRIAL_CATALOG,
  GENERAL_SERIES_CATALOG,
  COMMERCIAL_TRADE_SERIES,
  INDUSTRIAL_TRADE_SERIES,
  ALL_AVAILABLE_CLASSES,
  DAYS_OF_WEEK,
  getAcademicYear,
  ALL_SUBJECTS_LIST
} from '../admin-dashboard/page';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PrincipalDashboard() {
  const [currentDateTime, setCurrentDateTime] = useState('');
  
  // Principal Profile & School Context
  const [principalName, setPrincipalName] = useState('Principal');
  const [schoolData, setSchoolData] = useState({
    school_id: null,
    name: 'NsuhRecords Secondary School',
    logoUrl: '',
    motto: 'Knowledge, Discipline & Excellence',
    academicYear: '2026-2027',
    totalStudents: 0,
    technicalStudents: 0,
    generalStudents: 0,
    totalStaff: 0,
    attendanceRate: 98,
    outstandingFees: 0,
  });
// Cascading Section, Class, and Trade Context States
  const [section, setSection] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [masterClass, setMasterClass] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  // Dynamic TV Channels & Live Stream Data
  const [selectedChannel, setSelectedChannel] = useState('minsec'); // 'minsec' | 'pedagogy' | 'global'
  const [activeVideoUrl, setActiveVideoUrl] = useState('https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=0&mute=1'); // Default educational live stream
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Rotating Live News Feed Data
  const liveNewsFeed = [
    {
      id: 1,
      channel: 'minsec',
      badge: 'MINSEC Official',
      title: '2026/2027 Resumption: Directives on School Fee Regulations & Digital Registrations',
      source: 'MINESEC Cameroon',
      link: 'https://www.minesec.gov.cm',
      time: 'Live Update'
    },
    {
      id: 2,
      channel: 'minsec',
      badge: 'Pedagogy Broadcast',
      title: 'Secondary Education Distance Learning Platform: Updated Syllabi & Online Modules',
      source: 'MINSEC Distance Learning',
      link: 'https://www.minesec.gov.cm',
      time: '10 mins ago'
    },
    {
      id: 3,
      channel: 'pedagogy',
      badge: 'Principal Leadership',
      title: 'Effective School Administration & Digital Governance Strategies for Secondary Schools',
      source: 'African Educational Leadership Network',
      link: 'https://unesco.org',
      time: 'Just Now'
    },
    {
      id: 4,
      channel: 'global',
      badge: 'Global Pedagogy',
      title: 'UNESCO World Education Report: AI & Modern Classroom Technologies in Africa',
      source: 'UNESCO Education',
      link: 'https://en.unesco.org',
      time: 'Live Stream'
    }
  ];

  // Television Channels Playlist
  const tvChannels = {
    minsec: {
      name: 'MINSEC & National Education TV',
      videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=0',
      description: 'Official announcements, Ministerial circulars, national pedagogy guidelines.'
    },
    pedagogy: {
      name: 'Pedagogy & Principal Masterclass TV',
      videoUrl: 'https://www.youtube.com/embed/3JZ_D3ELwOQ?autoplay=0',
      description: 'Educational leadership workshops, teacher training modules, administrative strategies.'
    },
    global: {
      name: 'Global Educational Broadcasting',
      videoUrl: 'https://www.youtube.com/embed/2g811KoJBUo?autoplay=0',
      description: 'International educational news, STEM innovations, and global school governance.'
    }
  };

  // Performance Data
  const [sectionFilter, setSectionFilter] = useState('General Education');
  const [topSubjectPerformers, setTopSubjectPerformers] = useState([]);

  // Report Card Management
  const [selectedClass, setSelectedClass] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [searchError, setSearchError] = useState('');
  const reportCardRef = useRef(null);

  // Broadcast & Recommendations
  const [announcementTarget, setAnnouncementTarget] = useState('teachers');
  const [announcementText, setAnnouncementText] = useState('');
  const [supervisorRecommendation, setSupervisorRecommendation] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Live Clock
    const updateClock = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('en-US', { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    // Dynamic Live TV News Ticker Rotation (Changes every 6 seconds)
    const newsRotator = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % liveNewsFeed.length);
    }, 6000);

    fetchInitialData();

    return () => {
      clearInterval(timer);
      clearInterval(newsRotator);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setPrincipalName(profile.full_name || 'Principal');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleChannelSwitch = (channelKey) => {
    setSelectedChannel(channelKey);
    setActiveVideoUrl(tvChannels[channelKey].videoUrl);
  };

  const handleSearchStudent = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchedStudent(null);
    setStudentMarks([]);

    if (!studentIdInput.trim()) {
      setSearchError('Please enter a valid Student ID.');
      return;
    }

    try {
      let query = supabase.from('students').select('*').eq('unique_id', studentIdInput.trim().toUpperCase());
      if (selectedClass) query = query.eq('class', selectedClass);

      const { data: student, error } = await query.maybeSingle();

      if (error || !student) {
        setSearchError('No student record found matching the criteria.');
        return;
      }

      setSearchedStudent(student);

      const { data: marks } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', student.id);

      setStudentMarks(marks || []);
    } catch (err) {
      setSearchError('Failed to fetch student record.');
    }
  };

  const handleDownloadPDF = async () => {
    if (typeof window === 'undefined') return;
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const element = reportCardRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${searchedStudent?.full_name || 'Student'}_ReportCard.pdf`);
  };

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

  const currentBroadcast = liveNewsFeed[currentNewsIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left: School Name & Session */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold text-lg shadow-inner overflow-hidden border border-slate-200">
              {schoolData.logoUrl ? (
                <img src={schoolData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                schoolData.name.charAt(0)
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

          {/* Center: Reserved Space for School Logo & Motto */}
          <div className="hidden md:flex flex-col items-center justify-center text-center px-4 border-x border-slate-100 max-w-xs">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              {schoolData.name}
            </div>
            <p className="text-[11px] italic text-slate-500 mt-0.5 font-serif">
              "{schoolData.motto}"
            </p>
          </div>

          {/* Right: Welcome User */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                <User size={18} />
              </div>
              <span className="text-sm font-semibold text-slate-800 hidden sm:inline">
                Welcome, {principalName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Dynamic Welcome Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black">Welcome, Principal {principalName}</h2>
            <p className="text-xs text-blue-200 mt-1">
              Academic Session: <span className="font-bold text-white">{schoolData.academicYear}</span>
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
            <ShieldCheck size={18} /> {successMsg}
          </div>
        )}

        {/* 1. Executive Metrics */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Students</span>
                <Users size={18} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.totalStudents}</div>
              <div className="text-xs text-slate-500 mt-1">Live Enrolled Count</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Staff</span>
                <GraduationCap size={18} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.totalStaff}</div>
              <div className="text-xs text-slate-500 mt-1">Teachers & Administrative</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase">Attendance Rate</span>
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.attendanceRate}%</div>
              <div className="text-xs text-emerald-600 mt-1">Synced with Supervisor</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase">Outstanding Fees</span>
                <span className="text-xs font-bold text-amber-600">FCFA</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{schoolData.outstandingFees} FCFA</div>
              <div className="text-xs text-slate-500 mt-1">Synced from Bursar</div>
            </div>
          </div>
        </section>

        {/* 2. DYNAMIC LIVE TELEVISION & BROADCAST TERMINAL */}
        <section className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          
          {/* TV Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
              </span>
              <div>
                <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2 text-slate-100">
                  <Tv size={18} className="text-rose-500" /> MINSEC & Pedagogic Educational TV
                </h3>
                <p className="text-[11px] text-slate-400">Live streams, leadership insights & continuous MINSEC news updates</p>
              </div>
            </div>

            {/* TV Channel Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => handleChannelSwitch('minsec')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedChannel === 'minsec' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Radio size={14} /> CH 1: MINSEC Official
              </button>
              <button
                onClick={() => handleChannelSwitch('pedagogy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedChannel === 'pedagogy' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} /> CH 2: Pedagogy & Leadership
              </button>
              <button
                onClick={() => handleChannelSwitch('global')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedChannel === 'global' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Globe size={14} /> CH 3: Global Edu News
              </button>
            </div>
          </div>

          {/* Main TV Screen & Side Broadcast Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Embedded Live Video Player Screen */}
            <div className="lg:col-span-2 space-y-2">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                <iframe 
                  src={activeVideoUrl}
                  title={tvChannels[selectedChannel].name}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-200">{tvChannels[selectedChannel].name}</span>
                <span className="italic text-[11px]">{tvChannels[selectedChannel].description}</span>
              </div>
            </div>

            {/* Rotating Live News Stream Sidebar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                    <RefreshCw size={12} className="animate-spin text-rose-500" /> Auto-Updating News Flash
                  </span>
                  <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-semibold">
                    {currentBroadcast.badge}
                  </span>
                </div>

                {/* Animated Display Card */}
                <div className="space-y-3 transition-all duration-500">
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {currentBroadcast.title}
                  </h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><span className="text-slate-500">Source:</span> <span className="text-slate-200 font-medium">{currentBroadcast.source}</span></p>
                    <p><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-semibold">{currentBroadcast.time}</span></p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <a 
                  href={currentBroadcast.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  Visit Official Source Webpage <ExternalLink size={14} />
                </a>
                <p className="text-[10px] text-center text-slate-500">
                  News ticker updates live every 6 seconds automatically.
                </p>
              </div>

            </div>

          </div>

          {/* Running Ticker Footer */}
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-3 overflow-hidden text-xs">
            <span className="bg-rose-600 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">
              MINSEC TICKER
            </span>
            <div className="truncate text-slate-300 font-medium">
              ★ MINSEC: Secondary School Official Calendar 2026/2027 Active ★ Pedagogic Seminars ongoing for Teachers ★ Smart Board & Digital Curriculum Rollout nationwide.
            </div>
          </div>

        </section>

        {/* 3. Student Report Cards Section */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Student Report Card Portal
            </h3>
            <span className="text-xs text-slate-500">View and PDF Download Portal</span>
          </div>

          {/* CASCADING CLASS & TRADE FILTER CONTEXT */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select Class & Trade Context
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 1. SECTION SELECT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section <span className="text-rose-500">*</span>
              </label>
              <select
                value={typeof section !== 'undefined' ? section : ''}
                onChange={(e) => {
                  const newSec = e.target.value;
                  if (typeof setSection === 'function') setSection(newSec);
                  if (typeof setClassLevel === 'function') setClassLevel('');
                  
                  if (newSec === 'Technical Commercial (STT)' && typeof COMMERCIAL_TRADE_SERIES !== 'undefined' && COMMERCIAL_TRADE_SERIES.length > 0) {
                    if (typeof setMasterClass === 'function') setMasterClass(COMMERCIAL_TRADE_SERIES[0]);
                  } else if (newSec === 'Technical Industrial (IND)' && typeof INDUSTRIAL_TRADE_SERIES !== 'undefined' && INDUSTRIAL_TRADE_SERIES.length > 0) {
                    if (typeof setMasterClass === 'function') setMasterClass(INDUSTRIAL_TRADE_SERIES[0]);
                  } else {
                    if (typeof setMasterClass === 'function') setMasterClass('');
                  }
                }}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Section --</option>
                <option value="General Education">General Education</option>
                <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
              </select>
            </div>

            {/* 2. CLASS LEVEL SELECT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={typeof classLevel !== 'undefined' ? classLevel : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (typeof setClassLevel === 'function') setClassLevel(val);
                  if (section === 'General Education') {
                    const isLower = typeof GENERAL_LOWER_CLASSES !== 'undefined' && Array.isArray(GENERAL_LOWER_CLASSES) && GENERAL_LOWER_CLASSES.includes(val);
                    if (isLower) {
                      if (typeof setMasterClass === 'function') setMasterClass('N/A');
                    } else {
                      if (typeof setMasterClass === 'function') setMasterClass('');
                    }
                  }
                }}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={!section}
              >
                <option value="">-- Select Class Level --</option>
                
                {section === 'General Education' && typeof GENERAL_CLASSES_CATALOG !== 'undefined' && Array.isArray(GENERAL_CLASSES_CATALOG) && GENERAL_CLASSES_CATALOG.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}

                {section === 'Technical Commercial (STT)' && typeof TECHNICAL_COMMERCIAL_CATALOG !== 'undefined' && Array.isArray(TECHNICAL_COMMERCIAL_CATALOG) && TECHNICAL_COMMERCIAL_CATALOG.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}

                {section === 'Technical Industrial (IND)' && typeof TECHNICAL_INDUSTRIAL_CATALOG !== 'undefined' && Array.isArray(TECHNICAL_INDUSTRIAL_CATALOG) && TECHNICAL_INDUSTRIAL_CATALOG.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* 3. DYNAMIC TRADE / SERIES DROPDOWN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade / Series
              </label>

              {section === 'General Education' && typeof classLevel !== 'undefined' && classLevel && (classLevel.includes('Sixth') || classLevel.startsWith('L6') || classLevel.startsWith('U6')) ? (
                <select
                  value={typeof masterClass !== 'undefined' ? masterClass : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (typeof setMasterClass === 'function') setMasterClass(val);
                    if (typeof setSelectedSeries === 'function') setSelectedSeries(val);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Series --</option>
                  {((classLevel.includes('Arts') || classLevel.includes('L6A') || classLevel.includes('U6A'))
                    ? GENERAL_SERIES_CATALOG?.ARTS
                    : GENERAL_SERIES_CATALOG?.SCIENCE
                  )?.map((seriesCode) => (
                    <option key={seriesCode} value={seriesCode}>
                      Series {seriesCode}
                    </option>
                  ))}
                </select>
              ) : section === 'General Education' ? (
                <input
                  type="text"
                  disabled
                  value="N/A"
                  className="w-full bg-slate-100 border border-slate-300 text-slate-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                />
              ) : section === 'Technical Commercial (STT)' ? (
                <select
                  value={typeof masterClass !== 'undefined' && masterClass ? masterClass : (COMMERCIAL_TRADE_SERIES?.[0] || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (typeof setMasterClass === 'function') setMasterClass(val);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {typeof COMMERCIAL_TRADE_SERIES !== 'undefined' && Array.isArray(COMMERCIAL_TRADE_SERIES) && COMMERCIAL_TRADE_SERIES.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              ) : section === 'Technical Industrial (IND)' ? (
                <select
                  value={typeof masterClass !== 'undefined' && masterClass ? masterClass : (INDUSTRIAL_TRADE_SERIES?.[0] || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (typeof setMasterClass === 'function') setMasterClass(val);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {typeof INDUSTRIAL_TRADE_SERIES !== 'undefined' && Array.isArray(INDUSTRIAL_TRADE_SERIES) && INDUSTRIAL_TRADE_SERIES.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              ) : (
                <input
  type="text"
  disabled
  value=""
  placeholder="Select a section first"
  className="w-full bg-slate-100 border border-slate-300 text-slate-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
/>
              )}
            </div>

          </div>
        </div>

        {/* INDIVIDUAL STUDENT SEARCH & ACTIONS */}
        <form onSubmit={handleSearchStudent} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student Unique ID *</label>
            <input
              type="text"
              placeholder="e.g., STU-1029"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full p-2.5 bg-blue-900 text-white font-semibold text-xs rounded-lg hover:bg-blue-800 flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Search size={16} /> Locate Report Card
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof handleDownloadBulkPDF === 'function') handleDownloadBulkPDF();
              }}
              className="w-full p-2.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Download size={16} /> Bulk Report Cards
            </button>
          </div>
        </form>

          {searchError && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
              {searchError}
            </p>
          )}

          {/* Printable Report Card Preview */}
          {searchedStudent && (
            <div className="mt-6 space-y-4">
              <div className="flex justify-end">
                <button 
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 flex items-center gap-2"
                >
                  <Download size={14} /> Download Report Card PDF
                </button>
              </div>

              <div ref={reportCardRef} className="p-8 bg-white border border-slate-300 rounded-lg space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase text-slate-900">{schoolData.name}</h2>
                    <p className="text-xs text-slate-500">Official Student Performance Terminal Report</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-900">Academic Year: {schoolData.academicYear}</p>
                    <p className="text-xs text-slate-500">ID: {searchedStudent.unique_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p><span className="font-bold">Student Name:</span> {searchedStudent.full_name}</p>
                  <p><span className="font-bold">Class:</span> {searchedStudent.class || 'N/A'}</p>
                  <p><span className="font-bold">Section:</span> {searchedStudent.section || 'General'}</p>
                  <p><span className="font-bold">Gender:</span> {searchedStudent.gender || 'N/A'}</p>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3">Mark (/20)</th>
                      <th className="py-2 px-3">Coef</th>
                      <th className="py-2 px-3">Total</th>
                      <th className="py-2 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {studentMarks.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-slate-400 italic">No evaluated marks recorded for this student yet.</td>
                      </tr>
                    ) : (
                      studentMarks.map((m, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium">{m.subject}</td>
                          <td className="py-2 px-3 font-bold text-blue-900">{m.mark}</td>
                          <td className="py-2 px-3">{m.coef || 1}</td>
                          <td className="py-2 px-3 font-bold">{(m.mark * (m.coef || 1)).toFixed(1)}</td>
                          <td className="py-2 px-3">{m.mark >= 10 ? 'Passed' : 'Failed'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 4. Performance Analytics Categorization */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award size={18} className="text-indigo-600" /> Academic Section Performance
            </h3>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {['General Education', 'Technical Commercial', 'Technical Industrial'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSectionFilter(sec)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    sectionFilter === sec ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Top Performer</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Highest Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topSubjectPerformers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                      No academic results compiled for {sectionFilter} yet.
                    </td>
                  </tr>
                ) : (
                  topSubjectPerformers.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{item.subject}</td>
                      <td className="py-3 px-3 text-slate-700">{item.studentName}</td>
                      <td className="py-3 px-3 text-slate-500">{item.class}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">{item.mark}/20</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Communication & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send size={18} className="text-blue-600" /> Broadcast Announcements
            </h3>
            <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
              <div className="flex gap-4 items-center">
                <label className="text-xs font-semibold text-slate-700">Target Audience:</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" name="target" value="teachers" 
                      checked={announcementTarget === 'teachers'} 
                      onChange={(e) => setAnnouncementTarget(e.target.value)} 
                    /> Teachers
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" name="target" value="students" 
                      checked={announcementTarget === 'students'} 
                      onChange={(e) => setAnnouncementTarget(e.target.value)} 
                    /> Students
                  </label>
                </div>
              </div>
              <textarea 
                rows="3"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder={`Type announcement message to broadcast to all ${announcementTarget}...`}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
              ></textarea>
              <button 
                type="submit"
                className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 flex items-center gap-2"
              >
                <Send size={14} /> Post Announcement
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" /> Administrative Recommendations
            </h3>
            <form onSubmit={handleSendRecommendation} className="space-y-3">
              <textarea 
                rows="3"
                value={supervisorRecommendation}
                onChange={(e) => setSupervisorRecommendation(e.target.value)}
                placeholder="Submit administrative policy feedback directly to the Supervisor portal..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600"
              ></textarea>
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-900 text-white text-xs font-semibold rounded-lg hover:bg-indigo-800 flex items-center gap-2"
              >
                <ShieldCheck size={14} /> Submit to Supervisor
              </button>
            </form>
          </div>
        </div>

      </main>

      <footer className="text-center py-6 text-slate-400 text-xs border-t border-slate-200 mt-12">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>
    </div>
  );
}