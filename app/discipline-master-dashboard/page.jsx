'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, Search, Wifi, WifiOff, 
  BookOpen, Factory, Briefcase, LogOut, RefreshCw, Radio, UserCheck, Phone, Mail, Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

import GeneralAttendance from './components/GeneralAttendance';
import CommercialAttendance from './components/CommercialAttendance';
import IndustrialAttendance from './components/IndustrialAttendance';
import IncidentRegistry from './components/IncidentRegistry';
import GlobalStudentSearch from './components/GlobalStudentSearch';

// 7+ Varied Natural Sentence Generators for Absences & Lateness
const ABSENCE_SENTENCES = [
  (name, subject, classLvl, date) => `${name} absented from ${subject} (${classLvl}) class on ${date}.`,
  (name, subject, classLvl, date) => `${name} was not in ${subject} (${classLvl}) class today.`,
  (name, subject, classLvl, date) => `${name} did not participate in the ${subject} (${classLvl}) lesson on ${date}.`,
  (name, subject, classLvl, date) => `${name} missed the ${subject} period for ${classLvl} on ${date}.`,
  (name, subject, classLvl, date) => `${name} failed to attend ${subject} (${classLvl}) class on ${date}.`,
  (name, subject, classLvl, date) => `${name} was marked absent during ${subject} (${classLvl}) on ${date}.`,
  (name, subject, classLvl, date) => `${name} skipped the ${subject} session for ${classLvl} on ${date}.`
];

const LATE_SENTENCES = [
  (name, subject, classLvl, date) => `${name} came late to ${subject} (${classLvl}) class on ${date}.`,
  (name, subject, classLvl, date) => `${name} arrived past time for ${subject} (${classLvl}) on ${date}.`,
  (name, subject, classLvl, date) => `${name} was tardy for the ${subject} period in ${classLvl} on ${date}.`,
  (name, subject, classLvl, date) => `${name} entered ${subject} (${classLvl}) class after roll call on ${date}.`,
  (name, subject, classLvl, date) => `${name} reported late to ${subject} (${classLvl}) session on ${date}.`,
  (name, subject, classLvl, date) => `${name} was delayed entering ${subject} (${classLvl}) class on ${date}.`,
  (name, subject, classLvl, date) => `${name} joined ${subject} (${classLvl}) class late on ${date}.`
];

