'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';

export default function DisciplineMasterDashboard() {
  // School assigned by the master admin (editable via admin assignment if connected, blank/placeholder if unassigned)
  const [assignedSchool, setAssignedSchool] = useState('');
  
  // Discipline master name assigned by the administrator (blank "No Name" by default until assigned)
  const [assignedDisciplineMasterName, setAssignedDisciplineMasterName] = useState('No Name');
  
  const [academicYear] = useState('2026-2027');
  
  // Discipline Master Profile picture upload (blank by default)
  const [disciplineMaster, setDisciplineMaster] = useState({
    profilePic: ''
  });

  const [selectedSection, setSelectedSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected student for behaviour summary detail view
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states for Incident Registration
  const [incidentForm, setIncidentForm] = useState({
    studentId: '',
    studentName: '',
    class: 'Form 1',
    section: 'General',
    category: 'Late Coming',
    customCategory: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    status: 'Pending',
    notes: ''
  });

  // Recent Incidents Data (Empty by default until registered, max 10 slots tracked dynamically)
  const [incidents, setIncidents] = useState([]);

  // Students requiring special attention / Behavior records
  const [attentionList] = useState([]);

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

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDisciplineMaster({ ...disciplineMaster, profilePic: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterIncident = (e) => {
    e.preventDefault();
    if (!incidentForm.studentName || !incidentForm.studentId) {
      alert('Please provide student name and identification.');
      return;
    }

    const finalCategory = incidentForm.category === 'Other' && incidentForm.customCategory 
      ? incidentForm.customCategory 
      : incidentForm.category;

    if (incidents.length >= 10) {
      alert('Maximum recent incidents limit (10) reached for live tracking.');
      return;
    }

    const newInc = {
      id: incidents.length + 1,
      date: incidentForm.date,
      studentName: incidentForm.studentName,
      studentId: incidentForm.studentId,
      class: incidentForm.class,
      location: incidentForm.location || 'Not Specified',
      status: incidentForm.status,
      category: finalCategory,
      notes: incidentForm.notes
    };

    setIncidents([newInc, ...incidents]);

    // Also update selected student behavior summary view if matched
    setSelectedStudent({
      name: incidentForm.studentName,
      idCode: incidentForm.studentId,
      class: incidentForm.class,
      absences: incidentForm.category === 'Absenteeism' ? 1 : 0,
      violationsCount: 1,
      summary: incidentForm.notes || finalCategory
    });

    alert('Incident successfully registered and synced with student profile.');
    setIncidentForm({
      studentId: '',
      studentName: '',
      class: 'Form 1',
      section: 'General',
      category: 'Late Coming',
      customCategory: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      status: 'Pending',
      notes: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      
      {/* Top Header Navigation */}
      <header className="bg-blue-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-blue-900 flex items-center font-black text-xl justify-center shadow-inner">
              NR
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide uppercase">
                {assignedSchool ? assignedSchool : 'No School Assigned Yet'}
              </h1>
              <p className="text-xs text-blue-200">Discipline Master Dashboard | Academic Year: {academicYear}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search student ID or name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-blue-800 text-white placeholder-blue-300 text-sm px-4 py-1.5 rounded-full border border-blue-700 focus:outline-none focus:ring-2 focus:ring-white w-64"
              />
            </div>
            <Link href="/" className="bg-blue-700 hover:bg-blue-600 text-xs px-3 py-1.5 rounded font-semibold transition">
              Home / Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">

        {/* Profile & Quick Overview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Discipline Master Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                {disciplineMaster.profilePic ? (
                  <img src={disciplineMaster.profilePic} alt="Discipline Master" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-slate-400" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfilePicUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  title="Upload or capture picture"
                />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">{assignedDisciplineMasterName}</h2>
                <p className="text-xs font-bold text-blue-600">Discipline Master</p>
                <p className="text-xs text-slate-400 mt-1">Assigned by Administrator</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 italic">
              Click avatar box above to upload or snap profile picture from device camera.
            </div>
          </div>

          {/* Analytics Cards Summary (Zeroed out until records are made) */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Incidents</span>
              <span className="text-2xl font-black text-blue-900 mt-1">{incidents.length}</span>
              <span className="text-[10px] text-slate-400 mt-1">No recorded data yet</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Pending Review</span>
              <span className="text-2xl font-black text-amber-600 mt-1">
                {incidents.filter(i => i.status === 'Pending').length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Action required</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Repeat Offenders</span>
              <span className="text-2xl font-black text-rose-600 mt-1">{attentionList.length}</span>
              <span className="text-[10px] text-slate-400 mt-1">No repeat cases</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Resolved Cases</span>
              <span className="text-2xl font-black text-emerald-600 mt-1">
                {incidents.filter(i => i.status === 'Resolved').length}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">0% resolution rate</span>
            </div>
          </div>

        </div>

        {/* Section Filter & Quick Actions Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Filter Section:</span>
            {['All', 'General Section', 'Technical Section'].map((sec) => (
              <button 
                key={sec} 
                onClick={() => setSelectedSection(sec)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${selectedSection === sec ? 'bg-blue-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold shadow transition flex items-center gap-1.5"
            >
              📥 Download / Print General Report
            </button>
          </div>
        </div>

        {/* Main Content Grid: Register Incident & Recent Incidents (Max 10) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Register Incident Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-black text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Register Student Incident
            </h3>

            <form onSubmit={handleRegisterIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Unique ID *</label>
                <input 
                  type="text" 
                  placeholder="e.g. GEF3NE100226" 
                  value={incidentForm.studentId}
                  onChange={(e) => setIncidentForm({...incidentForm, studentId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-mono"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Ngwa Emmanuel" 
                  value={incidentForm.studentName}
                  onChange={(e) => setIncidentForm({...incidentForm, studentName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
                  <select 
                    value={incidentForm.class}
                    onChange={(e) => setIncidentForm({...incidentForm, class: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                    <option value="Form 5">Form 5</option>
                    <option value="Lower Sixth">Lower Sixth</option>
                    <option value="Upper Sixth">Upper Sixth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select 
                    value={incidentForm.section}
                    onChange={(e) => setIncidentForm({...incidentForm, section: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="General">General Section</option>
                    <option value="Technical">Technical Section</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Behavioral Incident Type *</label>
                <select 
                  value={incidentForm.category}
                  onChange={(e) => setIncidentForm({...incidentForm, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                >
                  {behaviorCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Manual Specification field if 'Other' is selected */}
              {incidentForm.category === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">Specify Violation Manually *</label>
                  <input 
                    type="text" 
                    placeholder="Enter custom incident description..." 
                    value={incidentForm.customCategory}
                    onChange={(e) => setIncidentForm({...incidentForm, customCategory: e.target.value})}
                    className="w-full bg-rose-50 border border-rose-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-600 focus:outline-none font-semibold"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. School Gate" 
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select 
                    value={incidentForm.status}
                    onChange={(e) => setIncidentForm({...incidentForm, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-blue-900"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Under review">Under Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Referred">Referred</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={incidentForm.date}
                    onChange={(e) => setIncidentForm({...incidentForm, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input 
                    type="time" 
                    value={incidentForm.time}
                    onChange={(e) => setIncidentForm({...incidentForm, time: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Conduct Remark / Continuous Statement</label>
                <textarea 
                  rows="2"
                  placeholder="Enter specific behavioral observation or continuous remark..."
                  value={incidentForm.notes}
                  onChange={(e) => setIncidentForm({...incidentForm, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow transition"
              >
                Register & Sync to Student Dashboard 🚀
              </button>
            </form>
          </div>

          {/* Recent School Incidents Table (Max 10, blank unless records exist) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Recent School Incidents (Up to 10 Tracked)
                </h3>
                <span className="text-xs text-slate-400 font-medium">{incidents.length} / 10 Recorded</span>
              </div>

              <div className="overflow-x-auto">
                {incidents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
                    No school incidents have been registered yet. This section remains blank until an incident is added.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                        <th className="p-3">Date</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Violation</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {incidents.slice(0, 10).map((inc) => (
                        <tr 
                          key={inc.id} 
                          onClick={() => setSelectedStudent({ name: inc.studentName, idCode: inc.studentId, class: inc.class, summary: inc.notes || inc.category })}
                          className="hover:bg-blue-50/50 transition cursor-pointer"
                        >
                          <td className="p-3 font-mono text-slate-500">{inc.date}</td>
                          <td className="p-3 font-bold text-blue-900 underline">{inc.studentName}</td>
                          <td className="p-3 text-slate-700 font-medium">{inc.class}</td>
                          <td className="p-3 text-slate-800 font-bold">{inc.category}</td>
                          <td className="p-3 text-slate-600">{inc.location}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              inc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                              inc.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              inc.status === 'Under review' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {inc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Students Requiring Attention Box (Blank unless records exist) */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                Students Requiring Immediate Attention (Repeated Offenders & Absentees)
              </h4>
              {attentionList.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  No repeated offenders or critical absentees recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {attentionList.map((stu) => (
                    <div key={stu.id} className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-rose-900 text-sm">{stu.name}</span>
                          <span className="text-[10px] bg-rose-200 text-rose-900 font-black px-1.5 py-0.5 rounded">{stu.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">{stu.idCode} | {stu.class}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-rose-200/60 flex justify-between text-xs font-bold text-rose-900">
                        <span>Absences: {stu.absences}</span>
                        <span>Violations: {stu.violationsCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Selected Student Behavior Summary Outline Modal / Box (Appears when student clicked) */}
        {selectedStudent && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-md relative">
            <button 
              onClick={() => setSelectedStudent(null)} 
              className="absolute top-4 right-4 text-xs bg-blue-900 text-white font-bold px-3 py-1 rounded hover:bg-blue-800 transition"
            >
              Close Outline ✕
            </button>
            <h3 className="text-base font-black text-blue-900 mb-2">
              📋 Student Behaviour Summary Outline: {selectedStudent.name}
            </h3>
            <p className="text-xs text-slate-600 font-mono mb-4">Unique ID: {selectedStudent.idCode} | Class: {selectedStudent.class}</p>
            <div className="bg-white p-4 rounded-lg border border-blue-100 text-sm text-slate-800">
              <span className="font-bold text-slate-900 block mb-1">Continuous Conduct Remark:</span>
              <p className="italic text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                "{selectedStudent.summary}"
              </p>
            </div>
          </div>
        )}

        {/* Discipline Analytics Section (Headings only until incidents are recorded) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-base font-black text-slate-800 mb-4 pb-2 border-b border-slate-100">
            📊 Discipline Analytics & Behavioral Metrics
          </h3>
          {incidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs italic">
              Analytics data will automatically populate here once discipline incidents are recorded.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Incidents by Grade / Class</h4>
                <p className="text-xs text-slate-600">Active distribution active.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Incidents by Location</h4>
                <p className="text-xs text-slate-600">Active distribution active.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Most Common Violations</h4>
                <p className="text-xs text-slate-600">Active distribution active.</p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-slate-400 text-[10px] uppercase tracking-widest font-mono">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>

    </div>
  );
}