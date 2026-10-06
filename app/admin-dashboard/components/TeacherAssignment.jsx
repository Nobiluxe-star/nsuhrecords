'use client';

import { useState, useRef, useEffect } from 'react';

import { createClient } from '@supabase/supabase-js';
import { getTeacherLockStatus, toggleTeacherLockStatus } from '../../../lib/markLockService';
import { useAcademicConfigs } from '../context/AcademicConfigsContext';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

import { 
  GENERAL_CLASSES_CATALOG, 
  TECHNICAL_COMMERCIAL_CATALOG, 
  TECHNICAL_INDUSTRIAL_CATALOG 
} from '../page';

export default function TeacherAssignment({
  teacherToEdit,
  isEditing, 
  onClose,
  teachersList,
  setTeachersList,
  activeSchool,
  ALL_SUBJECTS_LIST,
  ALL_AVAILABLE_CLASSES,
}) {
   
const { 
    masterSubjects, 
    masterClassesGen, 
    masterClassesComm, 
    masterClassesInd 
  } = useAcademicConfigs();

  const [isMarkEntryAuthorized, setIsMarkEntryAuthorized] = useState(true);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

 useEffect(() => {
    const activeSchoolId = activeSchool?.id || activeSchool?.school_id || (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null);
     const selectedTeacherId = teacherToEdit?.teacher_id || teacherToEdit?.id;
    if (selectedTeacherId && activeSchoolId) {
      getTeacherLockStatus(selectedTeacherId, activeSchoolId).then((isLocked) => {
        setIsMarkEntryAuthorized(!isLocked);
      });
    }
  }, [teacherToEdit, activeSchool]);

  const handleToggleLock = async () => {
    const activeSchoolId = activeSchool?.id || activeSchool?.school_id || (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null);
    const selectedTeacherId = teacherToEdit?.teacher_id || teacherToEdit?.id;

    if (!selectedTeacherId || !activeSchoolId) return;

    setIsTogglingLock(true);
    const newLockState = isMarkEntryAuthorized; // Next lock state is true (locked) if currently authorized

    const success = await toggleTeacherLockStatus(selectedTeacherId, activeSchoolId, newLockState);
    if (success) {
        setIsMarkEntryAuthorized(!newLockState);

        setTeachersList((prev) =>
          prev.map((t) =>
            t.teacher_id === selectedTeacherId || t.id === selectedTeacherId
              ? { ...t, is_marks_locked: newLockState }
              : t
          )
        );
      }
    setIsTogglingLock(false);
  };
  // --- STATE HOOKS ---
  const [message, setMessage] = useState({ type: '', text: '' });
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherResidence, setTeacherResidence] = useState('');
  const [teacherSection, setTeacherSection] = useState('General');
  const [teacherQualification, setTeacherQualification] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [customTeacherQualification, setCustomTeacherQualification] = useState('');
  
  const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState([]);
  const [subjectClassSchedules, setSubjectClassSchedules] = useState({});
  const [schedulerData, setSchedulerData] = useState({});
  
  const [teacherPhoto, setTeacherPhoto] = useState(null);
  const [teacherPhotoPreview, setTeacherPhotoPreview] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [activeTeacherResult, setActiveTeacherResult] = useState(null);
 
// --- HELPER ALIASES ---
  const subjectSchedules = subjectClassSchedules;
  const setSubjectSchedules = setSubjectClassSchedules;
  const [customDbSubjects, setCustomDbSubjects] = useState([]);
