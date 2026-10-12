'use client';

import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, AlertTriangle, UserX, ShieldAlert, CheckCircle } from 'lucide-react';
import { db as supabase } from '../../../lib/db';

export default function SubjectTruancyFeed({ schoolId }) {
  const [truancyEntries, setTruancyEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Today's Date String (YYYY-MM-DD)
  const todayDate = new Date().toISOString().split('T')[0];

  // Fetch Live Subject Absences for Today
  const fetchTodaySubjectAbsences = async () => {
    if (!schoolId) return;
    setIsLoading(true);

    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('school_id', schoolId)
          .eq('attendance_date', todayDate)
          .or('status.eq.Absent,status.eq.Late')
          .order('created_at', { ascending: false });

        if (data) {
          setTruancyEntries(data);
          localStorage.setItem(`truancy_feed_${schoolId}_${todayDate}`, JSON.stringify(data));
        }
      } else {
        const cached = localStorage.getItem(`truancy_feed_${schoolId}_${todayDate}`);
        if (cached) setTruancyEntries(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('Network issue fetching truancy feed, loading cache:', err);
      const cached = localStorage.getItem(`truancy_feed_${schoolId}_${todayDate}`);
      if (cached) setTruancyEntries(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySubjectAbsences();
  }, [schoolId]);

  // Quick Action Handler for Discipline Master
  const handleIssueAction = (entry, actionType) => {
    setActionSuccess(`Action '${actionType}' recorded for ${entry.student_id || 'Student'}`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-rose-700 flex items-center gap-2">
            <Bell className="text-rose-600 animate-pulse" size={20} />
            Live Subject Truancy & Period Absence Feed
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of students marked <span className="font-bold text-rose-600">Absent</span> or <span className="font-bold text-amber-600">Late</span> by subject teachers today ({todayDate}).
          </p>
        </div>

        <button
          onClick={fetchTodaySubjectAbsences}
          disabled={isLoading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Feed List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
          <RefreshCw size={16} className="animate-spin text-rose-600" />
          <span>Scanning teacher period roll calls...</span>
        </div>
      ) : truancyEntries.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
          No subject-level absences or lates recorded by teachers today. Great discipline record!
        </div>
      ) : (
        <div className="space-y-3">
          {truancyEntries.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl font-black text-xs ${
                  item.status === 'Absent' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  <UserX size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      Student ID: {item.student_id || 'ID Pending'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      item.status === 'Absent' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">
                    Subject: <span className="text-[#2D5A27]">{item.subject_name || 'Subject Lesson'}</span> | Class: <span className="text-slate-800">{item.classLevel || 'Class'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Recorded at {item.time_recorded || 'N/A'} • Teacher ID: {item.teacher_id || 'Staff'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                <button
                  onClick={() => handleIssueAction(item, 'Summoned Student')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  Summon
                </button>
                <button
                  onClick={() => handleIssueAction(item, 'Log Sanction')}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <ShieldAlert size={12} />
                  Sanction
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}