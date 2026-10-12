'use client';

import React, { useState } from 'react';
import { ShieldAlert, Save, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { db as supabase } from '../../../lib/db';

export default function IncidentRegistry({ schoolId, dmName }) {
  const [incidentForm, setIncidentForm] = useState({
    studentId: '',
    studentName: '',
    classLevel: 'Form 1A (F1A)',
    section: 'General Education',
    category: 'Late Coming',
    customCategory: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    status: 'Pending',
    sanction: '',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const behaviorCategories = [
    'Fighting / Physical Aggression',
    'Bullying',
    'Disrespect / Defiance',
    'Classroom Disruption',
    'Attendance / Truancy',
    'Electronic Device Violation',
    'Smoking / Substance Abuse',
    'Property Damage',
    'Theft',
    'Late Coming',
    'Prolonged Late Coming',
    'Sexual Misconduct',
    'Cheating in Examination',
    'Using Mobile Phone in School',
    'Sleeping During Class Lessons',
    'Making Advances to Teacher',
    'Organising Unwanted School Strikes',
    'Absenteeism',
    'Other'
  ];

  const handleRegisterIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.studentId || !incidentForm.studentName) {
      alert('Please fill in the Student ID and Full Name.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const finalCategory = incidentForm.category === 'Other' && incidentForm.customCategory
      ? incidentForm.customCategory
      : incidentForm.category;

    const payload = {
      school_id: schoolId,
      student_id: incidentForm.studentId,
      student_name: incidentForm.studentName,
      classLevel: incidentForm.classLevel,
      section: incidentForm.section,
      category: finalCategory,
      location: incidentForm.location || 'School Premises',
      status: incidentForm.status,
      sanction_assigned: incidentForm.sanction || 'None',
      date: incidentForm.date,
      time: incidentForm.time || '10:00',
      notes: incidentForm.notes || '',
      recorded_by: dmName || 'Discipline Master',
      created_at: new Date().toISOString()
    };

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('discipline_incidents').insert([payload]);
        if (error) {
          console.warn('Supabase insert error, queuing locally:', error.message);
          queueOfflineIncident(payload);
        } else {
          setSaveSuccess(true);
        }
      } catch (err) {
        queueOfflineIncident(payload);
      }
    } else {
      queueOfflineIncident(payload);
    }

    setIsSaving(false);
    setTimeout(() => setSaveSuccess(false), 4000);

    // Reset Form
    setIncidentForm({
      studentId: '',
      studentName: '',
      classLevel: 'Form 1A (F1A)',
      section: 'General Education',
      category: 'Late Coming',
      customCategory: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      status: 'Pending',
      sanction: '',
      notes: ''
    });
  };

  const queueOfflineIncident = (payload) => {
    const queue = JSON.parse(localStorage.getItem('offline_discipline_queue') || '[]');
    queue.push({ type: 'incident', payload });
    localStorage.setItem('offline_discipline_queue', JSON.stringify(queue));
    setSaveSuccess(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-base font-black text-rose-700 flex items-center gap-2">
          <ShieldAlert className="text-rose-600" size={20} />
          Register Student Misconduct & Discipline Incident
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Record student infractions, assign official sanctions, and flag conduct for MINSEC term report cards.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" />
          <span>Incident registered and synced successfully!</span>
        </div>
      )}

      {/* Incident Form */}
      <form onSubmit={handleRegisterIncident} className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Student Unique ID / Matricule *</label>
            <input
              type="text"
              placeholder="e.g. GEF3NE100226"
              value={incidentForm.studentId}
              onChange={(e) => setIncidentForm({ ...incidentForm, studentId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-[#2D5A27] uppercase focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Ngwa Emmanuel"
              value={incidentForm.studentName}
              onChange={(e) => setIncidentForm({ ...incidentForm, studentName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department Section</label>
            <select
              value={incidentForm.section}
              onChange={(e) => setIncidentForm({ ...incidentForm, section: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-[#2D5A27] focus:outline-none"
            >
              <option value="General Education">General Education</option>
              <option value="Technical Commercial ( STT)">Technical Commercial ( STT)</option>
              <option value="Technical Industrial ( IND)">Technical Industrial ( IND)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Class Level</label>
            <input
              type="text"
              placeholder="e.g. Form 3 Science or Y2Com"
              value={incidentForm.classLevel}
              onChange={(e) => setIncidentForm({ ...incidentForm, classLevel: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Behavioral Incident Type *</label>
          <select
            value={incidentForm.category}
            onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
          >
            {behaviorCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {incidentForm.category === 'Other' && (
          <div>
            <label className="block text-xs font-bold text-rose-700 mb-1">Specify Violation Description *</label>
            <input
              type="text"
              placeholder="Enter specific custom violation..."
              value={incidentForm.customCategory}
              onChange={(e) => setIncidentForm({ ...incidentForm, customCategory: e.target.value })}
              className="w-full bg-rose-50 border border-rose-300 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-900 focus:outline-none"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g. School Gate / Classroom"
              value={incidentForm.location}
              onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={incidentForm.status}
              onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="Pending">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Referred">Referred to Principal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sanction Assigned</label>
            <input
              type="text"
              placeholder="e.g. 2 Hours Detention"
              value={incidentForm.sanction}
              onChange={(e) => setIncidentForm({ ...incidentForm, sanction: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-700 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Conduct Remark / Continuous Observations</label>
          <textarea
            rows="3"
            placeholder="Enter detailed observation or continuous remarks..."
            value={incidentForm.notes}
            onChange={(e) => setIncidentForm({ ...incidentForm, notes: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:outline-none"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-[#2D5A27] hover:bg-emerald-800 text-amber-100 font-bold py-3 rounded-xl text-xs transition shadow flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isSaving ? 'Registering Incident...' : 'Register Misconduct & Sync Record 🚀'}</span>
        </button>

      </form>

    </div>
  );
}