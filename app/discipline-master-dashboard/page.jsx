'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  UserCheck, ShieldAlert, Search, Bell, Wifi, WifiOff, 
  BookOpen, Factory, Briefcase, Camera, LogOut, CheckCircle2 
} from 'lucide-react';
import { db as supabase } from '../../lib/db';

// Import Modular Components
import GeneralAttendance from './components/GeneralAttendance';
import CommercialAttendance from './components/CommercialAttendance';
import IndustrialAttendance from './components/IndustrialAttendance';
import SubjectTruancyFeed from './components/SubjectTruancyFeed';
import IncidentRegistry from './components/IncidentRegistry';
import GlobalStudentSearch from './components/GlobalStudentSearch';

export default function DisciplineMasterDashboard() {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'commercial', 'industrial', 'truancy', 'incidents'
  const [assignedSchool, setAssignedSchool] = useState('');
  const [activeSchoolId, setActiveSchoolId] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Discipline Master Personnel Details
  const [dmProfile, setDmProfile] = useState({
    name: 'Loading Staff...',
    uniqueId: 'DT-PENDING',
    profilePic: '',
    phone: ''
  });

  // Global Student Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Real-time Notification Banner State
  const [toastNotification, setToastNotification] = useState(null);

  // 1. Synthesized Audio Alert Engine (Web Audio API - 100% Offline & Reliable)
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 Note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 Note

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio feedback context prevented by browser autoplay policy:', e);
    }
  };

  // 2. Initial Setup, Personnel Hydration & Network Listeners
  useEffect(() => {
    // Track online/offline status
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); flushOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retrieve Active School Session
    const storedSchoolName = localStorage.getItem('active_school_name') || 'Developper Test Institute';
    const storedSchoolId = localStorage.getItem('active_school_id') || '';
    setAssignedSchool(storedSchoolName);
    setActiveSchoolId(storedSchoolId);

    if (storedSchoolId) {
      hydrateDisciplineMaster(storedSchoolId);
      setupRealtimeAttendanceListener(storedSchoolId);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Hydrate Discipline Master Personnel Data
  const hydrateDisciplineMaster = async (schoolId) => {
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('school_personnel')
          .select('full_name, unique_id, profile_pic_url, phone_number')
          .eq('school_id', schoolId)
          .or('role.ilike.%discipline%,unique_id.ilike.DT-%')
          .maybeSingle();

        if (data) {
          const profile = {
            name: data.full_name || 'Assigned Discipline Master',
            uniqueId: data.unique_id || 'DT-OFFICIAL',
            profilePic: data.profile_pic_url || '',
            phone: data.phone_number || ''
          };
          setDmProfile(profile);
          localStorage.setItem(`dm_profile_${schoolId}`, JSON.stringify(profile));
          return;
        }
      }
    } catch (err) {
      console.warn('Network issue fetching personnel, resorting to offline cache:', err);
    }

    // Offline Cache Fallback
    const cachedProfile = localStorage.getItem(`dm_profile_${schoolId}`);
    if (cachedProfile) {
      setDmProfile(JSON.parse(cachedProfile));
    } else {
      setDmProfile({
        name: 'Discipline Master',
        uniqueId: 'DT-SESSION',
        profilePic: '',
        phone: ''
      });
    }
  };

  // 4. Real-time Attendance Listener from Teachers (public.attendance)
  const setupRealtimeAttendanceListener = (schoolId) => {
    if (!supabase || !supabase.channel) return;

    const channel = supabase
      .channel('attendance_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance', filter: `school_id=eq.${schoolId}` },
        (payload) => {
          const newEntry = payload.new;
          playNotificationSound();

          setToastNotification({
            id: Date.now(),
            subject: newEntry.subject_name || 'Subject Lesson',
            classLevel: newEntry.classLevel || 'Class',
            teacherId: newEntry.teacher_id || 'Teacher',
            time: newEntry.time_recorded || 'Just now'
          });

          // Auto hide toast banner after 6 seconds
          setTimeout(() => {
            setToastNotification(null);
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // 5. Offline Queue Synchronization
  const flushOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offline_discipline_queue') || '[]');
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of queue) {
        if (item.type === 'incident') {
          await supabase.from('discipline_incidents').insert([item.payload]);
        } else if (item.type === 'attendance') {
          await supabase.from(item.table).upsert(item.payload);
        }
      }
      localStorage.setItem('offline_discipline_queue', '[]');
      console.log('⚡ Offline discipline queue successfully synced to Supabase!');
    } catch (err) {
      console.error('Queue sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans pb-16">
      
      {/* Top Header Navigation Bar */}
      <header className="bg-[#2D5A27] text-white shadow-lg sticky top-0 z-40 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* School Brand Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#2D5A27] flex items-center font-black text-xl justify-center shadow-md border border-amber-200">
              DM
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide uppercase text-amber-100">
                {assignedSchool}
              </h1>
              <p className="text-xs text-emerald-200 flex items-center gap-2">
                <span>Discipline Master Command Center</span>
                <span className="text-amber-300 font-bold">• Academic Year 2026/2027</span>
              </p>
            </div>
          </div>

          {/* Network Status & Command Actions */}
          <div className="flex items-center gap-3">
            {/* Real-time Online / Offline PWA Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isOnline ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200' : 'bg-rose-900/60 border-rose-400 text-rose-200 animate-pulse'
            }`}>
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isOnline ? (isSyncing ? 'Syncing Queue...' : 'Online & Live') : 'Offline Mode (PWA)'}</span>
            </div>

            {/* Global Search Button */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-700 text-amber-100 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-emerald-600 shadow-sm"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Global School Search</span>
            </button>

            <Link 
              href="/" 
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <LogOut size={14} />
              <span>Exit</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Real-time Toast Audio Notification Popup */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl border-2 border-amber-400 flex items-start gap-3 max-w-sm animate-bounce">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-black">
            <Bell size={20} />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-black text-amber-300 text-sm">New Subject Roll Call Conducted!</h4>
            <p className="mt-1 font-bold text-slate-200">
              {toastNotification.subject} — <span className="text-amber-200">{toastNotification.classLevel}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Submitted at {toastNotification.time}</p>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-white font-bold text-xs">✕</button>
        </div>
      )}

      {/* Main Body Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">

        {/* Top Personnel Profile & Quick Navigation Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-emerald-700/30 flex items-center justify-center overflow-hidden shadow-inner">
              {dmProfile.profilePic ? (
                <img src={dmProfile.profilePic} alt={dmProfile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-xl text-[#2D5A27]">
                  {dmProfile.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{dmProfile.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="bg-emerald-100 text-[#2D5A27] text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                  {dmProfile.uniqueId}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Chief Discipline Master</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Selector Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto justify-center">
            
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'general' ? 'bg-[#2D5A27] text-amber-100 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen size={15} /> General Education
            </button>

            <button
              onClick={() => setActiveTab('commercial')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'commercial' ? 'bg-[#2D5A27] text-amber-100 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Briefcase size={15} /> Commercial (STT)
            </button>

            <button
              onClick={() => setActiveTab('industrial')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'industrial' ? 'bg-[#2D5A27] text-amber-100 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Factory size={15} /> Industrial (IND)
            </button>

            <button
              onClick={() => setActiveTab('truancy')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'truancy' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bell size={15} /> Live Subject Truancy
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'incidents' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert size={15} /> Misconduct Registry
            </button>

          </div>

        </div>

        {/* Dynamic Tab Body Component Rendering */}
        <div className="transition-all duration-200">
          {activeTab === 'general' && <GeneralAttendance schoolId={activeSchoolId} dmName={dmProfile.name} />}
          {activeTab === 'commercial' && <CommercialAttendance schoolId={activeSchoolId} dmName={dmProfile.name} />}
          {activeTab === 'industrial' && <IndustrialAttendance schoolId={activeSchoolId} dmName={dmProfile.name} />}
          {activeTab === 'truancy' && <SubjectTruancyFeed schoolId={activeSchoolId} />}
          {activeTab === 'incidents' && <IncidentRegistry schoolId={activeSchoolId} dmName={dmProfile.name} />}
        </div>

      </main>

      {/* Global Student Search Modal */}
      {isSearchOpen && (
        <GlobalStudentSearch 
          schoolId={activeSchoolId} 
          onClose={() => setIsSearchOpen(false)} 
        />
      )}

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-slate-400 text-[10px] uppercase tracking-widest font-mono">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>

    </div>
  );
}