useEffect(() => {
    const fetchCustomSubjectsFromDb = async () => {
      try {
        let schoolId = activeSchool?.school_id || activeSchool?.id || localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
        if (!schoolId) return;

        const { data, error } = await supabase
          .from('school_academic_configs')
          .select('*')
          .eq('school_id', schoolId)
          .eq('config_type', 'subject');

        if (!error && data) {
          // Map database records to match the structure of ALL_SUBJECTS_LIST
          const formatted = data.map(item => ({
            name: item.name || item.subject,
            category: item.category || item.section || 'General Core Subjects'
          }));
          setCustomDbSubjects(formatted);
        }
      } catch (err) {
        console.error('Error fetching custom subjects for teacher assignment:', err);
      }
    };

    fetchCustomSubjectsFromDb();
  }, [activeSchool]);
  // --- SUBJECT FILTERING & TOGGLING ---
  const getAvailableSubjects = () => {
    const general = ALL_SUBJECTS_LIST
      .filter((s) => s.category === "General Core Subjects")
      .map((s) => s.name);

    const commercial = ALL_SUBJECTS_LIST
      .filter((s) => s.category === "Commercial Subjects")
      .map((s) => s.name);

    const industrial = ALL_SUBJECTS_LIST
      .filter((s) => s.category === "Industrial Subjects")
      .map((s) => s.name);

    switch (teacherSection) {
      case 'General':
        return general;
      case 'Technical Commercial':
        return [...general, ...commercial];
      case 'Technical Industrial':
        return [...general, ...industrial];
      case 'Both':
      default:
        return [...general, ...commercial, ...industrial];
    }
  };

  const handleSubjectToggle = (sub, checked) => {
    let updatedSubjects;
    if (checked) {
      updatedSubjects = [...selectedTeacherSubjects, sub];
      setSubjectSchedules(prev => ({
        ...prev,
        [sub]: [
          { className: getDefaultClassForSection(teacherSection || selectedSection), day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' }
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

  // --- SCHEDULE ROW MANAGEMENT ---
  const getDefaultClassForSection = (sec) => {
    const s = String(sec || '').toLowerCase();
    if (s.includes('commercial')) return 'First Year Commercial (Y1Com)';
    if (s.includes('industrial')) return 'First Year Industrial (Y1Ind)';
    return 'Form 1A (F1A)';
  };

  const addClassRowToSubject = (subject) => {
    setSubjectSchedules(prev => ({
      ...prev,
      [subject]: [
        ...(prev[subject] || []),
        { 
          className: getDefaultClassForSection(teacherSection || selectedSection), 
          day: 'Monday', 
          startTime: '07:30 AM', 
          endTime: '09:00 AM' 
        }
      ]
    }));
  };

  const removeClassRowFromSubject = (subject, index) => {
    setSubjectSchedules(prev => {
      const list = [...(prev[subject] || [])];
      list.splice(index, 1);
      return { ...prev, [subject]: list };
    });
  };

  const handleScheduleRowChange = (subject, index, field, value) => {
    setSubjectSchedules((prev) => {
      const list = [...(prev[subject] || [])];
      const defaultClass = getDefaultClassForSection(teacherSection || selectedSection);
      const existingRow = list[index] || { className: defaultClass, day: '', startTime: '', endTime: '' };
      list[index] = {
        ...existingRow,
        [field]: value
      };
      return { ...prev, [subject]: list };
    });

    if (typeof setSchedulerData === 'function') {
      setSchedulerData((prev) => {
        const subList = [...(prev[subject] || [])];
        const existingRow = subList[index] || {};
        subList[index] = {
          ...existingRow,
          [field]: value
        };
        return { ...prev, [subject]: subList };
      });
    }
  };

  // --- PHOTO HANDLER ---
  const handleTeacherPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeacherPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacherPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- TIME CONVERSION & VALIDATION HELPERS ---
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const cleanStr = String(timeStr).replace(/\u00a0/g, ' ').trim().toUpperCase();
    const parts = cleanStr.split(/\s+/);
    const timePart = parts[0];
    const modifier = parts[1] || '';

    let [hours, minutes] = timePart.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // --- ID GENERATOR ---
  const generateTeacherId = (schoolNameInput, section, fullName, phoneNumber) => {
    const cleanStr = (str) => (str || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const validSchoolName = cleanStr(schoolNameInput) || 'School';
    const schoolWords = validSchoolName.split(/\s+/).filter(Boolean);
    let schoolCode = '';
    if (schoolWords.length >= 2) {
      schoolCode = (schoolWords[0][0] + schoolWords[1][0]).toUpperCase();
    } else {
      schoolCode = schoolWords[0].substring(0, 2).toUpperCase();
    }

    const secCode = (section || 'General').toUpperCase().startsWith('T') ? 'T' : 'G';
    const validFullName = cleanStr(fullName) || 'Teacher';
    const nameWords = validFullName.split(/\s+/).filter(Boolean);
    let initials = '';
    if (nameWords.length >= 2) {
      initials = (nameWords[0][0] + nameWords[1][0]).toUpperCase();
    } else {
      initials = nameWords[0].substring(0, 2).toUpperCase();
    }

    const cleanPhone = (phoneNumber || '0000').replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 3 ? cleanPhone.slice(-3) : '000';
    const yearSuffix = '26';
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

    return `${schoolCode}-${secCode}${initials}${phoneSuffix}${yearSuffix}${randomLetter}`;
  };

  // --- MAIN SUBMISSION HANDLER ---
  const handleTeacherAssignment = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingTeacher) return;
    setIsSubmittingTeacher(true);

    if (!teacherName || !teacherPhone || !teacherEmail || selectedTeacherSubjects.length === 0) {
      alert('Please provide teacher name, mandatory email, phone number, and select at least one subject with class schedules.');
      setIsSubmittingTeacher(false);
      return;
    }

    const currentSchoolTitle = activeSchool?.name || schoolName || 'Virgin Island';
    const teacherId = teacherToEdit?.teacher_id || teacherToEdit?.id || generateTeacherId(
      currentSchoolTitle,
      teacherSection,
      teacherName,

      teacherPhone
    );

    const signupToken = 'teach_' + Math.random().toString(36).substring(2, 9);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (APP_BASE_URL || 'https://classlogs.cc');
    let activeSchoolId = activeSchool?.school_id || activeSchool?.id || localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
    let activeSchoolName = activeSchool?.name || activeSchool?.['school-name'] || schoolName;

    if (!activeSchoolId && activeSchoolName) {
      const { data: matchedSchool } = await supabase
        .from('assigned_schools')
        .select('school_id, id, name')
        .ilike('name', `%${activeSchoolName}%`)
        .maybeSingle();

      if (matchedSchool) {
        activeSchoolId = matchedSchool.school_id || matchedSchool.id;
      }
    }

    if (!activeSchoolId) {
      alert("Security Notice: Could not locate active School ID. Please re-select your school or log in again.");
      setIsSubmittingTeacher(false);
      return;
    }

    const generatedLink = teacherToEdit?.signup_link || teacherToEdit?.signupLink || `${baseUrl}/staff-signup?role=teacher&token=${signupToken}&id=${teacherId}&school_id=${activeSchoolId}`;
    
    const normalizedSchedules = {};
    if (subjectSchedules && typeof subjectSchedules === 'object') {
      Object.entries(subjectSchedules).forEach(([subjectKey, slots]) => {
        if (Array.isArray(slots)) {
          normalizedSchedules[subjectKey] = slots.map((slot) => {
            const resolvedClass = slot.className || slot.classLevel || slot.class_name || teacherSection || 'h/A';
            return { ...slot, className: resolvedClass, classLevel: resolvedClass };
          });
        } else {
          normalizedSchedules[subjectKey] = slots;
        }
      });
    }

    const rawScheduleItems = Object.values(normalizedSchedules || {});
    const extractedClasses = Array.from(
      new Set(
        rawScheduleItems
          .flatMap((item) => (Array.isArray(item) ? item : []))
          .map((slot) => slot?.className || slot?.classLevel)
          .filter(Boolean)
      )
    );

    const finalClassLevelString = extractedClasses.length > 0 ? extractedClasses.join(', ') : (teacherSection || 'N/A');

    const payloadData = {
      school_id: activeSchoolId,
      teacher_id: teacherId,
      name: teacherName,
      contact: teacherPhone,
      email: teacherEmail,
      residence: teacherResidence || 'N/A',
      section: teacherSection,
      classLevel: finalClassLevelString,
      subjects: (selectedTeacherSubjects || []).map(s => typeof s === 'string' ? s : (s.name || '')),
      schedules: normalizedSchedules,
      picture: teacherPhotoPreview || null,
      signup_link: generatedLink,
      role: 'teacher',
      academic_year: activeSchool?.academic_year || (typeof getAcademicYear === 'function' ? getAcademicYear() : '2025/2026'),
      qualification: teacherQualification,
      photo_url: teacherPhotoPreview || null,
    };

    let error = null;
    let savedRecord = null;
if (teacherToEdit) {
      const { id, teacher_id, created_at, ...updateFields } = payloadData;
      const targetId = teacherToEdit.teacher_id || teacherToEdit.id;

      const res = await supabase
        .from('teachers')
        .update(updateFields)
        .eq('teacher_id', targetId)
        .eq('school_id', activeSchoolId)
        .select('*');

      error = res.error;
      if (res.data && res.data.length > 0) savedRecord = res.data[0];
    } else {
      const res = await supabase
        .from('teachers')
        .insert([{ ...payloadData, school_id: activeSchoolId }])
        .select('*');

      error = res.error;
      if (res.data && res.data.length > 0) savedRecord = res.data[0];
    }
    if (error) {
      alert('Error saving teacher to database: ' + error.message);
      setIsSubmittingTeacher(false);
      return;
    }

    if (savedRecord) {
      const formattedSavedTeacher = {
        ...savedRecord,
        id: savedRecord.id,
        teacher_id: savedRecord.teacher_id,
        school_id: savedRecord.school_id,
        name: savedRecord.name,
        phone: savedRecord.contact || savedRecord.phone || '',
        email: savedRecord.email || '',
        signupLink: savedRecord.signup_link || '',
        schedules: savedRecord.schedules || {},
        classLevel: savedRecord.classLevel || finalClassLevelString,
      };

      setTeachersList((prev) => {
      const exists = prev.some((t) => (t.id === formattedSavedTeacher.id || t.teacher_id === formattedSavedTeacher.teacher_id));
        if (exists) {
          return prev.map((t) => ((t.id === formattedSavedTeacher.id || t.teacher_id === formattedSavedTeacher.teacher_id) ? formattedSavedTeacher : t));s
        }
        return [formattedSavedTeacher, ...prev];
      });
    }

   setIsSubmittingTeacher(false);
    setMessage({
  type: "success",
  text: "Teacher successfully assigned and time table generated, please edit and update teacher assignment in all teachers list!"
});

    // 1. Reset state to exit edit mode and clear form
    if (typeof setTeacherToEdit === 'function') setTeacherToEdit(null);
    if (typeof setIsEditing === 'function') setIsEditing(false);

    // 2. Clear all input fields back to blank registration defaults
    setTeacherName('');
    setTeacherPhone('');
    setTeacherEmail('');
    setTeacherResidence('');
    setTeacherQualification('');
    setSelectedTeacherSubjects([]);
    setSubjectSchedules({});

    // 3. Call parent close handler if provided
    if (typeof onClose === 'function') onClose();
  };
  

  const handleTeacherFileUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    
  }
};
const startTeacherCamera = () => {
    
  };
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const handleOpenEditModal = (assignmentData) => {
    setEditingAssignment(assignmentData);
    setIsEditModalOpen(true);
  };
  const handleSchedulerRowChange = (subject, rowIndex, field, value) => {
    setSubjectSchedules(prev => {
      const updated = { ...prev };
      const rows = [...(updated[subject] || [{}])];
      rows[rowIndex] = { ...rows[rowIndex], [field]: value };
      updated[subject] = rows;
      return updated;
    });
  };
  const START_TIME_OPTIONS = [
  "07:30 AM", "08:15 AM", "09:00 AM", "09:45 AM", "10:30 AM", "1:15 AM",
  "12:00 PM", "12:30 PM", "12:45 PM", "01:00 PM", "01:15 PM", "01:30 PM",
  "01:45 PM", "02:00 PM", "02:15 PM", "02:30 PM", "02:45 PM", "03:00 PM",
  "03:15 PM", "03:30 PM", "03:45 PM", "04:00 PM", "04:15 PM"
];

const END_TIME_OPTIONS = [
  "08:15 AM", "09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM", "12:00 PM",
  "12:30 PM", "12:45 PM", "01:00 PM", "01:15 PM", "01:30 PM", "01:45 PM",
  "02:00 PM", "02:15 PM", "02:30 PM", "02:45 PM", "03:00 PM", "03:15 PM",
  "03:30 PM", "03:45 PM", "04:00 PM", "04:15 PM", "04:30 PM"
];
  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedSection, setSelectedSection] = useState('General Education');

const getFilteredSubjects = (section) => {
    const sec = String(section || '').trim().toLowerCase();

    if (sec.includes('commercial')) {
      const commercial = masterSubjects.filter(s => s.category === "Commercial Subjects");
      const general = masterSubjects.filter(s => s.category === "General Core Subjects");
      return [...commercial, ...general];
    }

    if (sec.includes('industrial')) {
      const industrial = masterSubjects.filter(s => s.category === "Industrial Subjects");
      const general = masterSubjects.filter(s => s.category === "General Core Subjects");
      return [...industrial, ...general];
    }

    if (sec.includes('both') || sec.includes('all')) {
      return masterSubjects;
    }

    return masterSubjects.filter(s => s.category === "General Core Subjects");
  };

  const getSectionClasses = (section) => { 
    const sec = (section || '').toLowerCase();
    let rawList = masterClassesGen;

    if (sec.includes('commercial')) {
      rawList = masterClassesComm;
    } else if (sec.includes('industrial')) {
      rawList = masterClassesInd;
    } else if (sec.includes('both') || sec.includes('all')) {
      rawList = [...masterClassesGen, ...masterClassesComm, ...masterClassesInd];
    }

    // Deduplicate array values
    const seen = new Set();
    return rawList.filter(cls => {
      const name = typeof cls === 'string' ? cls.trim() : cls?.name?.trim();
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
  };

  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
useEffect(() => {
  if (teacherToEdit) {
    // 1. Basic Info
    if (typeof setTeacherName === 'function') setTeacherName(teacherToEdit.name || '');
    if (typeof setTeacherPhone === 'function') setTeacherPhone(teacherToEdit.contact || teacherToEdit.phone || '');
    if (typeof setTeacherEmail === 'function') setTeacherEmail(teacherToEdit.email || '');
    if (typeof setTeacherResidence === 'function') setTeacherResidence(teacherToEdit.residence || '');
    if (typeof setTeacherQualification === 'function') setTeacherQualification(teacherToEdit.qualification || '');
    
    // 2. Section Sync (CRITICAL: Syncs BOTH teacherSection and selectedSection)
    const activeSection = teacherToEdit.section || 'General Education';
    if (typeof setTeacherSection === 'function') setTeacherSection(activeSection);
    if (typeof setSelectedSection === 'function') setSelectedSection(activeSection);

    // 3. Hydrate Schedule Data
    const rawSchedules = teacherToEdit.schedules || {};
    
    // Extract checked subject list
    let subjectList = [];
    if (typeof rawSchedules === 'object' && !Array.isArray(rawSchedules) && rawSchedules !== null) {
      subjectList = Object.keys(rawSchedules);
    } else if (Array.isArray(rawSchedules)) {
      subjectList = rawSchedules.map(s => (typeof s === 'string' ? s : (s.subject || s.name))).filter(Boolean);
    }

    if (typeof setSelectedTeacherSubjects === 'function') {
      setSelectedTeacherSubjects(subjectList);
    }

    // Force normalized structure so rows always possess 'className' and 'classLevel'
    const normalizedSchedules = {};
    if (typeof rawSchedules === 'object' && !Array.isArray(rawSchedules) && rawSchedules !== null) {
      Object.entries(rawSchedules).forEach(([subjectKey, rows]) => {
        if (Array.isArray(rows)) {
          normalizedSchedules[subjectKey] = rows.map(r => ({
            ...r,
            className: r.className || r.classLevel || r.class || r.form || '',
            classLevel: r.classLevel || r.className || r.class || r.form || '',
            day: r.day || 'Monday',
            startTime: r.startTime || '07:30 AM',
            endTime: r.endTime || '09:00 AM'
          }));
        }
      });
    }

    if (typeof setSubjectSchedules === 'function') {
      setSubjectSchedules(normalizedSchedules);
    }
  } else {
    // Reset back to blank registration defaults
    if (typeof setTeacherName === 'function') setTeacherName('');
    if (typeof setTeacherPhone === 'function') setTeacherPhone('');
    if (typeof setTeacherEmail === 'function') setTeacherEmail('');
    if (typeof setTeacherResidence === 'function') setTeacherResidence('');
    if (typeof setTeacherQualification === 'function') setTeacherQualification('');
    if (typeof setSelectedTeacherSubjects === 'function') setSelectedTeacherSubjects([]);
    if (typeof setSubjectSchedules === 'function') setSubjectSchedules({});
  }
}, [teacherToEdit]);
return (
  <div className={`p-8 rounded-2xl max-w-4xl mx-auto shadow-2xl space-y-6 transition-colors duration-300 ${isEditing ? 'bg-[#FDFBF7] text-gray-900 border border-gray-300' : 'bg-gray-900 text-white'}`}>
    <h2 className={`text-lg font-bold border-b pb-3 ${isEditing ? 'text-emerald-900 border-gray-300' : 'text-white border-gray-800'}`}>
      {isEditing ? `Edit Teacher & Configure Timetable: ${teacherToEdit?.name || teacherToEdit?.full_name}` : 'Assign New Teacher & Configure Timetable'}
    </h2>
            
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

{/* TEACHER QUALIFICATION (MANDATORY) & PROFILE PHOTO OPTIONS */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
  {/* Qualification Dropdown + Manual Entry */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
      Teacher Qualification (Mandatory) *
    </label>
    <select
      value={teacherQualification}
      onChange={(e) => setTeacherQualification(e.target.value)}
      required
      className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
    >
      <option value="">-- Select Qualification --</option>
      <optgroup label="Professional Teaching Diplomas (ENS / ENSET)">
        <option value="DIPES I">DIPES I (Secondary - 1st Cycle)</option>
        <option value="DIPES II">DIPES II (Secondary - 2nd Cycle)</option>
        <option value="DIPET I">DIPET I (Technical - 1st Cycle)</option>
        <option value="DIPET II">DIPET II (Technical - 2nd Cycle)</option>
        <option value="DIPEN">DIPEN (Normal School)</option>
        
      </optgroup>
      <optgroup label="General Academic Qualifications">
        <option value="Bachelor Degree (B.Sc / B.A / Licence)">Bachelor's Degree / Licence</option>
        <option value="Master Degree (M.Sc / M.A / Maîtrise)">Master's Degree / Maîtrise</option>
        <option value="Doctorate / PhD">Doctorate / Ph.D</option>
        <option value="GCE A-Level / Baccalauréat">GCE A-Level / Baccalauréat</option>
      </optgroup>
      <optgroup label="Technical Commercial Training (STT / Business)">
        <option value="HND - Commercial">HND (Commercial / Business)</option>
        <option value="BTS - Commercial">BTS (Commercial)</option>
        <option value="Licence Professionnelle - Commercial">Licence Professionnelle (Commercial)</option>
        <option value="Baccalauréat Technique - STT">Baccalauréat Technique (STT)</option>
      </optgroup>
      <optgroup label="Technical Industrial Training (IND / Engineering)">
        <option value="HND - Industrial / Engineering">HND (Industrial / Engineering)</option>
        <option value="BTS - Industrial">BTS (Industrial)</option>
        <option value="DUT - Technology / Industrial">DUT (Industrial)</option>
        <option value="Diplome d'Ingénieur">Diplôme d'Ingénieur</option>
        <option value="Baccalauréat Technique - Industrial">Baccalauréat Technique (Industrial / BT)</option>
      </optgroup>
      <optgroup label="Custom Option">
        <option value="OTHER">Other (Enter Manually...)</option>
      </optgroup>
    </select>

    {teacherQualification === 'OTHER' && (
      <input
        type="text"
        value={customTeacherQualification}
        onChange={(e) => setCustomTeacherQualification(e.target.value)}
        placeholder="Type qualification manually..."
        required
        className="mt-2 w-full bg-[#1f2937] border border-amber-500 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
      />
    )}
  </div>

  {/* Photo Upload (Gallery) & Live Camera Capture Split */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
   TEACHER PROFILE PICTURE / TAKE PHOTO
  </label>
  <div className="flex items-center gap-3">
    {/* 📁 Choose File from PC/Phone */}
    <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg border border-gray-700 flex items-center gap-1.5 font-medium">
      📁 Choose File
      <input
        type="file"
        accept="image/*"
        onChange={handleTeacherFileUpload}
        className="hidden"
      />
    </label>

    {/* 📸 Take Photo via Live Camera */}
    <button
      type="button"
      onClick={startTeacherCamera}
      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-medium shadow-md"
    >
      📸 Take Photo
    </button>

    {/* Image Preview Box */}
    {teacherPhotoPreview ? (
      <img
        src={teacherPhotoPreview}
        alt="Teacher Preview"
        className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500 shadow-md ml-auto"
      />
    ) : (
      <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px] text-gray-400 ml-auto">
        No Photo
      </div>
    )}
  </div>
  {/* 🎥 Live Camera Overlay for Teachers */}
{isCameraActive && (
  <div className="mt-4 p-4 bg-[#1f2937] border border-amber-500/50 rounded-xl text-center space-y-3">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full max-h-48 rounded object-cover border border-amber-500/30"
    />
    <div className="flex justify-center gap-2">
      <button
        type="button"
        onClick={captureTeacherPhoto}
        className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        📸 Capture Photo
      </button>
      <button
        type="button"
        onClick={() => {
          const stream = videoRef.current?.srcObject;
          if (stream) stream.getTracks().forEach(track => track.stop());
          setIsCameraActive(false);
        }}
        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg font-medium"
      >
        Cancel
      </button>
    </div>
  </div>
)}
</div>
</div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Section</label>
                <select
  value={teacherSection || selectedSection || 'General Education'}
  onChange={(e) => {
    const newSec = e.target.value;
    if (typeof setTeacherSection === 'function') setTeacherSection(newSec);
    if (typeof setSelectedSection === 'function') setSelectedSection(newSec);
  }}
  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
>
  <option value="General Education">General Education</option>
  <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
  <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
  <option value="Both">Both (All Sections)</option>
</select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Select Subjects Taught (Click subjects to add forms and configure day, start time, and end time)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const settingsTab = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Class & Coefficient Settings'));
                      if (settingsTab) settingsTab.click();
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    + Add/Manage Subjects in Settings
                  </button>
                </div>

                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="🔍 Search subjects..."
                    value={subjectSearchQuery}
                    onChange={(e) => setSubjectSearchQuery(e.target.value)}
                    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto bg-[#1f2937]/50 p-3 rounded-lg border border-gray-700/50">
          {getFilteredSubjects(teacherSection || selectedSection)
            .filter((subObj) => {
              const subName = typeof subObj === 'string' ? subObj : subObj.name;
              return subName.toLowerCase().includes(subjectSearchQuery.toLowerCase());
            })
            .map((subObj, idx) => {
  const sub = typeof subObj === 'string' ? subObj : subObj.name;
  return (
    <label
      key={idx}
      className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer p-2 hover:bg-gray-800/60 rounded"
    >
      <input
        type="checkbox"
        checked={selectedTeacherSubjects.includes(sub)}
        onChange={(e) => handleSubjectToggle(sub, e.target.checked)}
        className="w-4 h-4 rounded border-gray-700 text-amber-600 focus:ring-0 cursor-pointer accent-amber-500"
      />
      <span className="leading-tight select-none">{sub}</span>
    </label>
  );
})}
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
  value={row.className || row.classLevel || row.class || row.form || ''}
  onChange={(e) => {
    const val = e.target.value;
    handleSchedulerRowChange(subject, rIdx, 'className', val);
    handleSchedulerRowChange(subject, rIdx, 'classLevel', val);
  }}
  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-amber-300"
>

 {/* Dynamically available section classes */}
{(typeof getSectionClasses === 'function' ? getSectionClasses(teacherSection || selectedSection || '') : []).map((cls, cId) => {
  const className = typeof cls === 'string' ? cls : cls?.name;
  return (
    <option key={cId} value={className}>
      {className}
    </option>
  );
})}
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
                               {/* Start Time Select */}
                     {/* Start & End Time Block with Datalist Suggestions */}
                            <datalist id="start-time-suggestions">
                              {START_TIME_OPTIONS.map((time, idx) => (
                                <option key={idx} value={time} />
                              ))}
                            </datalist>

                            <datalist id="end-time-suggestions">
                              {END_TIME_OPTIONS.map((time, idx) => (
                                <option key={idx} value={time} />
                              ))}
                            </datalist>

                            {/* START TIME COMBOBOX (Typable + Dropdown Arrow) */}
                            <div className="w-full md:w-28">
                              <label className="block text-[10px] uppercase text-gray-400 mb-1">Start Time</label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="07:30 AM"
                                  value={schedulerData[subject]?.[rIdx]?.startTime ?? row.startTime ?? '07:30 AM'}
                                  onChange={(e) => handleSchedulerRowChange(subject, rIdx, 'startTime', e.target.value)}
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-white pr-6 focus:outline-none focus:border-amber-500"
                                />
                                <select
                                  value=""
                                  onChange={(e) => handleSchedulerRowChange(subject, rIdx, 'startTime', e.target.value)}
                                  className="absolute right-1 w-5 bg-transparent text-gray-400 text-xs cursor-pointer focus:outline-none"
                                >
                                  <option value="" disabled hidden></option>
                                  {START_TIME_OPTIONS.map((time, idx) => (
                                    <option key={idx} value={time} className="bg-[#1f2937] text-white">
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* STICKY COLON SEPARATOR */}
                            <div className="hidden md:flex items-center justify-center pt-5 text-gray-400 font-bold text-sm">
                              :
                            </div>

                            {/* END TIME COMBOBOX (Typable + Dropdown Arrow) */}
                            <div className="w-full md:w-28">
                              <label className="block text-[10px] uppercase text-gray-400 mb-1">End Time</label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="09:00 AM"
                                  value={schedulerData[subject]?.[rIdx]?.endTime ?? row.endTime ?? '09:00 AM'}
                                  onChange={(e) => handleSchedulerRowChange(subject, rIdx, 'endTime', e.target.value)}
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-white pr-6 focus:outline-none focus:border-amber-500"
                                />
                                <select
                                  value=""
                                  onChange={(e) => handleSchedulerRowChange(subject, rIdx, 'endTime', e.target.value)}
                                  className="absolute right-1 w-5 bg-transparent text-gray-400 text-xs cursor-pointer focus:outline-none"
                                >
                                  <option value="" disabled hidden></option>
                                  {END_TIME_OPTIONS.map((time, idx) => (
                                    <option key={idx} value={time} className="bg-[#1f2937] text-white">
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>
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

{message?.text && (
  <div className={`mb-4 p-4 rounded-lg font-medium text-sm text-center shadow-lg ${
    message.type === 'success' 
      ? 'bg-emerald-900/60 border border-emerald-500 text-emerald-300' 
      : 'bg-rose-900/60 border border-rose-500 text-rose-300'
  }`}>
    {message.text}
  </div>
)}
{teacherToEdit && (
  <button
    type="button"
    onClick={handleToggleLock}
    disabled={isTogglingLock}
    className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 mb-3 ${
      isMarkEntryAuthorized
        ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30'
        : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
    }`}
  >
    {isTogglingLock ? (
      'Updating Lock Status...'
    ) : isMarkEntryAuthorized ? (
      <>🔒 Freeze Marks Entry For This Teacher</>
    ) : (
      <>🔓 Authorize Marks Entry For This Teacher</>
    )}
  </button>
)}
<div className="flex gap-4 mt-6">
  <button
    type="submit"
    disabled={isSubmittingTeacher}
    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg"
  >
    {isSubmittingTeacher 
      ? 'Saving Teacher Assignment...' 
      : teacherToEdit 
        ? 'Update Teacher Assignment' 
        : 'Save Teacher Assignment, Verify Conflicts & Generate Timetable'}
  </button>

  {teacherToEdit && (
    <button
      type="button"
      onClick={() => {
        if (typeof setTeacherToEdit === 'function') setTeacherToEdit(null);
        if (typeof setIsEditing === 'function') setIsEditing(false);
        if (typeof onClose === 'function') onClose();
      }}
      className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
    >
      Cancel / Exit
    </button>
  )}
</div>
            </form>

            {activeTeacherResult && (
              <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-emerald-400">
  {teacherToEdit ? 'Teachers details successfully edited and stored' : 'Teacher Assigned Successfully!'}
</h3>
                <p className="text-xs text-gray-300">Generated Teacher ID: <strong className="text-amber-300 font-mono">{activeTeacherResult.id}</strong></p>
                <p className="text-xs text-gray-300">Share this dedicated signup and timetable portal link with <strong>{activeTeacherResult.name}</strong>:</p>
                <div className="bg-[#1f2937] p-3 rounded border border-emerald-500/40 text-amber-300 font-mono text-xs select-all">
                  {activeTeacherResult.signupLink}
                </div>
              </div>
          )}
</div>
  );
}