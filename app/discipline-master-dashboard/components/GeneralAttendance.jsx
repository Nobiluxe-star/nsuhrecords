'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Check, X, Clock, Save, RefreshCw, AlertCircle } from 'lucide-react';

const STATIC_CLASSES = [
  "Form 1A (F1A)", "Form 1B (F1B)", "Form 2A (F2A)", "Form 2B (F2B)",
  "Form 3A (F3A)", "Form 3B (F3B)", "Form 4A (F4A)", "Form 4B (F4B)",
  "Form 5A (F5A)", "Form 5B (F5B)", "Lower Sixth Arts (LSA)", "Upper Sixth Arts (USA)"
];

export default function GeneralAttendance({ schoolId, dmName }) {
  const [selectedClass, setSelectedClass] = useState("Form 1A (F1A)");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const activeSchoolId = schoolId || (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null) || '15052cc7-bc44-45e1-9acc-bc445e19acc4';

  const fetchStudents = async () => {
    setLoading(true);
    setStatusMsg(null);

    try {
      // Query students for the active school
      const { data: allStudents, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', activeSchoolId);

      if (error) {
        setStatusMsg({ type: 'error', text: `Database error: ${error.message}` });
        setStudents([]);
        return;
      }

      // Flexible string matching for "Form 1A (F1A)"
      const cleanTarget = selectedClass.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = (allStudents || []).filter(s => {
        const studentClass = (s.classLevel || s.class_level || s.class_form || s.class || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        return studentClass.includes(cleanTarget) || cleanTarget.includes(studentClass);
      });

      setStudents(matched);

      // Fetch existing attendance records
      const { data: existingAtt } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', activeSchoolId)
        .eq('attendance_date', selectedDate);

      const initialMap = {};
      matched.forEach(st => {
        const match = existingAtt?.find(a => a.student_id === st.id || a.unique_code === st.unique_code);
        initialMap[st.id] = match ? match.status : 'Present';
      });

      setAttendanceState(initialMap);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, selectedDate, activeSchoolId]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setStatusMsg(null);

    try {
      const recordsToInsert = students.map(st => ({
        school_id: activeSchoolId,
        student_id: st.id,
        unique_code: st.unique_code || st.student_code || st.roll_number,
        classLevel: selectedClass,
        subject_name: 'Gate Roll Call',
        attendance_date: selectedDate,
        status: attendanceState[st.id] || 'Present',
        recorded_by: dmName || 'Discipline Master',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('attendance').upsert(recordsToInsert);

      if (error) {
        await supabase.from('attendance').insert(recordsToInsert);
      }

      setStatusMsg({ type: 'success', text: `Saved attendance for ${students.length} students!` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-black text-slate-900">General Education Department — Daily Roll Call</h2>
          <p className="text-xs text-slate-500 font-medium">Select class level to conduct official daily gate & assembly attendance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-black text-slate-500 uppercase">Class:</span>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
            >
              {STATIC_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 outline-none"
          />

          <button 
            onClick={handleSaveAttendance} 
            disabled={saving || students.length === 0}
            className="bg-[#1E3A1E] hover:bg-emerald-900 text-amber-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save Attendance
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <AlertCircle size={15} />
          {statusMsg.text}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs font-medium flex justify-center items-center gap-2">
          <RefreshCw size={16} className="animate-spin text-emerald-700" />
          Loading student roster for {selectedClass}...
        </div>
      ) : students.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          No students registered under <strong className="text-slate-700">{selectedClass}</strong> yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student Code</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st, idx) => {
                const currentStatus = attendanceState[st.id] || 'Present';
                return (
                  <tr key={st.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-black text-slate-800">
                      {st.full_name || st.fullName || st.name || 'Unnamed Student'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {st.unique_code || st.student_code || st.roll_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => handleStatusChange(st.id, 'Present')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 border transition ${
                            currentStatus === 'Present' 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <Check size={12} /> Present
                        </button>

                        <button
                          onClick={() => handleStatusChange(st.id, 'Late')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 border transition ${
                            currentStatus === 'Late' 
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <Clock size={12} /> Late
                        </button>

                        <button
                          onClick={() => handleStatusChange(st.id, 'Absent')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 border transition ${
                            currentStatus === 'Absent' 
                              ? 'bg-rose-600 text-white border-rose-700 shadow-sm' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <X size={12} /> Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}