export default function DisciplineMasterDashboard() {
  const [activeTab, setActiveTab] = useState('general');
  const [assignedSchool, setAssignedSchool] = useState('Developper Test Institute');
  const [activeSchoolId, setActiveSchoolId] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // DM Profile State
  const [dmProfile, setDmProfile] = useState({
    full_name: 'Discipline Master',
    email: 'Loading...',
    phone: 'Loading...',
    unique_id: 'Loading...',
    photo_url: ''
  });

  const [misconductRecords, setMisconductRecords] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [cumulativeStats, setCumulativeStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Bulletproof Multi-Tier School ID Resolution
  const resolveActiveSchoolId = async () => {
    let resolvedId = 
      localStorage.getItem('active_school_id') || 
      localStorage.getItem('activeSchoolId') || 
      localStorage.getItem('current_school_id');

    if (!resolvedId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: personnel } = await supabase
            .from('school_personnel')
            .select('school_id, full_name, name, email, phone, phone_number, unique_id, photo_url')
            .eq('unique_id', session.user.id)
            .maybeSingle();

          if (personnel?.school_id) {
            resolvedId = personnel.school_id;
            setDmProfile({
              full_name: personnel.full_name || personnel.name || 'Discipline Master',
              email: personnel.email || session.user.email || 'N/A',
              phone: personnel.phone || personnel.phone_number || 'N/A',
              unique_id: personnel.unique_id || 'DM-OFFICER',
              photo_url: personnel.photo_url || ''
            });
          }
        }
      } catch (e) {
        console.warn('Auth session check notice:', e);
      }
    }

    // Absolute Production Fallback
    if (!resolvedId) {
      resolvedId = '15052cc7-bc44-45e1-9acc-bc445e19acc4';
    }

    localStorage.setItem('active_school_id', resolvedId);
    setActiveSchoolId(resolvedId);
    return resolvedId;
  };

  // Fetch DM Profile Details
  const loadDmProfile = async (schoolId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let query = supabase.from('school_personnel').select('*').eq('school_id', schoolId);

      if (session?.user?.id) {
        query = query.eq('unique_id', session.user.id);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (data && !error) {
        setDmProfile({
          full_name: data.full_name || data.name || 'Discipline Master',
          email: data.email || 'dm@school.cm',
          phone: data.phone || data.phone_number || '+237 600000000',
          unique_id: data.unique_id || 'DM-OFFICER',
          photo_url: data.photo_url || ''
        });
      }
    } catch (err) {
      console.warn('DM Profile Load Notice:', err);
    }
  };

  // Fetch Attendance Records (Filtering Strictly for Misconducts)
  const fetchMisconductStream = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const schoolId = await resolveActiveSchoolId();
      await loadDmProfile(schoolId);

      // Query attendance strictly for Absent or Late records
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', schoolId)
        .in('status', ['Absent', 'Late'])
        .order('created_at', { ascending: false });

      if (attError) {
        setErrorMsg(attError.message);
        return;
      }

      if (attData && attData.length > 0) {
        setMisconductRecords(attData);

        // Compute cumulative stats per student
        const stats = {};
        attData.forEach(row => {
          const sid = row.student_id || row.unique_code;
          if (!stats[sid]) stats[sid] = { abs: 0, late: 0 };
          if (row.status === 'Absent') stats[sid].abs += 1;
          if (row.status === 'Late') stats[sid].late += 1;
        });
        setCumulativeStats(stats);

        // Fetch student names by unique_code or id
        const uniqueCodes = [...new Set(attData.map(a => a.unique_code))].filter(Boolean);
        const studentIds = [...new Set(attData.map(a => a.student_id))].filter(Boolean);

        const nameMap = {};

        if (uniqueCodes.length > 0) {
          const { data: stByCode } = await supabase
            .from('students')
            .select('unique_code, full_name, name, fullName')
            .in('unique_code', uniqueCodes);

          if (stByCode) {
            stByCode.forEach(s => {
              nameMap[s.unique_code] = s.full_name || s.fullName || s.name;
            });
          }
        }

        if (studentIds.length > 0) {
          const { data: stById } = await supabase
            .from('students')
            .select('id, full_name, name, fullName')
            .in('id', studentIds);

          if (stById) {
            stById.forEach(s => {
              nameMap[s.id] = s.full_name || s.fullName || s.name;
            });
          }
        }

        setStudentMap(nameMap);
      } else {
        setMisconductRecords([]);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const storedSchoolName = localStorage.getItem('active_school_name') || 'Developper Test Institute';
    setAssignedSchool(storedSchoolName);

    fetchMisconductStream();
  }, []);

  // Sentence Selector with Persistent Habit Warning
  const renderVariedSentence = (item, index) => {
    const name = studentMap[item.unique_code] || studentMap[item.student_id] || item.unique_code || 'Student';
    const subject = item.subject_name || 'Class';
    const classLvl = item.classLevel || 'Form';
    const date = item.attendance_date || 'today';

    const key = item.student_id || item.unique_code;
    const stats = cumulativeStats[key] || { abs: 0, late: 0 };

    // Persistent Absence Pattern Check
    if (item.status === 'Absent' && stats.abs >= 3) {
      return `${name} is never present for ${subject} (${classLvl}) class. (${stats.abs} repeated absences recorded)`;
    }

    if (item.status === 'Absent') {
      const sentenceFn = ABSENCE_SENTENCES[index % ABSENCE_SENTENCES.length];
      return sentenceFn(name, subject, classLvl, date);
    } else {
      const sentenceFn = LATE_SENTENCES[index % LATE_SENTENCES.length];
      return sentenceFn(name, subject, classLvl, date);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-16">
      
      {/* Header */}
      <header className="bg-[#1E3A1E] text-white shadow-lg sticky top-0 z-40 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#1E3A1E] flex items-center font-black text-lg justify-center shadow-md">
              DM
            </div>
            <div>
              <h1 className="text-base font-black uppercase text-amber-100">{assignedSchool}</h1>
              <p className="text-[11px] text-emerald-300">Discipline Command Console • AY 2026/2027</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsSearchOpen(true)} className="bg-emerald-800 text-amber-100 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Search size={13} /> Global Search
            </button>
            <Link href="/" className="bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
              <LogOut size={13} /> Exit
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">

        {/* 👤 DISCIPLINE MASTER PROFILE WELCOME CARD */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1E3A1E] text-amber-100 border-2 border-emerald-700 flex items-center justify-center text-2xl font-black overflow-hidden shadow-md">
              {dmProfile.photo_url ? (
                <img src={dmProfile.photo_url} alt="DM Photo" className="w-full h-full object-cover" />
              ) : (
                <Shield size={30} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Welcome, {dmProfile.full_name}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  Active Officer
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Discipline & Attendance Command Office</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 font-mono">
                <span className="flex items-center gap-1"><Mail size={12} className="text-emerald-700" /> {dmProfile.email}</span>
                <span className="flex items-center gap-1"><Phone size={12} className="text-emerald-700" /> {dmProfile.phone}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">ID: {dmProfile.unique_id}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3">
            <UserCheck size={20} className="text-emerald-700" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Duty Status</span>
              <span className="text-xs font-black text-slate-800">Live Surveillance Active</span>
            </div>
          </div>
        </section>

        {/* 📺 MISCONDUCTS LIVE BROADCAST FEED */}
        <section className="bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <h2 className="text-xs font-black tracking-widest text-slate-200 uppercase">
                Absence & Lateness Misconduct Feed <span className="text-slate-500 font-mono text-[10px]">(public.attendance)</span>
              </h2>
            </div>

            <button onClick={fetchMisconductStream} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border border-slate-700">
              <RefreshCw size={12} className={loading ? 'animate-spin text-amber-400' : ''} /> Refresh Stream
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950 border-b border-rose-800 text-rose-300 text-xs font-mono">
              ⚠️ Database Error: {errorMsg}
            </div>
          )}

          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs flex justify-center items-center gap-2">
                <RefreshCw size={15} className="animate-spin text-emerald-400" />
                <span>Reading misconduct records from Supabase...</span>
              </div>
            ) : misconductRecords.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs italic">
                No absence or lateness records found.
              </div>
            ) : (
              misconductRecords.map((item, idx) => {
                const key = item.student_id || item.unique_code;
                const stats = cumulativeStats[key] || { abs: 0, late: 0 };

                return (
                  <div key={item.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg text-amber-300 mt-0.5">
                        <Radio size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100 leading-snug">
                          {renderVariedSentence(item, idx)}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                          Code: {item.unique_code || 'N/A'} • Time: {item.time_recorded || '12:00 PM'} ({item.day_of_week || 'Today'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                        item.status === 'Absent' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {item.status}
                      </span>

                      <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Cumulative Record</span>
                        <span className="text-xs font-black text-rose-300 font-mono">
                          {stats.abs} Absences • {stats.late} Lates
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Gate Roll Call Modules */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Gate Roll Call Modules</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('general')} className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'general' ? 'bg-[#1E3A1E] text-amber-100' : 'text-slate-600 bg-slate-100'}`}>
              <BookOpen size={14} className="inline mr-1.5" /> General Education
            </button>
            <button onClick={() => setActiveTab('commercial')} className={`px-3.5 py-2 rounded-lg text-xs font-bold ${activeTab === 'commercial' ? 'bg-[#1E3A1E] text-amber-100' : 'text-slate-600 bg-slate-100'}`}>
              <Briefcase size={14} className="inline mr-1.5" /> Commercial (STT)
            </button>
            <button onClick={() => setActiveTab('industrial')} className={`px-3.5 py-2 rounded-lg text-xs font-bold ${activeTab === 'industrial' ? 'bg-[#1E3A1E] text-amber-100' : 'text-slate-600 bg-slate-100'}`}>
              <Factory size={14} className="inline mr-1.5" /> Industrial (IND)
            </button>
            <button onClick={() => setActiveTab('incidents')} className={`px-3.5 py-2 rounded-lg text-xs font-bold ${activeTab === 'incidents' ? 'bg-rose-700 text-white' : 'text-slate-600 bg-slate-100'}`}>
              <ShieldAlert size={14} className="inline mr-1.5" /> Misconduct Registry
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'general' && <GeneralAttendance schoolId={activeSchoolId} dmName={dmProfile.full_name} />}
          {activeTab === 'commercial' && <CommercialAttendance schoolId={activeSchoolId} dmName={dmProfile.full_name} />}
          {activeTab === 'industrial' && <IndustrialAttendance schoolId={activeSchoolId} dmName={dmProfile.full_name} />}
          {activeTab === 'incidents' && <IncidentRegistry schoolId={activeSchoolId} dmName={dmProfile.full_name} />}
        </div>

      </main>

      {isSearchOpen && <GlobalStudentSearch schoolId={activeSchoolId} onClose={() => setIsSearchOpen(false)} />}

    </div>
  );
}