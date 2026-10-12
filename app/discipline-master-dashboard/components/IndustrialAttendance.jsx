'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Save, RefreshCw, Calendar, Check, Factory } from 'lucide-react';
import { db as supabase } from '../../../lib/db';
import { TECHNICAL_INDUSTRIAL_CATALOG, INDUSTRIAL_TRADE_SERIES } from '../../admin-dashboard/page.js';

export default function IndustrialAttendance({ schoolId, dmName }) {
  const [selectedClass, setSelectedClass] = useState(TECHNICAL_INDUSTRIAL_CATALOG[0] || 'First Year Industrial (Y1Ind)');
  const [selectedTrade, setSelectedTrade] = useState(INDUSTRIAL_TRADE_SERIES[0] || 'FOUNDATIONAL');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState([]);
  const [rosterStatus, setRosterStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Fetch Students for Selected Industrial Class & Trade Series
  useEffect(() => {
    if (!schoolId) return;

    const fetchIndustrialStudents = async () => {
      setIsLoading(true);
      try {
        if (navigator.onLine) {
          let query = supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .or(`classLevel.eq."${selectedClass}",class_name.eq."${selectedClass}"`);

          if (selectedTrade && selectedTrade !== 'FOUNDATIONAL') {
            query = query.eq('trade_series', selectedTrade);
          }

          const { data, error } = await query;

          if (data && data.length > 0) {
            setStudents(data);
            localStorage.setItem(`ind_students_${schoolId}_${selectedClass}_${selectedTrade}`, JSON.stringify(data));
          } else {
            const cached = localStorage.getItem(`ind_students_${schoolId}_${selectedClass}_${selectedTrade}`);
            if (cached) setStudents(JSON.parse(cached));
            else setStudents([]);
          }
        } else {
          const cached = localStorage.getItem(`ind_students_${schoolId}_${selectedClass}_${selectedTrade}`);
          if (cached) setStudents(JSON.parse(cached));
          else setStudents([]);
        }
      } catch (err) {
        console.warn('Error fetching industrial students, checking offline store:', err);
        const cached = localStorage.getItem(`ind_students_${schoolId}_${selectedClass}_${selectedTrade}`);
        if (cached) setStudents(JSON.parse(cached));
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndustrialStudents();
  }, [schoolId, selectedClass, selectedTrade]);

  // 2. Initialize Roster to 'Present'
  useEffect(() => {
    const initialRoster = {};
    students.forEach((st) => {
      const id = st.id || st.student_id;
      initialRoster[id] = 'Present';
    });
    setRosterStatus(initialRoster);
  }, [students]);

  const handleStatusChange = (studentId, newStatus) => {
    setRosterStatus((prev) => ({
      ...prev,
      [studentId]: newStatus
    }));
  };

  // 3. Save Industrial Roll Call
  const handleSaveRollCall = async () => {
    if (students.length === 0) {
      alert('No students available in this industrial roster to save.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const payload = students.map((st) => {
      const id = st.id || st.student_id;
      const status = rosterStatus[id] || 'Present';
      return {
        school_id: schoolId,
        student_id: id,
        student_name: st.full_name || st.name,
        classLevel: selectedClass,
        trade_series: selectedTrade,
        section: 'Technical Industrial ( IND)',
        date: attendanceDate,
        status: status,
        unexcused_hours: status === 'Absent Unexcused' ? 2 : status === 'Late' ? 1 : 0,
        recorded_by: dmName || 'Discipline Master',
        created_at: new Date().toISOString()
      };
    });

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('technical_industrial_attendance')
          .upsert(payload, { onConflict: 'school_id,student_id,date' });

        if (error) {
          console.warn('Supabase upsert error, queuing locally:', error.message);
          queueOfflineRecord(payload);
        } else {
          setSaveSuccess(true);
        }
      } catch (err) {
        queueOfflineRecord(payload);
      }
    } else {
      queueOfflineRecord(payload);
    }

    setIsSaving(false);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const queueOfflineRecord = (payload) => {
    const queue = JSON.parse(localStorage.getItem('offline_discipline_queue') || '[]');
    queue.push({ type: 'attendance', table: 'technical_industrial_attendance', payload });
    localStorage.setItem('offline_discipline_queue', JSON.stringify(queue));
    setSaveSuccess(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-[#2D5A27] flex items-center gap-2">
            <Factory className="text-[#2D5A27]" size={20} />
            Technical Industrial (IND) Department — Daily Roll Call
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Filter by industrial class level and specialty technical trade.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Level Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-black text-[#2D5A27] focus:outline-none"
            >
              {TECHNICAL_INDUSTRIAL_CATALOG.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Trade Series Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Trade:</span>
            <select
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            >
              {INDUSTRIAL_TRADE_SERIES.map((trd) => (
                <option key={trd} value={trd}>{trd}</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-slate-500" />
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveRollCall}
            disabled={isSaving}
            className="bg-[#2D5A27] hover:bg-emerald-800 text-amber-100 px-4 py-2 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'Saving...' : 'Save Industrial Attendance'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check size={16} className="text-emerald-600" />
          <span>Industrial roll call saved successfully for {selectedClass} ({selectedTrade})!</span>
        </div>
      )}

      {/* Roster Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
            <RefreshCw size={16} className="animate-spin text-[#2D5A27]" />
            <span>Loading {selectedClass} industrial roster...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
            No students registered under <span className="font-bold text-slate-600">{selectedClass} ({selectedTrade})</span> yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <th className="p-3 rounded-l-lg">Student Name</th>
                <th className="p-3">Matricule / ID</th>
                <th className="p-3">Specialty Trade</th>
                <th className="p-3 text-center">Attendance Status Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {students.map((st) => {
                const id = st.id || st.student_id;
                const currentStatus = rosterStatus[id] || 'Present';
                return (
                  <tr key={id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-black text-slate-800">{st.full_name || st.name}</td>
                    <td className="p-3 font-mono text-slate-500">{st.student_id || st.unique_id || 'ID Pending'}</td>
                    <td className="p-3 text-slate-600 font-bold">{st.trade_series || selectedTrade}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1.5">
                        {[
                          { label: 'Present', color: 'bg-emerald-600 text-white' },
                          { label: 'Late', color: 'bg-amber-500 text-white' },
                          { label: 'Absent Unexcused', color: 'bg-rose-600 text-white' },
                          { label: 'Absent Excused', color: 'bg-blue-600 text-white' }
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleStatusChange(id, opt.label)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition shadow-sm ${
                              currentStatus === opt.label
                                ? opt.color
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}