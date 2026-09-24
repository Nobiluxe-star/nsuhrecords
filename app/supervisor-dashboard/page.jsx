'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, BookOpen, FileText, 
  Bell, Eye, Download, Share2, ShieldAlert, CheckCircle2, 
  Calendar, MapPin, Phone, Mail, Award, Layers
} from 'lucide-react';

export default function SupervisorConsole({ schoolId = 'default-school-id', supabaseClient }) {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState({
    name: '',
    region: '',
    division: '',
    po_box: '',
    phone: ''
  });
  const [selectedSection, setSelectedSection] = useState('General Education');
  const [teachers, setTeachers] = useState([]);
  const [lessonLogs, setLessonLogs] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const sections = [
    'General Education', 
    'Technical Commercial', 
    'Technical Industrial'
  ];

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveNodeData() {
      setLoading(true);

      if (!supabaseClient) {
        if (isMounted) {
          setSchool({ name: '', region: '', division: '', po_box: '', phone: '' });
          setStudentCount(0);
          setTeachers([]);
          setLessonLogs([]);
          setLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch live school details from Supabase
        const { data: schoolData, error: schoolErr } = await supabaseClient
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .single();

        if (schoolData && isMounted) {
          setSchool({
            name: schoolData.name || '',
            region: schoolData.region || '',
            division: schoolData.division || '',
            po_box: schoolData.po_box || '',
            phone: schoolData.phone || ''
          });
        }

        // 2. Fetch live teacher roster filtered by school node & selected section
        const { data: teacherData, error: teacherErr } = await supabaseClient
          .from('teachers')
          .select('*')
          .eq('school_id', schoolId)
          .eq('section', selectedSection);

        if (isMounted) setTeachers(teacherData || []);

        // 3. Fetch live lesson progression logs filtered by school node & section
        const { data: logData, error: logErr } = await supabaseClient
          .from('lesson_logs')
          .select('*')
          .eq('school_id', schoolId)
          .eq('section', selectedSection);

        if (isMounted) setLessonLogs(logData || []);

        // 4. Fetch live student count from Supabase for the selected section
        const { count, error: countErr } = await supabaseClient
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('section', selectedSection);

        if (isMounted) {
          setStudentCount(count || 0);
        }

      } catch (err) {
        console.error('Supabase real-time sync error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLiveNodeData();
    return () => { isMounted = false; };
  }, [schoolId, selectedSection, supabaseClient]);

  const handlePublicShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-800 mx-auto"></div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Syncing Live Supabase Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      
      
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 print:hidden">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">MINSEC Secure Multi-Tenant Node Connected</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handlePublicShare}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Share2 className="h-4 w-4 text-emerald-700" />
            <span>{copySuccess ? 'Link Copied!' : 'Copy Public Share Link'}</span>
          </button>
          <button 
            onClick={handlePrintPdf}
            className="flex items-center space-x-1.5 bg-emerald-900 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Export Official PDF</span>
          </button>
        </div>
      </div>

      {/* Fully Dynamic MINSEC Institutional Header */}
      <header className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center md:text-left">
          
          {/* Left French Header */}
          <div className="space-y-1 text-xs font-serif uppercase tracking-wider text-slate-800">
            <p className="font-bold">RÉPUBLIQUE DU CAMEROUN</p>
            <p className="text-[10px] text-slate-500 lowercase italic">paix – travail – patrie</p>
            <p className="text-slate-400">*****</p>
            <p className="font-bold">MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES</p>
            <p className="text-slate-400">*****</p>
            <p className="font-semibold">DÉLÉGATION RÉGIONALE DU {school.region || '---'}</p>
            <p className="text-slate-400">*****</p>
            <p className="font-semibold">DÉLÉGATION DÉPARTEMENTALE DU {school.division || '---'}</p>
            <p className="text-slate-400">*****</p>
            <p className="font-black text-emerald-900">{school.name || '---'}</p>
            <p className="text-[11px] text-slate-500 font-mono normal-case">B.P.: {school.po_box || '---'} — Tél: {school.phone || '---'}</p>
          </div>

          {/* Center Cameroon Flag Emblem */}
          <div className="flex flex-col items-center justify-center space-y-2 my-4 md:my-0">
            <div className="h-20 w-28 rounded-xl overflow-hidden flex shadow-md border-2 border-slate-300">
              <div className="w-1/3 bg-emerald-600 h-full"></div>
              <div className="w-1/3 bg-red-600 h-full flex items-center justify-center text-yellow-300 font-black text-sm">★</div>
              <div className="w-1/3 bg-yellow-400 h-full"></div>
            </div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">République du Cameroun</span>
          </div>

          {/* Right English Header */}
          <div className="space-y-1 text-xs font-serif uppercase tracking-wider text-slate-800 md:text-right">
            <p className="font-bold">REPUBLIC OF CAMEROON</p>
            <p className="text-[10px] text-slate-500 lowercase italic">peace – work – fatherland</p>
            <p className="text-slate-400">*****</p>
            <p className="font-bold">MINISTRY OF SECONDARY EDUCATION</p>
            <p className="text-slate-400">*****</p>
            <p className="font-semibold">REGIONAL DELEGATION FOR THE {school.region || '---'}</p>
            <p className="text-slate-400">*****</p>
            <p className="font-semibold">DIVISIONAL DELEGATION FOR THE {school.division || '---'}</p>
            <p className="text-slate-400">*****</p>
            <p className="font-black text-emerald-900">{school.name || '---'}</p>
            <p className="text-[11px] text-slate-500 font-mono normal-case">P.O. Box: {school.po_box || '---'} — Tel: {school.phone || '---'}</p>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <h1 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight uppercase">
            Office of the Supervisor — Pedagogical Audit Console
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-Time Section Enrollment, Instructor Qualifications & Lesson Log Verification
          </p>
        </div>
      </header>

      {/* Section Selector Bar */}
      <section className="max-w-7xl mx-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Layers className="h-4 w-4 text-emerald-700" />
          <span>Select Educational Branch / Section:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedSection === sec 
                  ? 'bg-emerald-900 text-white shadow-sm ring-2 ring-emerald-900/20' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </section>

      {/* Dynamic Stat Cards (Pulls 0 when empty) */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <Users className="h-5 w-5 text-emerald-700" />
            <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">Active Section</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{studentCount}</h3>
          <p className="text-xs text-slate-500 font-medium">Enrolled Students ({selectedSection})</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <GraduationCap className="h-5 w-5 text-blue-700" />
            <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">Faculty Roster</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{teachers.length}</h3>
          <p className="text-xs text-slate-500 font-medium">Qualified Instructors Assigned</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <BookOpen className="h-5 w-5 text-amber-700" />
            <span className="text-xs font-mono bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">Curriculum Log</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{lessonLogs.length}</h3>
          <p className="text-xs text-slate-500 font-medium">Active Lesson Progression Logs</p>
        </div>
      </section>

      {/* Data Tables */}
      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* Teachers & Qualifications Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">Teacher Roster & Professional Qualifications</h3>
              <p className="text-xs text-slate-500">Showing instructors assigned to {selectedSection}</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded-full font-bold">Live DB Query</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Teacher ID</th>
                  <th className="p-4 font-bold">Instructor Name</th>
                  <th className="p-4 font-bold">Subject</th>
                  <th className="p-4 font-bold">Qualification</th>
                  <th className="p-4 font-bold">Experience</th>
                  <th className="p-4 font-bold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 italic">No teacher records found in Supabase for {selectedSection}.</td>
                  </tr>
                ) : (
                  teachers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-emerald-700">{t.id || t.teacher_id}</td>
                      <td className="p-4 font-bold text-slate-900">{t.name || t.full_name}</td>
                      <td className="p-4 text-slate-700">{t.subject}</td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-800">{t.qualification}</td>
                      <td className="p-4 text-slate-600">{t.experience || '---'}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setViewingTeacher(t)}
                          className="text-emerald-800 font-bold text-xs hover:underline flex items-center justify-end space-x-1 ml-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lesson Progression Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900">Instructor Lesson Progression Logs</h3>
              <p className="text-xs text-slate-500">Tracking syllabus milestones and chapter completion for {selectedSection}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-3 py-1 rounded-full font-bold">Live DB Query</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Teacher ID</th>
                  <th className="p-4 font-bold">Instructor Name</th>
                  <th className="p-4 font-bold">Subject</th>
                  <th className="p-4 font-bold">Chapter / Topic Covered</th>
                  <th className="p-4 font-bold">Completion</th>
                  <th className="p-4 font-bold text-right">Date Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lessonLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 italic">No lesson logs recorded in Supabase for {selectedSection}.</td>
                  </tr>
                ) : (
                  lessonLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-emerald-700">{log.teacher_id || log.teacherId || '---'}</td>
                      <td className="p-4 font-bold text-slate-900">{log.teacher_name || log.teacherName}</td>
                      <td className="p-4 text-slate-700">{log.subject}</td>
                      <td className="p-4 text-slate-800 font-medium">{log.chapter}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-600 h-full" style={{ width: log.progress || '0%' }}></div>
                          </div>
                          <span className="text-xs font-bold text-emerald-800">{log.progress || '0%'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-xs text-slate-500">{log.date || log.created_at?.split('T')[0]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Teacher Inspection Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">Instructor Pedagogic Dossier</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {viewingTeacher.id || viewingTeacher.teacher_id}</p>
              </div>
              <button 
                onClick={() => setViewingTeacher(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <p className="text-xs text-slate-400 font-bold">Full Name</p>
                <p className="font-bold text-base text-slate-900">{viewingTeacher.name || viewingTeacher.full_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Assigned Subject</p>
                  <p className="font-semibold text-slate-800">{viewingTeacher.subject}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Professional Diploma</p>
                  <p className="font-bold text-emerald-800">{viewingTeacher.qualification}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Section</p>
                  <p className="font-semibold text-slate-800">{viewingTeacher.section || selectedSection}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-400 font-bold">Experience</p>
                  <p className="font-semibold text-slate-800">{viewingTeacher.experience || '---'}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <button 
                onClick={() => setViewingTeacher(null)}
                className="bg-emerald-900 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 py-6 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-mono">App conceived by Norbert Che Nsuh — MINSEC Multi-Tenant Architecture</p>
      </footer>
    </div>
  );
}