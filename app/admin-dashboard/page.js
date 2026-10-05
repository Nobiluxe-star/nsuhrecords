'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

import { getCurrentAcademicYear } from '../../lib/academicYear';

import GeneralMarkSheet from './components/mark-sheets/GeneralMarkSheet';
import TechnicalCommercialMarkSheet from './components/mark-sheets/TechnicalCommercialMarkSheet';
import TechnicalIndustrialMarkSheet from './components/mark-sheets/TechnicalIndustrialMarkSheet';
import SubjectCoefficientsManager from './components/SubjectCoefficientsManager';
import TeacherAssignment from './components/TeacherAssignment';
import SchoolSettings from './components/SchoolSettings';

import BulkGeneralReportCard from '../student-dashboard/components/BulkGeneralReportCard';
import BulkTechnicalCommercialReportCard from '../student-dashboard/components/BulkTechnicalCommercialReportCard';
import BulkTechnicalIndustrialReportCard from '../student-dashboard/components/BulkTechnicalIndustrialReportCard';

import { useAcademicConfigs } from './context/AcademicConfigsContext';
import { getTeacherLockStatus, toggleTeacherLockStatus } from '../../lib/markLockService';


// Cameroon Ministry of Secondary Education Official Classes, Technical & Commercial Trades, Subjects & Series Catalog
export const GENERAL_LOWER_CLASSES = [
  'Form 1A (F1A)',
  'Form 1B (F1B)',
  'Form 1C (F1C)',
  'Form 1D (F1D)',
  'Form 2A (F2A)',
  'Form 2B (F2B)',
  'Form 2C (F2C)',
  'Form 2D (F2D)',
  'Form 3A (F3A)',
  'Form 3B (F3B)',
  'Form 3C (F3C)',
  'Form 4A (F4A)',
  'Form 4B (F4B)',
  'Form 5 Arts (F5A)',
  'Form 5 Science (F5B)',
];
export const GENERAL_CLASSES_CATALOG = [
  'Form 1A (F1A)',
  'Form 1B (F1B)',
  'Form 1C (F1C)',
  'Form 1D (F1D)',
  'Form 2A (F2A)',
  'Form 2B (F2B)',
  'Form 2C (F2C)',
  'Form 2D (F2D)',
  'Form 3A (F3A)',
  'Form 3B (F3B)',
  'Form 3C (F3C)',
  'Form 4A (F4A)',
  'Form 4B (F4B)',
  'Form 5 Arts (F5A)',
  'Form 5 Science (F5B)',
  'Lower Sixth Arts (L6A)',
  'Lower Sixth Science (L6S)',
  'Upper Sixth Arts (U6A)',
  'Upper Sixth Science (U6S)',
];

export const TECHNICAL_COMMERCIAL_CATALOG = [
  'First Year Commercial (Y1Com)',
  'Second Year Commercial (Y2Com)',
  'Third Year Commercial (Y3Com)',
  'Fourth Year Commercia (CAPCom)',
  'Fifth Year Commercial  (Y5Com)',
  'Lower Sixth Commercial (ProCom)',
  'Upper Sixth Commercial (BaCom)',
];

export const TECHNICAL_INDUSTRIAL_CATALOG = [
  'First Year Industrial (Y1Ind)',
  'Second Year Industrial (Y2Ind)',
  'Third Year Industrial (Y3Ind)',
  'Fourth Year Industrial (CAPInd)',
  'Fifth Year Industrial  (Y5Ind)',
  'Lower Sixth Industrial (ProInd)',
  'Upper Sixth Industrial  (BacInd)',
];

// Series mapping for Upper/Lower Sixth General
export const GENERAL_SERIES_CATALOG = {
  ARTS: ['A1', 'A2', 'A3', 'A4', 'A5'],
  SCIENCE: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
  series: {
    ARTS: [
      { code: 'A1', subjects: ['Literature', 'History', 'French Language'] },
      { code: 'A2', subjects: ['Geography', 'Economics', 'History'] },
      { code: 'A3', subjects: ['Literature', 'Economics', 'History'] },
      { code: 'A4', subjects: ['Economics', 'Geography', 'Mathematics'] },
      { code: 'A5', subjects: ['Literature', 'History', 'Philosophy'] }
    ],
    SCIENCE: [
      { code: 'S1', subjects: ['Physics', 'Chemistry', 'Mathematics'] },
      { code: 'S2', subjects: ['Chemistry', 'Physics', 'Biology'] },
      { code: 'S3', subjects: ['Biology', 'Chemistry', 'Mathematics'] },
      { code: 'S4', subjects: ['Biology', 'Chemistry', 'Geology'] },
      { code: 'S5', subjects: ['Chemistry', 'Computer Science / ICT', 'Mathematics'] },
      { code: 'S6', subjects: ['Chemistry', 'Physics', 'Mathematics', 'Further Mathematics'] },
      { code: 'S7', subjects: ['Chemistry', 'Biology', 'Physics', 'Mathematics'] },
      { code: 'S8', subjects: ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Further Mathematics'] }
    ]
  }
};
// Trade Series mapping for Technical Commercial
export const COMMERCIAL_TRADE_SERIES = [
  'FOUNDATIONAL',
  'G1 - Secretarial Studies',
  'G2 - Accounting and Management',
  'G3 - Commercial Action / Marketing',
  'FIG - Taxation and Management Information Systems',
  'ACA - Administrative Action and Communication',
  'ESF - Home Economics',
  'IH - Bespoke Tailoring',
  'HOT - Hotel Management',
  'TO - Tourism',
  'BO - Bakery and Pastry'
];

// Trade Series mapping for Technical Industrial
export const INDUSTRIAL_TRADE_SERIES = [
  'FOUNDATIONAL',
  'F1 - Mechanical Manufacturing',
    'F2 - Electronics',
    'F3 - Electrical Power Systems',
    'F4BA - Civil Engineering Building Construction',
    'F4BE - Building Study and Study Office',
    'F4TP - Public Works',
    'F5 - Air Conditioning and Ventilation',
    'F6 - Laboratory Chemistry',
    'F7 - Biological Sciences',
    'F8 - Medical and Social Sciences',
    'ARM - Automobile Repair Mechanics',
    'PL - Plumbing and Hydraulic Installation Systems'
];

export const ALL_AVAILABLE_CLASSES = [
  ...GENERAL_CLASSES_CATALOG,
  ...TECHNICAL_COMMERCIAL_CATALOG,
  ...TECHNICAL_INDUSTRIAL_CATALOG
];
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Student ID Generator: WC-GMA15739G or WC-TPA16814B
const generateStudentId = (schoolName, section, fullName, classLevel, age, gender) => {
  const schoolCode = String(schoolName || 'SCH')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  const secCode = String(section || 'General Education').toUpperCase().startsWith('T') ? 'T' : 'G';

  const initials = String(fullName || 'ST')
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  const rawClass = String(classLevel || 'F1');
  const bracketMatch = rawClass.match(/\(([^)]+)\)/);
  const classCode = bracketMatch
    ? bracketMatch[1].toUpperCase()
    : rawClass.split(/\s+/).map(word => word[0]).join('').toUpperCase();

  const studentAge = String(age || '15');

  const cleanGender = String(gender || '').toLowerCase();
  const genderCode = (cleanGender.includes('female') || cleanGender.includes('girl') || cleanGender.startsWith('g')) ? 'G' : 'B';

  // Random 2-digit suffix placed right after gender (10 - 99)
  const randomSuffix = String(Math.floor(10 + Math.random() * 90));

  return `${schoolCode}-${secCode}${initials}${classCode}${studentAge}${genderCode}${randomSuffix}`;
};
// Teacher ID Generator: WC-TJO45626K or WC-GJO45626K
const generateTeacherId = (schoolName, section, fullName, phoneNumber) => {
  const schoolCode = (schoolName || 'SCH')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 2)
    .toUpperCase();

  const secCode = (section || 'General Education').toUpperCase().startsWith('T') ? 'T' : 'G';

  const cleanName = (fullName || 'TE').replace(/[^a-zA-Z]/g, '');
  const initials = cleanName.substring(0, 2).toUpperCase();

  const cleanPhone = (phoneNumber || '0000').replace(/\D/g, '');
  const phoneSuffix = cleanPhone.length >= 3 ? cleanPhone.slice(-3) : '000';

  const yearSuffix = '26';
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  return `${schoolCode}-${secCode}${initials}${phoneSuffix}${yearSuffix}${randomLetter}`;
};

export const getAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 8 is Sept7ember
    
    if (currentMonth >= 8) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  };
// Helper to retrieve classes dynamically based on active section
const getSectionClasses = (section) => {
  if (!section) return [...(GENERAL_CLASSES_CATALOG || []), ...(TECHNICAL_COMMERCIAL_CATALOG || []), ...(TECHNICAL_INDUSTRIAL_CATALOG || [])];

  const sec = String(section).trim().toLowerCase();

  if (sec.includes('commercial') || sec.includes('stt')) {
    return TECHNICAL_COMMERCIAL_CATALOG || [];
  }
  if (sec.includes('industrial') || sec.includes('ind')) {
    return TECHNICAL_INDUSTRIAL_CATALOG || [];
  }
  if (sec.includes('general')) {
    return GENERAL_CLASSES_CATALOG || [];
  }
  if (sec.includes('both')) {
    return [
      ...(GENERAL_CLASSES_CATALOG || []),
      ...(TECHNICAL_COMMERCIAL_CATALOG || []),
      ...(TECHNICAL_INDUSTRIAL_CATALOG || [])
    ];
  }

  return GENERAL_CLASSES_CATALOG || [];
};
// Master Subjects Database List
export const ALL_SUBJECTS_LIST = [
  // General Core Subjects
  { name: "Additional Mathematics", category: "General Core Subjects" },
  { name: "Artistic Education", category: "General Core Subjects" },
  { name: "Biology", category: "General Core Subjects" },
  { name: "Chemistry", category: "General Core Subjects" },
  { name: "Citizenship Education / Moral Education", category: "General Core Subjects" },
  { name: "Computer Science / ICT", category: "General Core Subjects" },
  { name: "Economics", category: "General Core Subjects" },
  { name: "Economic Geography", category: "General Core Subjects" },
  { name: "English Language", category: "General Core Subjects" },
  { name: "Literature", category: "General Core Subjects" },
  { name: "Food Science", category: "General Core Subjects" },
  { name: "French Language", category: "General Core Subjects" },
  { name: "Further Mathematics", category: "General Core Subjects" },
  { name: "Geography", category: "General Core Subjects" },
  { name: "Geology", category: "General Core Subjects" },
  { name: "History", category: "General Core Subjects" },
  { name: "Home Economics", category: "General Core Subjects" },
  { name: "Human Biology", category: "General Core Subjects" },
  { name: "Law", category: "General Core Subjects" },
  { name: "Law and Government", category: "General Core Subjects" },
  { name: "Manual Labour", category: "General Core Subjects" },
  { name: "Mathematics", category: "General Core Subjects" },
  { name: "Natural Science", category: "General Core Subjects" },
  { name: "Philosophy", category: "General Core Subjects" },
  { name: "Physics", category: "General Core Subjects" },
  { name: "Pure Mathematics with Mechanics", category: "General Core Subjects" },
  { name: "Pure Mathematics with Statistics", category: "General Core Subjects" },
  { name: "Religious Studies", category: "General Core Subjects" },
  { name: "School Orientation", category: "General Core Subjects" },
  { name: "Sports & Physical Education", category: "General Core Subjects" },

// Commercial Subjects
  { name: "Application of Management Software", category: "Commercial Subjects" },
  { name: "Business Communication", category: "Commercial Subjects" },
  { name: "Business Management", category: "Commercial Subjects" },
  { name: "Business Mathematics", category: "Commercial Subjects" },
  { name: "Commerce", category: "Commercial Subjects" },
  { name: "Computer-Aided Accounting", category: "Commercial Subjects" },
  { name: "Corporate Accounting", category: "Commercial Subjects" },
  { name: "Digital Marketing", category: "Commercial Subjects" },
  { name: "Entrepreneurship", category: "Commercial Subjects" },
  { name: "Family Life Education and Gerontology", category: "Commercial Subjects" },
  { name: "Food Nutrition & Health", category: "Commercial Subjects" },
  { name: "Information Processing", category: "Commercial Subjects" },
  { name: "International Financial Accounting", category: "Commercial Subjects" },
  { name: "Introduction to Marketing", category: "Commercial Subjects" },
  { name: "Introductory Accounting", category: "Commercial Subjects" },
  { name: "Legislation", category: "Commercial Subjects" },
  { name: "Management Accounting", category: "Commercial Subjects" },
  { name: "Office Practice", category: "Commercial Subjects" },
  { name: "OHADA Financial Accounting", category: "Commercial Subjects" },
  { name: "Principles of Accounts", category: "Commercial Subjects" },
  { name: "Product Mastery", category: "Commercial Subjects" },
  { name: "Professional Communication Techniques", category: "Commercial Subjects" },
  { name: "Resource Management on Home Studies", category: "Commercial Subjects" },
  { name: "Sales Method", category: "Commercial Subjects" },
  { name: "Science / Hygiene", category: "Commercial Subjects" },
  { name: "Shorthand (Stenography symbols)", category: "Commercial Subjects" },

  // Industrial Subjects
  { name: "Applied Mechanics", category: "Industrial Subjects" },
  { name: "Construction Drawing", category: "Industrial Subjects" },
  { name: "Construction Processes", category: "Industrial Subjects" },
  { name: "Construction Technology", category: "Industrial Subjects" },
  { name: "Construction Technology Practice", category: "Industrial Subjects" },
  { name: "Decorative Arts", category: "Industrial Subjects" },
  { name: "Electrical and Electronic Technology", category: "Industrial Subjects" },
  { name: "Electrical Circuits", category: "Industrial Subjects" },
  { name: "Electrical Diagrams", category: "Industrial Subjects" },
  { name: "Electrical Machines", category: "Industrial Subjects" },
  { name: "Electrical Tests & Measurements", category: "Industrial Subjects" },
  { name: "Engineering Drawing", category: "Industrial Subjects" },
  { name: "Engineering Science", category: "Industrial Subjects" },
  { name: "Industrial Computing", category: "Industrial Subjects" },
  { name: "Material Technology and Workshop Process", category: "Industrial Subjects" },
  { name: "Materials", category: "Industrial Subjects" },
  { name: "Mech. Const. Tech. & Drawing", category: "Industrial Subjects" },
  { name: "Mechanical Technology", category: "Industrial Subjects" },
  { name: "Mechanical Technology Practice", category: "Industrial Subjects" },
  { name: "Pattern Drafting", category: "Industrial Subjects" },
  { name: "Practicals", category: "Industrial Subjects" },
  { name: "Quality Hygiene, Safety and Environment (QHSE)", category: "Industrial Subjects" },
  { name: "Quantities & Estimates", category: "Industrial Subjects" },
  { name: "Sewing", category: "Industrial Subjects" },
  { name: "Site Management", category: "Industrial Subjects" },
  { name: "Soils & Mechanics", category: "Industrial Subjects" },
  { name: "Soils and Materials (Lab Tests)", category: "Industrial Subjects" },
  { name: "Surveys", category: "Industrial Subjects" },
  { name: "Technical Drawing", category: "Industrial Subjects" },
  { name: "Technology", category: "Industrial Subjects" },
  { name: "Technology of Materials", category: "Industrial Subjects" },
  { name: "Textile and Hardware Technology", category: "Industrial Subjects" },
  { name: "Work Organization", category: "Industrial Subjects" },
  { name: "Workshop Practicals", category: "Industrial Subjects" }
];

// Helper to dynamically organize subjects based on selected section
const getFilteredSubjects = (section) => {
  const sec = String(section || '').trim().toLowerCase();

  if (sec.includes('commercial')) {
    const commercial = ALL_SUBJECTS_LIST.filter(s => s.category === "Commercial Subjects");
    const general = ALL_SUBJECTS_LIST.filter(s => s.category === "General Core Subjects");
    return [...commercial, ...general];
  }

  if (sec.includes('industrial')) {
    const industrial = ALL_SUBJECTS_LIST.filter(s => s.category === "Industrial Subjects");
    const general = ALL_SUBJECTS_LIST.filter(s => s.category === "General Core Subjects");
    return [...industrial, ...general];
  }

  if (sec.includes('both')) {
    return ALL_SUBJECTS_LIST;
  }

  return ALL_SUBJECTS_LIST.filter(s => s.category === "General Core Subjects");
};
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteBanner, setDeleteBanner] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [masterClass, setMasterClass] = useState('');
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [isEditPersonnelModalOpen, setIsEditPersonnelModalOpen] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTeacherForLogs, setSelectedTeacherForLogs] = useState(null);
  const [fetchedLessonLogs, setFetchedLessonLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

// --- MEMBER REGISTRATION INITIAL DRAFT RECOVERY ---
  const getInitialDraft = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draft_member_registration');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.warn(e); }
      }
    }
    return {};
  };


const [isMarkEntryAuthorized, setIsMarkEntryAuthorized] = useState(true);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  const handleToggleLock = async () => {
    const activeSchoolId = activeSchool?.id || activeSchool?.school_id || (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null);
    const selectedTeacherId = selectedTeacherModal?.id || selectedTeacherForLogs?.id;

    if (!selectedTeacherId || !activeSchoolId) return;

    setIsTogglingLock(true);
    const newLockState = isMarkEntryAuthorized; // If currently authorized, new lock state is true

    const success = await toggleTeacherLockStatus(selectedTeacherId, activeSchoolId, newLockState);
    if (success) {
      setIsMarkEntryAuthorized(!newLockState);
    }
    setIsTogglingLock(false);
  };
  // Cumulative progressive calculation from actual taught logs
  const actualTaughtLogs = fetchedLessonLogs?.filter(
    (l) => l.lesson_content && l.lesson_content !== 'EMPTY' && l.lesson_content.trim() !== ''
  ) || [];

  const completedLogsCount = actualTaughtLogs.length;

  const totalMinutesTaught = actualTaughtLogs.reduce((acc, log) => {
    // 1. Check all log properties
    const minutesFromLog = 
      Number(log.period_duration_minutes) || 
      Number(log.duration_minutes) || 
      Number(log.duration) || 
      (Number(log.duration_hours) ? Number(log.duration_hours) * 60 : 0) || 
      (Number(log.hours_taught) ? Number(log.hours_taught) * 60 : 0);

    // 2. Check all assignment properties
    const minutesFromAssignment = 
      Number(selectedTeacherForLogs?.period_duration) || 
      Number(selectedTeacherForLogs?.duration_minutes) || 
      (Number(selectedTeacherForLogs?.assigned_hours) ? Number(selectedTeacherForLogs.assigned_hours) * 60 : 0) || 
      (Number(selectedTeacherForLogs?.weekly_hours) ? Number(selectedTeacherForLogs.weekly_hours) * 60 : 0) || 
      (Number(selectedTeacherForLogs?.periods_per_week) ? Number(selectedTeacherForLogs.periods_per_week) * 60 : 0);

    // 3. Fallback to standard MINSEC period (50 mins) if no database duration exists
    const resolvedMinutes = minutesFromLog || minutesFromAssignment || 50;

    return acc + resolvedMinutes;
  }, 0);

  const totalHoursTaught = (totalMinutesTaught / 60).toFixed(1);

  // Supervisor Remarks State
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [tempRemarkText, setTempRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  
  // Save Supervisor Remark directly to Supabase
  const handleSaveSupervisorRemark = async (logId) => {
    if (!tempRemarkText.trim()) return;
    setSavingRemark(true);
    
    const currentSchoolId = selectedTeacherForLogs?.school_id || (typeof schoolId !== 'undefined' ? schoolId : null) || (typeof userSchoolId !== 'undefined' ? userSchoolId : null) || activeSchool?.school_id || activeSchool?.id;
    try {
      const { error } = await supabase
        .from('lesson_logs')
        .update({ supervisor_remark: tempRemarkText.trim() })
        .eq('id', logId)
        .eq('school_id', currentSchoolId);

      if (error) throw error;

      // Update local state immediately so UI reflects the change
      setFetchedLessonLogs((prev) =>
        prev.map((item) =>
          item.id === logId ? { ...item, supervisor_remark: tempRemarkText.trim() } : item
        )

      );
      setEditingRemarkId(null);
      setTempRemarkText("");
    } catch (err) {
      alert("Failed to save remark: " + err.message);
    } finally {
      setSavingRemark(false);
    }
  };
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Bulk Multi-Track Report Card States
  const [bulkModalState, setBulkModalState] = useState({
    isOpen: false,
    trackType: '', // 'general' | 'commercial' | 'industrial'
    activeClass: '',
    activeTrade: 'ALL',
    activeTerm: 'Term 1'
  });

  const handleOpenBulkReportCards = (trackType, targetClass, targetTrade = 'ALL', targetTerm = 'Term 1') => {
    setBulkModalState({
      isOpen: true,
      trackType,
      activeClass: targetClass,
      activeTrade: targetTrade,
      activeTerm: targetTerm
    });
  };

  const handleCloseBulkModal = () => {
    setBulkModalState((prev) => ({ ...prev, isOpen: false }));
  };
  const [schoolRegion, setSchoolRegion] = useState('');
  const [academicYearStartDate, setAcademicYearStartDate] = useState('');
  const [academicYearEndDate, setAcademicYearEndDate] = useState('');
  const calculateAcademicWeek = (startDateStr, logDateStr = new Date()) => {
  if (!startDateStr) return 1;

  const start = new Date(startDateStr);
  const logDate = new Date(logDateStr);

  // Normalize times to midnight for clean day differences
  start.setHours(0, 0, 0, 0);
  logDate.setHours(0, 0, 0, 0);

  const diffInMs = logDate - start;
  if (diffInMs < 0) return 1; // Default to Week 1 if date is before start date

  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffInDays / 7) + 1;
};
  // Single Source of Truth subscriptions from Context
  const { 
    masterSections, 
    getClassLevelsBySection, 
    getSeriesOrTrades 
  } = useAcademicConfigs();

  // Compute dynamic registration lists with fallbacks for form state names
  const activeSection = selectedSection || '';
  const activeClass = masterClass || '';

  const registrationClasses = getClassLevelsBySection(activeSection);
  const registrationTrades = getSeriesOrTrades(activeSection, activeClass);
  useEffect(() => {
    if (!selectedTeacherForLogs) return;

  const loadTeacherLogs = async () => {
    setIsLoadingLogs(true);
    
    const rawTeacherName = selectedTeacherForLogs?.teacher_name || selectedTeacherForLogs?.name || selectedTeacherForLogs?.teacher || '';
    const teacherName = typeof rawTeacherName === 'string' ? rawTeacherName.trim() : String(rawTeacherName?.name || rawTeacherName || '').trim();
    const teacherId = selectedTeacherForLogs?.teacher_id || selectedTeacherForLogs?.id || null;
    const subjectName = String(selectedTeacherForLogs?.subject || selectedTeacherForLogs?.subject_name || '').trim();
    const targetClass = String(selectedTeacherForLogs?.classLevel || selectedTeacherForLogs?.class_level || '').trim();
    const cacheKey = `nsuh_logs_${teacherId || teacherName}_${subjectName}`;

    try {
      if (navigator.onLine) {
        let query = supabase
          .from('lesson_logs')
          .select('*')
          .ilike('subject', subjectName);

        if (teacherId && teacherName) {
          query = query.or(`teacher_id.eq.${teacherId},teacher_name.ilike.%${teacherName}%`);
        } else if (teacherName) {
          query = query.ilike('teacher_name', `%${teacherName}%`);
        } else if (teacherId) {
          query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching lesson logs:', error);
        }

        if (data && data.length > 0) {
          let finalLogs = data;
          if (targetClass) {
            const filtered = data.filter(log => {
              const logClass = (log.classLevel || log.class_level || '').trim().toLowerCase();
              return logClass === targetClass.toLowerCase() || logClass.includes(targetClass.toLowerCase());
            });
            if (filtered.length > 0) finalLogs = filtered;
          }

          setFetchedLessonLogs(finalLogs);
          localStorage.setItem(cacheKey, JSON.stringify(finalLogs));
          setIsLoadingLogs(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Online fetch failed, checking offline cache:', err);
    }

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setFetchedLessonLogs(JSON.parse(cached));
      } catch (e) {
        setFetchedLessonLogs([]);
      }
    } else {
      setFetchedLessonLogs([]);
    }
    setIsLoadingLogs(false);
  };

    loadTeacherLogs();
  }, [selectedTeacherForLogs]);
const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [schoolMotto, setSchoolMotto] = useState('');
  const [schoolRules, setSchoolRules] = useState('');
  const [rulesFileUrl, setRulesFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [registrationMode, setRegistrationMode] = useState('single'); // 'single' or 'bulk'
  const [teacherSubTab, setTeacherSubTab] = useState('assigned');
  const handleRulesFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Enforce 0.5 MB size limit (500 KB)
    if (file.size > 500 * 1024) {
      alert("File size exceeds 0.5MB limit. Please upload a smaller document.");
      e.target.value = '';
      return;
    }

    // Validate file type (PDF or Word documents)
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file format. Please upload a PDF or Word document (.pdf, .doc, .docx).");
      e.target.value = '';
      return;
    }

    try {
      const currentSchoolId = activeSchool?.id || activeSchool?.school_id || session?.user?.user_metadata?.school_id;
      if (!currentSchoolId) {
        alert("School ID missing. Please refresh or select a school.");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `school_rules/${currentSchoolId}_rules.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      setRulesFileUrl(data.publicUrl);
      alert("Rules document uploaded successfully!");
    } catch (err) {
      alert("Error uploading document: " + err.message);
    }
  };
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsedData, setBulkParsedData] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  

  // Generates a pre-formatted Excel template inheriting active class context
  const handleDownloadBulkTemplate = async () => {
    try {
      const XLSX = await import('xlsx');

      const sampleData = [
        {
          fullName: "Taku Cecilia",
          gender: "Female",
          dob: "2009-05-14",
          residence: "Mankon",
          guardian_name: "Parent",
          guardian_phone: "682491189"
        },
        {
          fullName: "Fuh Gerald",
          gender: "Male",
          dob: "2008-08-20",
          residence: "Ntambeng",
          guardian_name: "Parent",
          guardian_phone: "682491189"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registration");

      const cleanClassName = (classLevel || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(workbook, `${cleanClassName}_Bulk_Registration_Template.xlsx`);
    } catch (error) {
      alert("Failed to download template. Please try again.");
    }
  };

  // Read uploaded Excel file and parse rows into state
  const handleParseBulkFile = async () => {
    if (!bulkFile) {
      alert("Please select an Excel file first.");
      return;
    }

    setIsProcessingBulk(true);

    try {
      const XLSX = await import('xlsx');
      const data = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

      if (!jsonRows || jsonRows.length === 0) {
        alert("The uploaded file contains no data.");
        setIsProcessingBulk(false);
        return;
      }

      const normalizedData = jsonRows.map(row => normalizeStudentRow(row));
      setBulkParsedData(normalizedData);
      alert(`Successfully parsed ${normalizedData.length} student records. Ready for preview!`);
    } catch (err) {
      alert("Error parsing file: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };


  // Check if a student already exists in the system
const isDuplicateStudent = (newStudent, existingStudentsList = []) => {
  if (!newStudent || !Array.isArray(existingStudentsList) || existingStudentsList.length === 0) return false;

  const newName = String(newStudent.fullName || newStudent.full_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const newDob = String(newStudent.dob || newStudent.date_of_birth || '').trim();
  const newPhone = String(newStudent.guardian_phone || newStudent.phone || newStudent.guardianPhone || '').replace(/\D/g, '');

  if (!newName) return false;

  return existingStudentsList.some(student => {
    if (!student) return false;

    const existingName = String(student.full_name || student.fullName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const existingDob = String(student.dob || student.date_of_birth || '').trim();
    const existingPhone = String(student.guardian_phone || student.phone || student.guardianPhone || '').replace(/\D/g, '');

    const sameName = newName === existingName;
    const sameDob = newDob && existingDob && newDob === existingDob;
    const samePhone = newPhone && existingPhone && newPhone === existingPhone;

    // Match if same Name AND (same DOB OR same Phone OR no DOB/Phone present to compare)
    return sameName && (sameDob || samePhone || (!newDob && !newPhone) || (!existingDob && !existingPhone));
  });
};

 // Helper to normalize data and calculate age dynamically
  const normalizeStudentRow = (row) => {
    // 1. Extract Full Name safely
const studentName = row["Full Name"] || row["FULL NAME"] || row["Full Name "] || row.fullName || row.full_name || "";
    // 2. Extract and format Date of Birth
    const rawDob = row.dob || row.date_of_birth || row["Date of Birth"] || row["DOB"] || "";
    let birthDateStr = "";

    if (rawDob instanceof Date && !isNaN(rawDob.getTime())) {
      birthDateStr = rawDob.toISOString().split('T')[0];
    } else if (typeof rawDob === 'string' && rawDob.trim() !== '') {
      const cleanDob = rawDob.trim();
      const parts = cleanDob.split(/[\/\-\.]/);
      
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          birthDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY
          birthDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[2].length === 2) {
          // DD/MM/YY (e.g. 14/05/10 -> 2010-05-14)
          const fullYear = parseInt(parts[2], 10) > 30 ? `19${parts[2]}` : `20${parts[2]}`;
          birthDateStr = `${fullYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else {
        birthDateStr = cleanDob;
      }
    } else if (typeof rawDob === 'number') {
      // Excel serial date integer conversion
      const excelEpoch = new Date(1899, 11, 30);
      const parsedDate = new Date(excelEpoch.getTime() + rawDob * 86400000);
      if (!isNaN(parsedDate.getTime())) {
        birthDateStr = parsedDate.toISOString().split('T')[0];
      }
    }

    // 3. Calculate Age
    let calculatedAge = row.age || "";
    if (birthDateStr) {
      const birthYear = parseInt(birthDateStr.split('-')[0], 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear)) {
        calculatedAge = String(currentYear - birthYear);
      }
    }

    const guardianPhone = String(row.guardian_phone || row["Guardian Phone"] || row.phone || "");
return {
  fullName: studentName,
  gender: row.gender || row["Gender"] || "",
  dob: birthDateStr,
  age: calculatedAge,
  residence: row.residence || row["Residence"] || "",
  guardian_name: row.guardian_name || row["Guardian Name"] || "Parent",
  guardian_phone: guardianPhone,
  academic_year: getCurrentAcademicYear(),
};
  };

  // Process rows and update uploadProgress percentage dynamically
const handleExecuteBulkImport = async () => {
    if (!bulkParsedData || bulkParsedData.length === 0) {
      alert("No student data available to import.");
      return;
    }

    setIsProcessingBulk(true);
    setUploadProgress(0);

    const targetSchoolId = activeSchool?.school_id || activeSchool?.id;
    const schoolName = activeSchool?.school_name || activeSchool?.name || "School";
    const targetClass = classLevel || "Form 1A (F1A)";
    const targetSection = section || "General Education";
    const currentAcademicYear = getCurrentAcademicYear();

    const total = bulkParsedData.length;
    let successCount = 0;
    let skippedNames = [];

    for (let i = 0; i < total; i++) {
      const rawStudent = bulkParsedData[i];
      const normalized = normalizeStudentRow(rawStudent);

      // Skip if student already exists in local state
      if (isDuplicateStudent(normalized, studentsList)) {
        console.warn(`Skipping duplicate student: ${normalized.fullName}`);
        skippedNames.push(normalized.fullName);
        setUploadProgress(Math.round(((i + 1) / total) * 100));
        continue;
      }

      // Generate unique student ID with random 2-digit suffix
      const generatedCode = generateStudentId(
        schoolName,
        targetSection,
        normalized.fullName,
        targetClass,
        normalized.age,
        normalized.gender
      );

      const studentPayload = {
        ...normalized,
        unique_code: generatedCode,
        school_id: targetSchoolId,
        academic_year: currentAcademicYear,
        section: targetSection,
        classLevel: targetClass,
        trades_series: (typeof tradeSeries !== 'undefined' && tradeSeries) ? tradeSeries : ((typeof masterClass !== 'undefined' && masterClass) ? masterClass : "N/A")
      };

      const { data, error } = await supabase.from('students').insert([studentPayload]).select();

      if (error) {
        console.error("Supabase insert error for row", i, error?.message || error?.details || JSON.stringify(error));
      } else {
        successCount++;
        if (data && data.length > 0 && typeof setStudentsList === 'function') {
          setStudentsList(prev => [data[0], ...prev]);
        }
      }

      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    // Display exact warning message if duplicates are skipped
    let feedbackMsg = "";
    if (skippedNames.length > 0) {
      const formattedNames = skippedNames.join(", ");
      feedbackMsg = `It seems like "${formattedNames}" ${skippedNames.length === 1 ? 'has' : 'have'} already been registered. Skipped existing student(s) and uploaded new names (${successCount} registered successfully).`;
    } else {
      feedbackMsg = `Bulk Import Complete! ${successCount} of ${total} students registered successfully.`;
    }

    if (typeof setSuccessMessage === 'function') {
      setSuccessMessage(feedbackMsg);
    } else if (typeof setMessage === 'function') {
      setMessage(feedbackMsg);
    } else {
      alert(feedbackMsg);
    }

    if (typeof fetchStudents === 'function') await fetchStudents();
    setIsProcessingBulk(false);
  };


const handleSaveSchoolDetails = async (e) => {
    if (e) e.preventDefault();

    try {
      const targetSchoolId = activeSchool?.school_id || activeSchool?.id;

      if (!targetSchoolId) {
        if (typeof setDeleteBanner === 'function') {
          setDeleteBanner({ type: 'error', message: 'Error: Active school ID not found.' });
        }
        return;
      }

      const payload = {
        school_id: targetSchoolId,
        name: activeSchool?.name || '',logo_url: typeof schoolLogo !== 'undefined' ? schoolLogo : (activeSchool?.logo_url || null),
        motto: typeof schoolMotto !== 'undefined' ? schoolMotto : (activeSchool?.motto || ''),
        region: typeof schoolRegion !== 'undefined' ? schoolRegion : (activeSchool?.region || ''),
        contact_line: typeof schoolContact !== 'undefined' ? schoolContact : (activeSchool?.contact_line || ''),
        official_email: typeof schoolEmail !== 'undefined' ? schoolEmail : (activeSchool?.official_email || ''),
        rules_and_regulations: typeof schoolRules !== 'undefined' ? schoolRules : (activeSchool?.rules_and_regulations || ''),
        rules_file_url: typeof rulesFileUrl !== 'undefined' ? rulesFileUrl : (activeSchool?.rules_file_url || ''),
        academic_year_start_date: typeof academicYearStartDate !== 'undefined' ? academicYearStartDate : null,
        academic_year_end_date: typeof academicYearEndDate !== 'undefined' ? academicYearEndDate : null,
        updated_at: new Date().toISOString()
      };

      // Perform upsert
      let { error } = await supabase
        .from('school_details')
        .upsert(payload, { onConflict: 'school_id' });

      // Retry once automatically if network flickered
      if (error && error.message?.includes('Failed to fetch')) {
        await new Promise((res) => setTimeout(res, 500));
        const retryResult = await supabase
          .from('school_details')
          .upsert(payload, { onConflict: 'school_id' });
        error = retryResult.error;
      }

      if (error) {
        if (typeof setDeleteBanner === 'function') {
          setDeleteBanner({ type: 'error', message: `Save error: ${error.message}` });
        }
      } else {
        if (typeof setDeleteBanner === 'function') {
          setDeleteBanner({ type: 'success', message: 'School parameters updated successfully!' });
          setTimeout(() => setDeleteBanner(null), 4000);
        }
      }
    } catch (err) {
      if (typeof setDeleteBanner === 'function') {
        setDeleteBanner({ type: 'error', message: `Network timeout. Please click save again.` });
      }
    }
  };
const handleEditTeacherSchedule = (teacher) => {
  setTeacherToEdit(teacher);
  setIsEditingSchedule(true);
  if (teacher?.name || teacher?.full_name) setTeacherName(teacher.name || teacher.full_name);
  if (teacher?.phone || teacher?.phone_number || teacher?.contact) setTeacherPhone(teacher.phone || teacher.phone_number || teacher.contact);
  if (teacher?.email) setTeacherEmail(teacher.email);
  if (teacher?.section) setSelectedSection(teacher.section);
  
  // Hydrate assigned subjects and schedule configurations
  if (teacher?.subjects && Array.isArray(teacher.subjects)) {
    setSelectedTeacherSubjects(teacher.subjects);
  }
  if (teacher?.schedules) {
    setSchedulerData(teacher.schedules);
  }
  // Close preview modal & switch tab
  setSelectedTeacherModal(null);
  setActiveTab('teachers');
};
const [phoneError, setPhoneError] = useState("");
  const [selectedSeries, setSelectedSeries] = useState('');
  const [activeSchool, setActiveSchool] = useState(null);
 useEffect(() => {
    const hydrateActiveSchool = async () => {
      // 1. Read flat keys directly from localStorage
      const directSchoolId = localStorage.getItem('active_school_id');
const rawName = localStorage.getItem('active_school_name');
const directSchoolName = (rawName && rawName.toLowerCase() !== 'assigned school') ? rawName : null;
      // 2. Read nested JSON keys if present
      const cachedSchoolObj = localStorage.getItem('activeSchool') || localStorage.getItem('selectedSchool');
      let parsedSchoolObj = null;
      if (cachedSchoolObj) {
        try { parsedSchoolObj = JSON.parse(cachedSchoolObj); } catch (e) {}
      }

      // 3. Extract potential URL params or subdomains
      const searchParams = new URLSearchParams(window.location.search);
      const urlSchoolParam = searchParams.get('school') || searchParams.get('school_id') || searchParams.get('id');
      const hostname = window.location.hostname;
      const hostParts = hostname.split('.');
      const urlSubdomain = (hostParts.length > 2 && hostParts[0] !== 'www') ? hostParts[0] : null;

      // Prioritize available ID/name target
      const targetId = directSchoolId || parsedSchoolObj?.id || urlSchoolParam;
      const targetName = directSchoolName || parsedSchoolObj?.name || urlSubdomain;

    // Instant hydration if we already have an ID
  if (targetId) {
  const { data, error } = await supabase
    .from('assigned_schools')
    .select('*')
    .eq('school_id', targetId)
    .maybeSingle();

    if (data && !error) {
      const realName = data.institution_name || data.name || data.school_name;
      const updatedSchool = { ...data, name: realName, institution_name: realName };
      setActiveSchool(updatedSchool);
      localStorage.setItem('active_school_id', targetId);
      localStorage.setItem('active_school_name', realName);

      // Fetch school details before returning
      const { data: detailsData } = await supabase
        .from('school_details')
        .select('logo_url, motto, region, contact_line, official_email, address_location, rules_and_regulations, rules_file_url, academic_year_start_date, academic_year_end_date')
        .eq('school_id', targetId)
        .maybeSingle();

      if (detailsData) {
        if (detailsData.logo_url) setSchoolLogo(detailsData.logo_url);
        if (detailsData.motto) setSchoolMotto(detailsData.motto);
        if (detailsData.region) setSchoolRegion(detailsData.region);
        if (detailsData.contact_line) setSchoolContact(detailsData.contact_line);
        if (detailsData.official_email) setSchoolEmail(detailsData.official_email);
        if (detailsData.address_location && typeof setSchoolLocation !== 'undefined') setSchoolLocation(detailsData.address_location);
        if (detailsData.rules_and_regulations && typeof setSchoolRules !== 'undefined') setSchoolRules(detailsData.rules_and_regulations);
        if (detailsData.rules_file_url && typeof setRulesFileUrl !== 'undefined') setRulesFileUrl(detailsData.rules_file_url);
        if (detailsData.academic_year_start_date) setAcademicYearStartDate(detailsData.academic_year_start_date);
        if (detailsData.academic_year_end_date) setAcademicYearEndDate(detailsData.academic_year_end_date);
      // Sync latest from network back into localStorage
        if (targetId) {
        localStorage.setItem(`school_dates_${targetId}`, JSON.stringify({
        academicYearStartDate: detailsData.academic_year_start_date || '',
        academicYearEndDate: detailsData.academic_year_end_date || ''
  }));
}
      }

      return;
    }
  }
// Dynamic fallback: Read directly from authenticated session if local targets are missing
  if (!targetId && !targetName) {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionSchoolName = session?.user?.user_metadata?.school_name || session?.user?.user_metadata?.assigned_school;
    const sessionSchoolId = session?.user?.user_metadata?.school_id || session?.user?.id;

    if (sessionSchoolName) {
      setActiveSchool({
        id: sessionSchoolId,
        school_id: sessionSchoolId,
        name: sessionSchoolName,
        institution_name: sessionSchoolName
      });
      return;
    }
  }
      // Fallback dynamic database query if only a name/slug target exists
      if (targetName && targetName.toLowerCase() !== 'assigned school') {
        const { data, error } = await supabase
          .from('assigned_schools')
          .select('*')
          .or(`slug.ilike.${encodeURIComponent(targetName)},name.ilike.${encodeURIComponent(targetName)}`)
          .maybeSingle();

        if (data && !error) {
          setActiveSchool(data);
          localStorage.setItem('active_school_id', data.id);
        }
      }
    };

    hydrateActiveSchool();
    setHasMounted(true);
    setShowWelcomeOverlay(true);
  }, []);
// Dynamic state initialization based on active school tenant
const [masterSection, setMasterSection] = useState(() => {
  const schoolType = activeSchool?.school_type || activeSchool?.section || '';
  if (schoolType.includes('Commercial')) return 'Technical Commercial (STT)';
  if (schoolType.includes('Industrial')) return 'Technical Industrial (IND)';
  return 'General Education';
});

// Auto-sync if activeSchool loads asynchronously after initial mount
useEffect(() => {
  const schoolType = activeSchool?.school_type || activeSchool?.section || '';
  if (schoolType.includes('Commercial')) {
    setMasterSection('Technical Commercial (STT)');
  } else if (schoolType.includes('Industrial')) {
    setMasterSection('Technical Industrial (IND)');
  }
}, [activeSchool]);
 // TWO-LEVEL VERIFICATION FUNCTION
const verifySchoolIdentity = async (schoolId, expectedSchoolName) => {
    if (!schoolId || !expectedSchoolName) {
        console.warn("Security Notice: School ID or Name not available yet.");
        return false;
    }

    const { data, error } = await supabase
        .from('assigned_schools')
        .select('school_id, name')
        .eq('school_id', schoolId)
        .single();

    if (error || !data) {
        console.warn("Security Notice: School ID not found in assigned_schools.");
        return false;
    }

    if (expectedSchoolName && expectedSchoolName.trim().toLowerCase() !== 'assigned school') {
        if (data.name.trim().toLowerCase() !== expectedSchoolName.trim().toLowerCase()) {
            console.warn("Security Notice: School Name mismatch.");
            return false;
        }
    }

    return true;
};

 const [printSection, setPrintSection] = useState('All');
 const [printClass, setPrintClass] = useState('All');
 const [printTrade, setPrintTrade] = useState('All');
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedStudent, setSelectedStudent] = useState(null);
 const [selectedTeacherModal, setSelectedTeacherModal] = useState(null); useEffect(() => {
 const activeSchoolId = activeSchool?.id || activeSchool?.school_id || (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null);
 const selectedTeacherId = selectedTeacherModal?.id || selectedTeacherForLogs?.id;

    if (selectedTeacherId && activeSchoolId) {
      getTeacherLockStatus(selectedTeacherId, activeSchoolId).then((isLocked) => {
        setIsMarkEntryAuthorized(!isLocked);
      });
    }
  }, [selectedTeacherModal, selectedTeacherForLogs, activeSchool]);

const [teacherPhotoPreview, setTeacherPhotoPreview] = useState(null);
  // Real Phone Time State
  const [currentTime, setCurrentTime] = useState(null);
  const [schedulerData, setSchedulerData] = useState({});

  const [editingStudent, setEditingStudent] = useState(null);
const [editFormData, setEditFormData] = useState({});
const [studentToDelete, setStudentToDelete] = useState(null);
const handleRowClick = (student) => {
    setEditingStudent(student);
    setEditFormData({
      ...student,
      medical_history: student.medical_history || ''
    });
  };

 const handleSaveStudent = async (e) => {
    e.preventDefault();
// Strict validation guard using single source of truth trade arrays
const targetSec = (editFormData?.section || '').toLowerCase();
const chosenTrade = editFormData?.trades_series || editFormData?.series || '';

if (targetSec.includes('commercial') && (!chosenTrade || !COMMERCIAL_TRADE_SERIES.includes(chosenTrade))) {
  alert("Validation Error: Please select a valid Technical Commercial trade.");
  return;
}

if (targetSec.includes('industrial') && (!chosenTrade || !INDUSTRIAL_TRADE_SERIES.includes(chosenTrade))) {
  alert("Validation Error: Please select a valid Technical Industrial trade.");
  return;
}

if (!editFormData?.residence || !editFormData.residence.trim()) {
  alert("Validation Error: Quarter / Residence is a mandatory field.");
  return;
}
    // Sanitize trades_series so lower forms are strictly 'N/A'
  const currentClass = editFormData?.classLevel || editFormData?.class_name || '';
  const currentSeries = editFormData?.trades_series || editFormData?.series || '';
  const payloadToSave = {
    ...editFormData,
    trades_series: GENERAL_LOWER_CLASSES.includes(currentClass) ? 'N/A' : (currentSeries || 'N/A')
  };

  // 1. Save changes to Supabase database
  const { error } = await supabase
    .from('students')
    .eq('school_id', currentSchoolId)
    .update(payloadToSave)
    .eq('id', editFormData.id);

    if (error) {
      alert("Error saving student to Supabase: " + error.message);
      return;
    }

    // 2. Update UI locally
    setStudentsList((prev) =>
      prev.map((s) => (s.id === editFormData.id ? payloadToSave : s))
    );
    setEditingStudent(null);
  };
 // Opens the delete confirmation modal
const promptDeleteStudent = (student, e) => {
  if (e && e.preventDefault) e.preventDefault();
  if (e && e.stopPropagation) e.stopPropagation();
  setStudentToDelete(student);
};

// Performs the actual deletion when confirmed in the modal
const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
setIsDeleting(true);
   // 1. HARD SAFETY GAURDS & MULTI-TENANT CONTEXT
    const studentId = studentToDelete?.id;
    const studentCode = studentToDelete?.unique_code || studentToDelete?.matricule;
    const currentSchoolId = activeSchool?.id || studentToDelete?.school_id;

    // Reject operation if primary key or tenant identity is missing
    if (!studentId) {
      alert("Safety Lock: Cannot delete record without a valid UUID primary key.");
      setIsDeleting(false);
      return;
    }

    if (!currentSchoolId) {
      alert("Multi-Tenant Lock: Operation aborted because school session context is missing.");
      return;
    }

    // 2. ATOMIC MULTI-TENANT DELETION QUERY
    // Strictly targets the primary key ID AND the specific school_id tenant
    let query = supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('school_id', currentSchoolId);

    // Explicitly add unique_code matching if present on the object
    if (studentCode) {
      query = query.eq('unique_code', studentCode);
    }

    const { error } = await query;

    if (error) {
      alert("Error deleting student from database: " + error.message);
      setIsDeleting(false);
      return;
    }

    // 3. PERMANENT LOCAL UI STATE PURGE
    setStudentsList((prev) => prev.filter((s) => s.id !== studentId));
    setStudentToDelete(null);
    changeTab('students');
    setIsDeleting(false);
  };
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  
  }, []);
useEffect(() => {
    const fetchActiveSchool = async () => {
      // 1. Get authenticated user session directly from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Query assigned_schools strictly for this authenticated user's email
      const { data: schools, error } = await supabase
        .from('assigned_schools')
        .select('*')
        .eq('admin_email', user.email);

      if (!error && schools && schools.length > 0) {
        const active = schools[0];
        
        // 3. Set active session context in PostgreSQL
        await supabase.rpc('set_active_school', { school_id: active.school_id });

        // 4. Populate React state memory directly (No LocalStorage)
setSchoolName(active.name);
setActiveSchool(active);
setCurrentSchoolId(active.school_id || active.id);

console.log("FETCH ACTIVE SCHOOL RESULT ->", active);
console.log(
    "ACTIVE SCHOOL ID SET ->",
    active.school_id || active.id
);

if (!active.has_onboarded) {
    setShowWelcomeOverlay(true);
}
      }
    };

    fetchActiveSchool();
  }, []);
  // Auto-fetch students from Supabase on load/refresh
 // Auto-fetch students strictly using in-memory activeSchool state
  useEffect(() => {
    const fetchStudentsFromSupabase = async () => {
      // 1. Guard against empty state while activeSchool is loading
      const currentSchoolId = activeSchool?.school_id || activeSchool?.id;
      const currentSchoolName = activeSchool?.name || activeSchool?.['school-name'] || activeSchool?.schoolName || '';

      if (!currentSchoolId || !currentSchoolName) {
        return; // Wait silently until fetchActiveSchool populates state
      }
// ⚡ INSTANT OFFLINE LOAD
      const studentCacheKey = `nsuh_students_${currentSchoolId}`;
      const cachedStudents = localStorage.getItem(studentCacheKey);
      if (cachedStudents) {
        setStudentsList(JSON.parse(cachedStudents));
      }
      if (!navigator.onLine) return;
      // ⚡ INSTANT OFFLINE TEACHER LOAD
      const teacherCacheKey = `nsuh_teachers_${currentSchoolId}`;
      const cachedTeachers = localStorage.getItem(teacherCacheKey);
      if (cachedTeachers) {
        setTeachersList(JSON.parse(cachedTeachers));
      }
      // 2. Run Two-Level Security Check
        const isVerified = await verifySchoolIdentity(currentSchoolId, currentSchoolName);
        console.log("VERIFY DEBUG -> isVerified:", isVerified, "ID:", currentSchoolId, "Name:", currentSchoolName);

        if (!isVerified) {
          setStudentsList([]);
          return;
        }
      // 3. Fetch students strictly belonging to this school_id
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', currentSchoolId)
        .order('id', { ascending: false });

      if (!error && data) {
        setStudentsList(data);
        localStorage.setItem(`nsuh_students_${currentSchoolId}`, JSON.stringify(data));
      }
    };

    if (activeSchool?.school_id) {
      fetchStudentsFromSupabase();
    }
  }, [activeSchool?.school_id]);
  // --- Registration Form State with LocalStorage Draft Auto-Recovery ---
  const getRegistrationDraft = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draft_member_registration');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.warn(e); }
      }
    }
    return {};
  };

  const draft = getRegistrationDraft();
  // Registration Form State
  const [regRole, setRegRole] = useState(draft.regRole || 'student');
  
  // Common Member / Student Form Credentials
  const [fullName, setFullName] = useState(draft.fullName || '');
  const [phone, setPhone] = useState(draft.phone || '');
  const [residence, setResidence] = useState(draft.residence || '');
  const [picturePreview, setPicturePreview] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const [schoolLogo, setSchoolLogo] = useState(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Student Specific State Fields
  const [section, setSection] = useState(draft.section || 'General Education'); 
  const [classLevel, setClassLevel] = useState(draft.classLevel || GENERAL_CLASSES_CATALOG[0]);
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // --- Auto-save registration draft on every input change ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentDraft = {
        regRole,
        fullName,
        phone,
        residence,
        dob,
        guardianName,
        guardianPhone,
        section,
        classLevel
      };
      localStorage.setItem('draft_member_registration', JSON.stringify(currentDraft));
    }
  }, [regRole, fullName, phone, residence, dob, guardianName, guardianPhone, section, classLevel]);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [selectedTechnicalSubject, setSelectedTechnicalSubject] = useState(
  ALL_SUBJECTS_LIST.find((s) => s.category === "Industrial Subjects")?.name || ''
);
  // Other School Personnel Staff Registration Fields (Bursar, Supervisor, Discipline Master, Principal)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffResidence, setStaffResidence] = useState('');

  // Teacher Assignment State Fields (Classes added dynamically per subject, no period field)
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherResidence, setTeacherResidence] = useState('');
  const [teacherSection, setTeacherSection] = useState('General');
  
  // Per-Subject Schedule Configuration State (mapping subject -> list of class schedules with day, startTime, endTime)
  const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState([]);
  const [subjectClassSchedules, setSubjectClassSchedules] = useState({});
// 1. Restore temporary teacher registration draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('pending_teacher_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.teacherName) setTeacherName(parsed.teacherName);
          if (parsed.teacherPhone) setTeacherPhone(parsed.teacherPhone);
          if (parsed.teacherEmail) setTeacherEmail(parsed.teacherEmail);
          if (parsed.teacherResidence) setTeacherResidence(parsed.teacherResidence);
          if (parsed.teacherSection) setTeacherSection(parsed.teacherSection);
          if (parsed.selectedTeacherSubjects) setSelectedTeacherSubjects(parsed.selectedTeacherSubjects);
          if (parsed.subjectClassSchedules) setSubjectClassSchedules(parsed.subjectClassSchedules);
          if (parsed.teacherPhotoPreview) setTeacherPhotoPreview(parsed.teacherPhotoPreview);
        } catch (e) {
          console.error('Draft restore failed:', e);
        }
      }
    }
  }, []);

  // 2. Auto-save form draft whenever any input changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draft = {
        teacherName,
        teacherPhone,
        teacherEmail,
        teacherResidence,
        teacherSection,
        selectedTeacherSubjects,
        subjectClassSchedules,
        teacherPhotoPreview
      };
      localStorage.setItem('pending_teacher_draft', JSON.stringify(draft));
    }
  }, [
    teacherName,
    teacherPhone,
    teacherEmail,
    teacherResidence,
    teacherSection,
    selectedTeacherSubjects,
    subjectClassSchedules,
    teacherPhotoPreview
  ]);
  // Application Data States
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [successPopup, setSuccessPopup] = useState(null);
  const [activeTeacherResult, setActiveTeacherResult] = useState(null);
  const [activePersonnelResult, setActivePersonnelResult] = useState(null);
  const [schoolContact, setSchoolContact] = useState(activeSchool?.phone || activeSchool?.contact_phone || '');
  const [schoolEmail, setSchoolEmail] = useState(activeSchool?.email || activeSchool?.contact_email || '');
  const [schoolLocation, setSchoolLocation] = useState(activeSchool?.location || activeSchool?.region || '');

// Unified lightning-fast data loader for students and teachers
  useEffect(() => {
    const fetchAllSchoolData = async () => {
      let schoolIdToUse = typeof activeSchool === 'object' ? (activeSchool?.id || activeSchool?.school_id) : activeSchool;
      if (!schoolIdToUse || typeof schoolIdToUse !== 'string' || schoolIdToUse.includes(' ')) {
        schoolIdToUse = localStorage.getItem('school_id');
      }

      if (!schoolIdToUse) return;

      const studentCacheKey = `nsuh_students_${schoolIdToUse}`;
      const teacherCacheKey = `nsuh_teachers_${schoolIdToUse}`;

      // 1. INSTANT OFFLINE LOAD from cache
      const cachedStudents = localStorage.getItem(studentCacheKey);
      const cachedTeachers = localStorage.getItem(teacherCacheKey);

      if (cachedStudents) {
        try { setStudentsList(JSON.parse(cachedStudents)); } catch (e) {}
      }
      if (cachedTeachers) {
        try { setTeachersList(JSON.parse(cachedTeachers)); } catch (e) {}
      }

      // 2. LIVE FETCH FROM SUPABASE 'teachers' AND 'students' TABLES
      try {
        
const [studentsRes, teachersRes, personnelRes] = await Promise.all([
  supabase.from('students').select('*').eq('school_id', schoolIdToUse),
  supabase.from('teachers').select('*').eq('school_id', schoolIdToUse),
  supabase.from('school_personnel').select('*').eq('school_id', schoolIdToUse)
]);
        // Log as warnings instead of errors so Next.js overlay does not block UI
      if (studentsRes.error) console.warn('Students fetch notice:', studentsRes.error);
      if (teachersRes.error) console.warn('Teachers fetch notice:', teachersRes.error);

        if (studentsRes.data) {
          setStudentsList(studentsRes.data);
          localStorage.setItem(studentCacheKey, JSON.stringify(studentsRes.data));
        }

       if (teachersRes.data) {
        console.log("FETCHED TEACHERS FROM SUPABASE:", teachersRes.data);
        
          // Map teachers targeting teacher_id first, falling back to id if missing
          const formattedTeachers = teachersRes.data.map((t) => ({
            ...t,
            id: t.teacher_id || t.id,
            name: t.name,
            phone: t.contact || t.phone || '',
            email: t.email || '',
            signupLink: t.signup_link || t.signupLink || '',
            schedules: t.schedules || {},
            classLevel: t.classLevel || t.class_level || ''
          }));
         // Filter out duplicate teachers by teacher_id / id
const uniqueTeachers = Array.from(
  new Map(formattedTeachers.map((t) => [t.teacher_id || t.id, t])).values()
);

setTeachersList(uniqueTeachers);

try {
  localStorage.setItem(teacherCacheKey, JSON.stringify(uniqueTeachers));
} catch (e) {
  console.warn('localStorage full, skipped caching teachers:', e);
}
        }
      } catch (err) {
        console.warn('Network offline or slow; using locally cached data.', err);
      }
    };

    fetchAllSchoolData();
    // ⚡ OFFLINE QUEUE AUTO-SYNC ENGINE
    const syncOfflineStudents = async () => {
      const pendingQueue = JSON.parse(localStorage.getItem('nsuh_pending_students') || '[]');
      if (pendingQueue.length === 0) return;

      const schoolIdToUse = localStorage.getItem('school_id');
      if (!schoolIdToUse) return;

      console.log(`Syncing ${pendingQueue.length} offline student(s) to Supabase...`);

      const remainingQueue = [];

      for (const student of pendingQueue) {
        // Enforce 100% multi-tenancy isolation
        const payload = { ...student, school_id: schoolIdToUse };
        
        const { error } = await supabase.from('students').insert([payload]);

        if (error) {
          console.error('Failed to sync student:', student, error);
          remainingQueue.push(student);
        }
      }

      localStorage.setItem('nsuh_pending_students', JSON.stringify(remainingQueue));

      if (remainingQueue.length < pendingQueue.length) {
        console.log('Successfully synced offline students!');
        fetchAllSchoolData(); 
      }
    };

    // Listen for network recovery & sync every 15 seconds
    window.addEventListener('online', syncOfflineStudents);
    const syncInterval = setInterval(syncOfflineStudents, 15000);

    if (navigator.onLine) syncOfflineStudents();

    return () => {
      window.removeEventListener('online', syncOfflineStudents);
      clearInterval(syncInterval);
    };
  }, [activeSchool]);  

  // Auto-fetch other school personnel from Supabase with strict two-level verification
  useEffect(() => {
    const fetchPersonnelFromSupabase = async () => {
      const activeSchoolId = typeof activeSchool === 'object' ? activeSchool?.id || activeSchool?.school_id : activeSchool;
      const schoolName = typeof activeSchool === 'object' ? activeSchool?.name || activeSchool?.school_name : '';
      if (!activeSchoolId || !schoolName) {
        setPersonnelList([]);
        return;
      }

      const isVerified = await verifySchoolIdentity(activeSchoolId, schoolName);
      if (!isVerified) {
        console.warn('School identity verification failed. Loading no personnel data.');
        setPersonnelList([]);
        return;
      }

      const { data, error } = await supabase
        .from('school_personnel')
        .select('*')
        .eq('school_id', activeSchoolId);

      if (error) {
        console.error('Error fetching personnel from Supabase:', error.message);
        setPersonnelList([]);
      } else if (data) {
        const formattedPersonnel = data.map((p) => ({
          ...p,
          id: p.unique_id || p.id,
          phone: p.phone || p.contact,
          signupLink: p.signup_link || p.signupLink,
          role: p.role
        }));
        setPersonnelList(formattedPersonnel);
      }
    };

    fetchPersonnelFromSupabase();
 }, [activeSchool]);
  const changeTab = (tabId) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setNavigationHistory(prev => [...prev, tabId]);
    }
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousTab = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveTab(previousTab);
    }
  };
// Helper: Export current student list to Excel
const handleExportExcel = async () => {
    const XLSX = await import("xlsx");

    const filteredData = studentsList.filter((stu) => {
      // 1. Section Matching (handles Technical Commercial, Industrial, General, etc.)
      if (printSection && printSection !== 'All' && printSection !== 'All Sections') {
        const secVal = (stu.section || '').toLowerCase();
        const selSec = printSection.toLowerCase();
        const matchesSec = secVal.includes(selSec) || selSec.includes(secVal) ||
          (selSec.includes('commercial') && (secVal.includes('commercial') || secVal.includes('STT'))) ||
          (selSec.includes('industrial') && (secVal.includes('industrial') || secVal.includes('IND')));
        if (!matchesSec) return false;
      }

      // 2. Trade/Series Matching
      if (printTrade && printTrade !== 'All' && printTrade !== 'All Trades / Series' && printTrade !== '') {
        const tradeVal = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        const selTrade = printTrade.toLowerCase();
        if (!tradeVal.includes(selTrade) && !selTrade.includes(tradeVal)) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const name = (stu.fullName || stu.fullname || stu.full_name || '').toLowerCase();
        const id = (stu.unique_code || stu.id || stu.student_id || '').toLowerCase();
        const cls = (stu.classLevel || stu.class_level || '').toLowerCase();
        const sec = (stu.section || '').toLowerCase();
        const trd = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !cls.includes(q) && !sec.includes(q) && !trd.includes(q)) return false;
      }
      return true;
    });

  if (filteredData.length === 0) {
    alert("No student records found for the current selection.");
    return;
  }
// 1. Map to clean fields
  const cleanExportData = filteredData.map((stu) => ({
    "Student ID": stu.unique_code || stu.id || '',
    "Full Name": stu.fullName || stu.fullname || stu.full_name || '',
    "Section": stu.section || '',
    "Class Level": stu.classLevel || stu.class_level || '',
    "Trade / Series": stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || 'N/A',
    "Gender": stu.gender || '',
    "Age": stu.age || '',
    "Guardian Contact": stu.guardianPhone || stu.guardian_phone || stu.guardianContact || '',
    "Residence": stu.residence || ''
  }));

  // 2. Build dynamic file name
  let titleParts = [];
  if (printClass !== 'All') titleParts.push(printClass);
  if (printTrade !== 'All') titleParts.push(printTrade);
  if (printSection !== 'All' && printClass === 'All') titleParts.push(printSection);

  const dynamicFileName = titleParts.length > 0 
    ? `${titleParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')}_Student_List.xlsx` 
    : 'Student_List.xlsx';

  // 3. Create worksheet and set auto column widths
  const excelLib = XLSX.default || XLSX;
    const worksheet = excelLib.utils.json_to_sheet(cleanExportData);

    const keys = Object.keys(cleanExportData[0] || {});
    worksheet['!cols'] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...cleanExportData.map((row) => String(row[key] || '').length)
      );
      return { wch: maxLen + 4 };
    });

    const workbook = excelLib.utils.book_new();
    excelLib.utils.book_append_sheet(workbook, worksheet, "Students");
    excelLib.writeFile(workbook, dynamicFileName);
};

  // Helper: Export current student list to PDF
const handleExportPDF = async (exportType = 'all') => {
    if (!studentsList || studentsList.length === 0) return;

    // Load libraries dynamically to prevent initial bundle bloat
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    // 1. Filter students according to UI selections
   const filteredData = studentsList.filter((stu) => {
      // 1. Section Matching
      if (printSection && printSection !== 'All' && printSection !== 'All Sections') {
        const secVal = (stu.section || '').toLowerCase();
        const selSec = printSection.toLowerCase();
        const matchesSec = secVal.includes(selSec) || selSec.includes(secVal) ||
          (selSec.includes('commercial') && (secVal.includes('commercial') || secVal.includes('stt'))) ||
          (selSec.includes('industrial') && (secVal.includes('industrial') || secVal.includes('sti')));
        if (!matchesSec) return false;
      }

      // 2. Class Level Matching
    if (printClass !== 'All' && printClass !== 'All Classes') {
      const pClass = printClass.toLowerCase();
      const sClass = String(stu.classLevel || stu.class_level || stu.className || stu.class || '').toLowerCase();
      const codeInParen = pClass.match(/\(([^)]+)\)/)?.[1] || '';
      const classMatch = sClass === pClass || sClass.includes(pClass) || pClass.includes(sClass) || (codeInParen !== '' && sClass.includes(codeInParen.toLowerCase()));
      if (!classMatch) return false;
    }
    if (printTrade !== 'All' && printTrade !== 'All Trades / Series' && printTrade !== '') {
      const pTrade = printTrade.toLowerCase();
      const sTrade = String(stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
      if (sTrade && !sTrade.includes(pTrade) && !pTrade.includes(sTrade)) return false;
    }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const name = (stu.fullName || stu.fullname || stu.full_name || '').toLowerCase();
        const id = (stu.unique_code || stu.id || stu.student_id || '').toLowerCase();
        const cls = (stu.classLevel || stu.class_level || '').toLowerCase();
        const sec = (stu.section || '').toLowerCase();
        const trd = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !cls.includes(q) && !sec.includes(q) && !trd.includes(q)) return false;
      }
      return true;
    });

    if (filteredData.length === 0) {
      alert("No student records found for the current selection.");
      return;
    }
// 2. Resolve Active School Name (Supabase DB -> LocalStorage Fallback)
    let tenantSchoolName = "";

    try {
      const { data: sDetails, error: sErr } = await supabase
        .from('school_details')
        .select('school_name, name')
        .limit(1)
        .maybeSingle();

      if (!sErr && sDetails) {
        tenantSchoolName = sDetails.school_name || sDetails.name || "";
      }
    } catch (err) {
      console.warn("Supabase fetch error, checking localStorage fallback...", err);
    }

    // Fallback to localStorage if database lookup returns empty
    if (!tenantSchoolName) {
      tenantSchoolName = localStorage.getItem('selectedSchoolName') || localStorage.getItem('activeSchoolName') || "";
    }

    // Stop execution and alert if school name is missing
    if (!tenantSchoolName) {
      alert("Can't find active school name. Check your internet connection or active school selection.");
      return;
    }
// Calculate dynamic academic year using system utility/state
    const activeAcademicYear = 
      (typeof getAcademicYear === 'function' && getCurrentAcademicYear()) ||
      (typeof currentAcademicYear !== 'undefined' && currentAcademicYear) ||
      localStorage.getItem('selectedAcademicYear') ||
      "";
    const doc = new jsPDF();

    // 3. Official Header Metadata
    let currentY = 13;

    // 1. Evaluate Academic Year Safely
    const academicYearVal = typeof getCurrentAcademicYear === 'function' 
      ? getCurrentAcademicYear() 
      : (typeof currentAcademicYear !== 'undefined' ? currentAcademicYear : "2026/2027");

    // 2. Main Institution Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(4, 80, 42); // Forest Green
    doc.text(String(tenantSchoolName || 'DEVELOPPER TEST INSTITUTE').toUpperCase(), 105, currentY, { align: 'center' });
    currentY += 5;

    // Decorative Accent Line
    doc.setDrawColor(4, 80, 42);
    doc.setLineWidth(0.6);
    doc.line(20, currentY, 190, currentY);
    currentY += 6;

    // Document Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate Gray
    const documentTitle = exportType === 'classList' ? 'OFFICIAL STUDENT CLASS ROSTER' : 'STUDENT DIRECTORY REGISTRATION LIST';
    doc.text(documentTitle, 105, currentY, { align: 'center' });
    currentY += 5;

    // Academic Year & Metadata Bar
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const subMetaData = `ACADEMIC YEAR: ${academicYearVal}   |   SECTION: ${printSection || 'All'}   |   CLASS: ${printClass || 'All'}${printTrade && printTrade !== 'All' && printTrade !== 'All Trades / Series' ? `   |   SERIES/TRADE: ${printTrade}` : ''}`;
    doc.text(subMetaData, 105, currentY, { align: 'center' });
    currentY += 6;

    // 3. Render Table
    if (exportType === 'classList') {
      const tableColumn = ["S/N", "Full Name", "Mark / Attendance", "Remarks / Signature"];
      const tableRows = filteredData.map((stu, index) => [
        index + 1,
        stu.fullName || stu.fullname || stu.full_name || '',
        "",
        ""
      ]);

      autoTable(doc, {
        startY: 36,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [4, 32, 20], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 75 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50 }
        }
      });
    } else {
      const tableColumn = ["ID", "Full Name", "Section", "Class", "Trade/Series", "Gender", "Phone"];
      const tableRows = filteredData.map((stu) => [
        stu.unique_code || stu.id || '',
        stu.fullName || stu.fullname || stu.full_name || '',
        stu.section || '',
        stu.classLevel || stu.class_level || '',
        stu.trades_series || stu.trade_series || stu.trade || 'N/A',
        stu.gender || '',
        stu.guardianPhone || stu.guardian_phone || ''
      ]);

      autoTable(doc, {
        startY: 34,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
      });
    }

    // Dynamic Filename
    let titleParts = [];
    if (printClass && printClass !== 'All' && printClass !== 'All Classes') titleParts.push(printClass);
    if (printTrade && printTrade !== 'All' && printTrade !== 'All Trades / Series') titleParts.push(printTrade);

    const fileName = titleParts.length > 0
      ? `${titleParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')}_${exportType === 'classList' ? 'Roster' : 'Full_List'}.pdf`
      : `Student_Directory_${exportType}.pdf`;

    // Anchor Download for Desktop & Mobile Browsers
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  };

  const handlePrint = () => {
    let filteredStudents = [...studentsList];

    if (printSection && printSection !== 'All' && printSection !== 'All Sections') {
      filteredStudents = filteredStudents.filter((stu) => {
        const secVal = (stu.section || '').toLowerCase();
        const selSec = printSection.toLowerCase();
        return secVal.includes(selSec) || selSec.includes(secVal) ||
          (selSec.includes('commercial') && (secVal.includes('commercial') || secVal.includes('STT'))) ||
          (selSec.includes('industrial') && (secVal.includes('industrial') || secVal.includes('IND')));
      });
    }

    if (printClass && printClass !== 'All' && printClass !== 'All Classes') {
      filteredStudents = filteredStudents.filter(
        (stu) => (stu.classLevel || stu.class_level || '').toLowerCase() === printClass.toLowerCase()
      );
    }

    if (printTrade && printTrade !== 'All' && printTrade !== 'All Trades / Series') {
      filteredStudents = filteredStudents.filter((stu) => {
        const tradeVal = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        const selTrade = printTrade.toLowerCase();
        return tradeVal.includes(selTrade) || selTrade.includes(tradeVal);
      });
    }

    filteredStudents.sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '')
    );

    if (filteredStudents.length === 0) {
      alert('No students found for the selected filter.');
      return;
    }

    const printWindow = window.open('', '_blank');
    let classTitle = 'All Students';
    if (printClass && printClass !== 'All' && printClass !== 'All Classes') classTitle = printClass;
    else if (printSection && printSection !== 'All' && printSection !== 'All Sections') classTitle = `${printSection} Section`;

    if (printTrade && printTrade !== 'All' && printTrade !== 'All Trades / Series') classTitle += ` - Trade: ${printTrade}`;

    const isTechnicalView = printSection === 'Technical' || printTrade !== 'All';

    printWindow.document.write(`
      <html>
        <head>
          <title>Student Directory - ${classTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            h4 { text-align: center; color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>${schoolName || 'NsuhRecords'}</h2>
          <h4>Student List: ${classTitle} (Total: ${filteredStudents.length})</h4>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>ID</th>
                <th>Full Name</th>
                <th>Section</th>
                <th>Class</th>
                ${isTechnicalView ? '<th>Trade / Specialty</th>' : ''}
                <th>Gender</th>
                <th>Guardian Contact</th>
                <th>Residence</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents
                .map(
                  (stu, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${stu.unique_code || stu.id || 'N/A'}</td>
                  <td>${stu.fullName || 'N/A'}</td>
                  <td>${stu.section || 'N/A'}</td>
                  <td>${stu.classLevel || 'N/A'}</td>
                  ${isTechnicalView ? `<td>${stu.trades_series || stu.trade || stu.specialty || 'N/A'}</td>` : ''}
                  <td>${stu.gender || 'N/A'}</td>
                 <td>${stu.guardian_phone || stu.guardianPhone || 'N/A'}</td>
                  <td>${stu.residence || 'N/A'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
  // Handle Camera Capture
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Unable to access camera. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setPicturePreview(dataUrl);
    
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPicturePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateCameroonPhone = (number) => {
    if (!number) return true;
    const cameroonPhoneRegex = /^6\d{8}$/;
    return cameroonPhoneRegex.test(number);
  };

  // Student Registration Submission with Gender Included
 const handleStudentRegistration = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  setIsSubmitting(true);

   const GENERAL_LOWER_CLASSES = [
      'Form 1A (F1A)', 'Form 1B (F1B)', 'Form 1C (F1C)', 'Form 1D (F1D)',
      'Form 2A (F2A)', 'Form 2B (F2B)', 'Form 2C (F2C)', 'Form 2D (F2D)',
      'Form 3A (F3A)', 'Form 3B (F3B)', 'Form 3C (F3C)',
      'Form 4A (F4A)', 'Form 4B (F4B)',
      'Form 5 Arts (F5A)', 'Form 5 Science (F5B)'
    ];

const isGeneralLower = GENERAL_LOWER_CLASSES.some(cls => classLevel === cls || classLevel?.includes(cls));

    const chosenSeriesOrTrade = isGeneralLower
      ? 'N/A'
      : (selectedSeries || selectedTechnicalSubject || 'N/A');
 if ((classLevel?.includes('Sixth') || masterClass?.includes('Sixth')) && chosenSeriesOrTrade === 'N/A') {
  alert('Please select a Series for Sixth Form students before registering.');
  setIsSubmitting(false);
  return;
}

const sec = (section || '').toLowerCase();

if (sec.includes('commercial') && (!selectedTechnicalSubject || !COMMERCIAL_TRADE_SERIES.includes(selectedTechnicalSubject))) {
      alert("Validation Error: Please select a valid Technical Commercial trade.");
      setIsSubmitting(false);
      return;
    }

    if (sec.includes('industrial') && (!selectedTechnicalSubject || !INDUSTRIAL_TRADE_SERIES.includes(selectedTechnicalSubject))) {
      alert("Validation Error: Please select a valid Technical Industrial trade.");
      setIsSubmitting(false);
      return;
    }
    if (!fullName || !guardianPhone || !age || !dob || !gender || !residence) {
  alert('Please fill in all mandatory student credential fields including gender and residence.');
  setIsSubmitting(false);
  return;
}

    if (phone && !validateCameroonPhone(phone)) {
      alert('Invalid Student Phone Number! Must start with 6 and contain 9 digits.');
      setIsSubmitting(false);
      return; 
    }

    if (!validateCameroonPhone(guardianPhone)) {
      alert('Invalid Guardian Phone Number! Must start with 6 and contain 9 digits.');
      setIsSubmitting(false);
      return;
    }
// Direct Multi-Tenant Resolution with Local Storage Offline Fallback
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Resolve school ID with persistent local fallback for offline reboots
  const cachedSchool = JSON.parse(localStorage.getItem('nsuh_active_school') || '{}');

  const currentSchoolId = 
    activeSchool?.id || 
    activeSchool?.school_id || 
    session?.user?.user_metadata?.school_id || 
    session?.user?.id ||
    cachedSchool?.id;

  const currentSchoolName = 
    activeSchool?.school_name || 
    activeSchool?.name || 
    session?.user?.user_metadata?.school_name || 
    cachedSchool?.school_name ||
    "Official Registry";

  // Auto-cache active school details for future offline boots
  if (activeSchool?.id || activeSchool?.school_id) {
    localStorage.setItem('nsuh_active_school', JSON.stringify({
      id: currentSchoolId,
      school_name: currentSchoolName
    }));
  }

  if (!currentSchoolId) {
    alert("Security Error: No active school session or tenant ID found. Please re-select your school.");
    setIsSubmitting(false);
    return;
  }

    // Duplicate Check: Verify if student already exists in this school
     const { data: potentialDuplicate } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', currentSchoolId)
        .ilike('fullName', fullName.trim())
        .eq('age', age)
        .eq('classLevel', classLevel)
        .maybeSingle();

      if (potentialDuplicate) {
        const proceed = window.confirm(
          `Notice: It seems like you have already registered "${fullName}" in ${classLevel}.\n\nDo you still want to register this student again?`
        );
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }
    const uniqueStudentId = generateStudentId(currentSchoolName, section, fullName, classLevel, age, gender);
    const newStudentRecord = {
      school_id: currentSchoolId,
      academic_year: getAcademicYear(),
      created_at: new Date().toISOString(),
      unique_code: uniqueStudentId,
      fullName,
      section,
      classLevel,
      gender,
      age,
      dob,
      residence: residence || 'N/A',
     medical_history: medicalHistory || 'None',
      guardian_name: guardianName || 'Parent',
      guardian_phone: guardianPhone || phone || 'N/A',
      picture: picturePreview,
      phone: phone || guardianPhone,
      trades_series: chosenSeriesOrTrade,
    };

    const studentCacheKey = `nsuh_students_${currentSchoolId}`;

    // ⚡ OFFLINE FALLBACK: Save locally if network is down
    if (!navigator.onLine) {
     const pendingKey = `nsuh_pending_students_${currentSchoolId}`;
      const pendingQueue = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      pendingQueue.push(newStudentRecord);
      localStorage.setItem(pendingKey, JSON.stringify(pendingQueue));

      setStudentsList((prev) => [newStudentRecord, ...prev]);
      setSuccessPopup(uniqueStudentId);
      const cachedStudents = JSON.parse(localStorage.getItem(studentCacheKey) || '[]');
      localStorage.setItem(studentCacheKey, JSON.stringify([newStudentRecord, ...cachedStudents]));
      setIsSubmitting(false);
      setFullName(''); setPhone(''); setResidence(''); setPicturePreview(null); setAge('');
      alert('Registered OFFLINE! Saved locally and will auto-sync when network restores.');
      return;
    }

    // 1. Insert new student into Supabase database
    const { error } = await supabase
      .from('students')
      .insert([newStudentRecord]);

if (error) {
      if (error.message?.includes('EXACT_DUPLICATE_RECORD') || error.code === '23505') {
        alert(`Registration Error: Student "${fullName}" (${gender}, Age: ${age}, Class: ${classLevel}) has already been registered with these exact details.`);
      } else {
        alert("Registration failed due to a system error. Please verify the student details and try again.");
      }
      setIsSubmitting(false);
      return;
    }

// 2. Update UI locally
setStudentsList((prev) => [newStudentRecord, ...prev]);
const cachedStudents = JSON.parse(localStorage.getItem(studentCacheKey) || '[]');
    localStorage.setItem(studentCacheKey, JSON.stringify([newStudentRecord, ...cachedStudents]));
    setSuccessPopup(uniqueStudentId);

    setFullName('');
      setPhone('');
      setResidence('');
      setPicturePreview(null);
      setAge('');
      setDob('');
      setGender('Male');
      setGuardianName('');
      setGuardianPhone('');
      setMedicalHistory('');
      setSelectedSeries(''); 
      setSelectedTechnicalSubject(''); // Reset technical trade selection
      setIsSubmitting(false);           // Release submission lock
  };

  // Other School Personnel Registration (Bursar, Supervisor, Discipline Master, Principal)
  const handlePersonnelRegistration = async (e) => {
    e.preventDefault();

    if (!fullName || !phone) {
      alert('Name and Contact Number are mandatory for school personnel registration.');
      return;
    }

    if (!validateCameroonPhone(phone)) {
      alert('Invalid Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }

    const roleCodeMap = {
      administrator: 'AD',
      principal: 'PR',
      supervisor: 'SV',
      discipline_master: 'DM',
      bursar: 'BS'
    };
    const prefix = roleCodeMap[regRole] || 'ST';
// Reuse existing unique_id / signup_link if editing, otherwise generate new ones
  // Safe edit check prevents "staffToEdit is not defined" ReferenceError
  const activeEditRecord = typeof staffToEdit !== 'undefined' ? staffToEdit : null;
  let uniqueStaffId = activeEditRecord?.unique_id || activeEditRecord?.id || '';

  if (!uniqueStaffId) {
    if (regRole === 'teacher') {
      uniqueStaffId = generateTeacherId(schoolName, 'General', fullName, phone);
    } else {
      const resolvedSchoolName = (typeof active_school_name !== 'undefined' && active_school_name)
        ? active_school_name
        : (typeof activeSchool !== 'undefined' ? (activeSchool?.school_name || activeSchool?.name) || schoolName : schoolName);

      const schoolWords = String(resolvedSchoolName).trim().split(/\s+/);
      const schoolInitials = schoolWords.length > 1
        ? (schoolWords[0].charAt(0) + schoolWords[1].charAt(0)).toUpperCase()
        : schoolWords[0].substring(0, 2).toUpperCase();

      const nameWords = fullName.trim().split(/\s+/);
      const nameInitials = nameWords.length > 1
        ? (nameWords[0].charAt(0) + nameWords[1].charAt(0)).toUpperCase()
        : nameWords[0].substring(0, 2).toUpperCase();

      const phoneDigits = phone ? phone.replace(/\D/g, '') : '0000';
      const lastFourPhone = phoneDigits.slice(-4).padStart(4, '0');

      uniqueStaffId = `${schoolInitials}-${prefix}${nameInitials}${lastFourPhone}`;
    }
  }

  const token = Math.random().toString(36).substring(2, 10);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://nsuhrecords.vercel.app/';

  // Explicitly passes role= parameter and formatted query params
  const signupLink = activeEditRecord?.signup_link || `${baseUrl}/staff-signup?role=${encodeURIComponent(regRole)}&token=${token}&id=${uniqueStaffId}`;

   const activeSchoolId = typeof schoolId !== 'undefined' ? schoolId : (activeSchool?.school_id || activeSchool?.id || '');
const activeSchoolName = (typeof active_school_name !== 'undefined' ? active_school_name : null) || activeSchool?.name || activeSchool?.['school-name'] || 'NsuhRecords School';
const newStaffRecord = {
  school_id: activeSchoolId,
  school_name: activeSchoolName,
  unique_id: uniqueStaffId,
  signup_link: signupLink,
  full_name: fullName,
  phone: phone,
  email: staffEmail || null,
  residence: staffResidence || null,
  academic_year: getAcademicYear(),
  role: regRole
};

    // Insert directly into the school_personnel Supabase table
    const { data, error } = await supabase
      .from('school_personnel')
      .insert([newStaffRecord])
      .select();
if (error) {
    if (error.message.includes('Maximum number of administrators') || error.message.includes('enforce_admin_limit')) {
        alert('Maximum number of administrators attained, a school can only have 4 administrators');
        return;
    }
    console.error('Error saving personnel:', error.message);
    alert('Error saving school personnel try again.');
    return;
}

    if (data && data.length > 0) {
  const savedPerson = {
    ...data[0],
    id: data[0].unique_id || data[0].id,
    signupLink: data[0].signup_link
  };
  setPersonnelList((prev) => [savedPerson, ...prev]);

  setActivePersonnelResult({
    ...savedPerson,
    fullName: fullName,
    uniqueStaffId: uniqueStaffId,
    signupLink: `${savedPerson.signupLink}&school_id=${activeSchoolId}`
  });
}
setFullName('');
setPhone('');
setStaffEmail('');
setStaffResidence('');
  };
const handleUpdatePersonnel = async (e) => {
    e.preventDefault();

    if (!editingPersonnel?.full_name || !editingPersonnel?.phone) {
      alert('Name and Contact Number are mandatory.');
      return;
    }

    if (!validateCameroonPhone(editingPersonnel.phone)) {
      alert('Invalid Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }

    const activeSchoolId = currentSchoolId || (typeof window !== 'undefined' ? localStorage.getItem('school_id') : null);

    // Update in Supabase school_personnel table
    const { data, error } = await supabase
      .from('school_personnel')
      .update({
        full_name: editingPersonnel.full_name,
        phone: editingPersonnel.phone,
        email: editingPersonnel.email || null,
        residence: editingPersonnel.residence || null,
        role: editingPersonnel.role
      })
      .eq('unique_id', editingPersonnel.unique_id || editingPersonnel.id)
      .eq('school_id', activeSchoolId)
      .select();

    if (error) {
      console.error('Error updating personnel in Supabase:', error.message);
      alert('Failed to update personnel. Please try again.');
      return;
    }

    // Update local React state so UI updates immediately
    setPersonnelList((prev) =>
      prev.map((item) =>
        (item.unique_id || item.id) === (editingPersonnel.unique_id || editingPersonnel.id)
          ? { ...item, ...editingPersonnel }
          : item
      )
    );

    alert('Personnel updated successfully!');
    setIsEditPersonnelModalOpen(false);
    setEditingPersonnel(null);
  };
  const handleDeletePersonnel = async (person) => {
    console.log("PERSON OBJECT PASSED TO DELETE:", person);
    const personId = typeof person === 'object' ? (person?.unique_id || person?.id || person?.person_id) : person;
    const personName = typeof person === 'object' ? (person?.fullName || person?.full_name || 'this personnel member') : 'this personnel member';

    if (!confirm(`Are you sure you want to delete ${personName}?`)) {
        return;
    }

    const { error } = await supabase
        .from('school_personnel')
        .delete()
        .eq('unique_id', personId);

    if (error) {
        console.error('Error deleting personnel from Supabase:', error.message);
        alert('Failed to delete personnel. Please try again.');
        return;
    }

    setPersonnelList((prev) => prev.filter((p) => {
        const pId = typeof p === 'object' ? (p?.unique_id || p?.id || p?.person_id) : p;
        return pId !== personId;
    }));

    alert(`${personName} deleted successfully!`);
};
  
  const getAvailableSubjects = () => {
  const general = [...customSubjects, ...ALL_SUBJECTS_LIST.filter(s => s.category === "General Core Subjects").map(s => s.name)];
  const commercial = [...customSubjects, ...ALL_SUBJECTS_LIST.filter(s => s.category === "Commercial Subjects").map(s => s.name)];
  const industrial = [...customSubjects, ...ALL_SUBJECTS_LIST.filter(s => s.category === "Industrial Subjects").map(s => s.name)];
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
  

  const currentYear = currentTime ? currentTime.getFullYear() : new Date().getFullYear();

  // Compute student counts
  const totalStudents = studentsList.length;
  const tcStudentsCount = studentsList.filter(s => 
    s.section?.toLowerCase().includes('commercial') || s.section?.includes('STT')
  ).length;

  const tiStudentsCount = studentsList.filter(s => 
    s.section?.toLowerCase().includes('industrial') || s.section?.includes('IND')
  ).length;
  const generalStudentsCount = studentsList.filter(s => s.section?.toLowerCase().includes('general')).length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans">
      <header className="bg-[#111827] border-b border-gray-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          {navigationHistory.length > 1 && (
            <button 
              onClick={handleGoBack}
              className="bg-gray-800 hover:bg-gray-700 text-sky-400 border border-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-500 uppercase">
              {hasMounted ? (localStorage.getItem('active_school_name') || localStorage.getItem('activeSchoolName') || 'School Admin Portal') : 'School Admin Portal'}
</h1>
<p className="text-xs text-gray-400">Academic Year: {getCurrentAcademicYear()} | Administrator Portal | Contact: {schoolContact}</p>          </div>
        </div>
    {/* High-Resolution School Logo Container */}
<div className="hidden md:flex items-center justify-center p-1">
  {schoolLogo && (schoolLogo.startsWith('http') || schoolLogo.startsWith('data:image')) ? (
    <img
      src={schoolLogo}
      alt="School Logo"
      className="max-h-12 max-w-full object-contain filter drop-shadow-md"
    />
  ) : (
    <span className="text-xs font-semibold text-sky-400 tracking-wider">LOGO</span>
  )}
</div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-blue-400 font-semibold">
              {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Loading date...'}
            </div>
            <div className="text-xs font-mono text-gray-400">
              {currentTime ? currentTime.toLocaleTimeString() : ''}
            </div>
          </div>
          <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full font-medium">
            Active Session
          </span>
        </div>
      </header>
<nav className="hidden md:flex bg-[#111827]/60 border-b border-gray-800 px-6 space-x-6 overflow-x-auto">
       {[
  { id: 'overview', label: 'Overview' },
  { id: 'register', label: 'Register New Member' },
  { id: 'students', label: 'All Students List' },
  { id: 'teachers', label: 'Assign New Teacher' },
  { id: 'teacher-list', label: 'All Teachers List' },
  { id: 'personnel', label: 'Other School Personnel' },
  { id: 'coefficients', label: 'Class & Coefficient Settings' },
  { id: 'master-marks', label: 'Master Mark Sheet' },
  { id: 'details', label: 'School Details' },
  { id: 'settings', label: 'General Settings' },
   
].map((tab) => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className={`${activeTab !== 'overview' ? 'hidden' : 'flex'} flex-col gap-2 p-3 md:hidden w-full`}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'register', label: 'Register New Member' },
          { id: 'students', label: 'All Students List' },
          { id: 'teachers', label: 'Assign New Teacher' },
          { id: 'teacher-list', label: 'All Teachers List' },
          { id: 'personnel', label: 'Other School Personnel' },
          { id: 'coefficients', label: 'Class & Coefficient Settings' },
          { id: 'master-marks', label: 'Master Mark Sheet' },
          { id: 'details', label: 'School Details' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => changeTab(tab.id)}
           className={`w-full p-4 rounded-xl border text-left font-medium text-sm transition-all duration-200 flex items-center justify-between shadow-sm ${
  activeTab === tab.id
    ? 'bg-[#052e16] border-emerald-600 text-[#fdfbf7] shadow-emerald-900/20 ring-1 ring-emerald-500/30'
    : 'bg-gray-900/90 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
}`}
          >
            <span>{tab.label}</span>
            <span className="text-xs">{activeTab === tab.id ? '▲' : '▼'}</span>
          </button>
        ))}
      </div>
<main className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
  {activeTab !== 'overview' && activeTab !== null && (
  <div className="block md:hidden">
    <button
      type="button"
      onClick={() => setActiveTab('overview')}
      className="flex items-center space-x-2 text-xs font-semibold bg-[#111827] text-amber-100 px-3 py-2 rounded-lg mb-4"
    >
      <span>← Back to Overview</span>
    </button>
  </div>
)}       
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#f0f7ff] border border-blue-200 p-4 sm:p-6 rounded-xl shadow-sm text-slate-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500 font-bold">Total Students</h3>
                <p className="text-3xl font-black mt-2 text-[#052e16]">{totalStudents}</p>
                <div className="text-[11px] text-blue-500 font-bold mt-1 flex gap-2">
                  <div>
                    <span>General Education = <strong className="text-amber-500 font-bold">{generalStudentsCount}</strong> | </span>
                    <span>Technical Commercial = <strong className="text-amber-500 font-bold">{tcStudentsCount}</strong> | </span>
                    <span>Technical Industrial = <strong className="text-amber-500 font-bold">{tiStudentsCount}</strong></span>
  </div>
                </div>
              </div>
              <div className="bg-[#f0f7ff] border border-blue-200 p-6 rounded-xl shadow-sm text-slate-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900 font-bold">Total Teachers</h3>
                <p className="text-3xl font-black mt-2 text-slate-900">{teachersList.length}</p>
              </div>
              <div className="bg-[#f0f7ff] border border-blue-200 p-6 rounded-xl shadow-sm text-slate-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Other Personnel</h3>
                <p className="text-3xl font-black mt-2 text-blue-400">{personnelList.length}</p>
              </div>
              <div className="bg-[#f0f7ff] border border-blue-200 p-6 rounded-xl shadow-sm text-slate-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Administrators</h3>
                <p className="text-3xl font-black mt-2 text-blue-400">
  {personnelList.filter(p => p.role === 'administrator').length + 1} / 4
</p>
              </div>
            </div>

            {/* General Teacher Timetable Collected Summary */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-100 border-b border-gray-800 pb-3">
                General School Master Timetable & Teacher Subject Allocation Summary
              </h3>
              {teachersList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No teacher timetables collected yet. Assign teachers to build the master schedule.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                    <thead className="bg-[#1f2937] text-amber-100 uppercase font-semibold">
                      <tr>
                        <th className="p-3 border border-gray-700">Teacher Name (ID)</th>
                        <th className="p-3 border border-gray-700">Subjects Taught</th>
                        <th className="p-3 border border-gray-700">Class & Schedule Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">

                      {teachersList.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-800/40">
                          <td className="p-3 border border-gray-700 font-bold text-white">
                            <div>{t.name}</div>
                            <span className="text-[10px] font-mono text-amber-100/80">{t.id || t.teacher_id}</span>
                          </td>
                          <td className="p-3 border text-amber-100">
  <div className="flex flex-col gap-1.5 items-start">
    {t.subjects.map((sub, sIdx) => (
      <span key={sIdx} className="inline-block bg-blue-900/30 text-blue-300 border border-blue-700/50 rounded px-2 py-1 text-xs whitespace-normal max-w-full">
        {sub}
      </span>
    ))}
  </div>
</td>
                          <td className="p-3 border border-gray-700 font-mono text-[11px]">
                            {Object.entries(t.schedules).map(([sub, rows], rIdx) => (
                              <div key={rIdx} className="mb-1">
                                <span className="text-amber-300 font-bold">{sub}:</span>{' '}
                                {rows.map((row, rowIdx) => (
                                  <span key={rowIdx} className="text-gray-300 block ml-2">
                                    • {row.className} | {row.day} ({row.startTime} - {row.endTime})
                                  </span>
                                ))}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGISTER NEW MEMBER TAB */}
        {activeTab === 'register' && (
          <div className="bg-[#111827] border border-gray-800 p-4 md:p-5 rounded-xl w-full max-w-6xl mx-auto shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-gray-800 pb-3">Register New Member</h2>
            
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Select Role</label>
                <select 
                  value={regRole} 
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="student">Student</option>
                  <option value="administrator">Administrator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="bursar">Bursar</option>
                  <option value="discipline_master">Discipline Master</option>
                  <option value="principal">Principal</option>
                </select>
              </div>
              {/* REGISTRATION MODE TOGGLE BUTTONS */}
{regRole === 'student' && (
  <div className="space-y-4 mb-6">
   {/* MODE TOGGLE BUTTONS */}
          <div className="flex items-center gap-3 p-1.5 bg-[#141d2b] border border-gray-700/60 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setRegistrationMode('single')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                registrationMode === 'single'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Single Student Registration
            </button>
            <button
              type="button"
              onClick={() => setRegistrationMode('bulk')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                registrationMode === 'bulk'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bulk Spreadsheet Import (.xlsx)
            </button>
          </div>

          {/* 1. TARGET CLASS CONTEXT (ONLY SHOWS UNDER BULK IMPORT MODE) */}
          {registrationMode === 'bulk' && (
            <div className="bg-[#141d2b] p-4 rounded-xl border border-amber-500/30 shadow-md">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                1. Select Target Class Context
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* 1. SECTION SELECT */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Section <span className="text-red-400">*</span>
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
                    className="w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2"
                  >
                    <option value="">-- Select Section --</option>
                    <option value="General Education">General Education</option>
                    <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                    <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
                  </select>
                </div>

                {/* 2. CLASS LEVEL SELECT */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Class Level <span className="text-red-400">*</span>
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
                    className="w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2"
                    disabled={!section}
                  >
                    <option value="">-- Select Class Level --</option>
                    
       {/* General Education Classes */}
          {(section === 'General Education' || !section) &&
            (registrationClasses || []).map((cls, idx) => {
              const className = typeof cls === 'string' ? cls : cls.name;
              return (
                <option key={idx} value={className}>
                  {className}
                </option>
              );
            })}

          {/* Technical Commercial Classes */}
          {section === 'Technical Commercial (STT)' &&
            (typeof TECHNICAL_COMMERCIAL_CATALOG !== 'undefined' ? TECHNICAL_COMMERCIAL_CATALOG : []).map((cls, idx) => {
              const className = typeof cls === 'string' ? cls : cls.name;
              return (
                <option key={idx} value={className}>
                  {className}
                </option>
              );
            })}

          {/* Technical Industrial Classes */}
          {section === 'Technical Industrial (IND)' &&
            (typeof TECHNICAL_INDUSTRIAL_CATALOG !== 'undefined' ? TECHNICAL_INDUSTRIAL_CATALOG : []).map((cls, idx) => {
              const className = typeof cls === 'string' ? cls : cls.name;
              return (
                <option key={idx} value={className}>
                  {className}
                </option>
              );
            })}
                  </select>
                </div>

                {/* 3. DYNAMIC TRADE / SERIES DROPDOWN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
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
                      className="w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2"
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
                      className="w-full bg-slate-800/60 border border-gray-700 text-gray-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                    />
                  ) : section === 'Technical Commercial (STT)' ? (
                    <select
                      value={typeof masterClass !== 'undefined' && masterClass ? masterClass : (COMMERCIAL_TRADE_SERIES?.[0] || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (typeof setMasterClass === 'function') setMasterClass(val);
                      }}
                      className="w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2"
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
                      className="w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2"
                    >
                      {typeof INDUSTRIAL_TRADE_SERIES !== 'undefined' && Array.isArray(INDUSTRIAL_TRADE_SERIES) && INDUSTRIAL_TRADE_SERIES.map((trade) => (
                        <option key={trade} value={trade}>{trade}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      placeholder="Select a section first"
                      className="w-full bg-slate-800/60 border border-gray-700 text-gray-500 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                    />
                  )}
                </div>

              </div>
            </div>
          )}
  </div>
)}

{/* BULK UPLOAD PANEL */}
{regRole === 'student' && registrationMode === 'bulk' && (
  <div className="bg-[#1f2937]/60 border border-amber-500/40 rounded-xl p-5 mb-5 space-y-4 shadow-xl">
    <div className="border-b border-gray-700 pb-3">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
        Bulk Student Spreadsheet Registration
      </h3>
      <p className="text-xs text-gray-300 mt-1">
        Register an entire class section at once using an Excel template.
      </p>
    </div>

    {/* ADMIN INSTRUCTIONS */}
    <div className="bg-[#141d2b] border border-gray-700/80 rounded-lg p-4 text-xs text-gray-300 space-y-2">
      <p className="font-semibold text-amber-300">Simple Instructions for Administrators:</p>
      <ol className="list-decimal list-inside space-y-1 text-gray-300">
        <li>Select target <strong>Section</strong>, <strong>Class Level</strong>, and <strong>Trade/Series</strong> using the dropdowns below.</li>
        <li>Click <strong>Download Class Template (.xlsx)</strong> to get your pre-formatted sheet.</li>
        <li>Fill in student names, date of birth, gender, residence, and guardian details. <em>Leave Student IDs empty—they generate automatically!</em></li>
        <li>Choose your completed Excel file and click <strong>Parse Excel File</strong> to verify records.</li>
        <li>For General Sixth Form, Commercial, and Industrial classes, you do not need to include a column for trades/series in the spreadsheet; once you select it in the dropdown above, all students in the batch will be registered with that exact trade/series.</li>
      </ol>
    </div>

    {/* ACTIONS */}
    <div className="flex flex-wrap items-center gap-4 pt-2">
      <button
        type="button"
        onClick={handleDownloadBulkTemplate}
        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition-all"
      >
        📥 Download Class Template (.xlsx)
      </button>

      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={(e) => setBulkFile(e.target.files[0])}
        className="block text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
      />

      <button
        type="button"
        onClick={handleParseBulkFile}
        disabled={!bulkFile || isProcessingBulk}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
      >
        {isProcessingBulk ? "Parsing File..." : "Parse Excel File"}
      </button>
    </div>

    {/* IMPORT PROGRESS BAR */}
    {isProcessingBulk && (
      <div className="space-y-1.5 pt-2">
        <div className="flex justify-between text-xs text-amber-300 font-semibold">
          <span>{uploadProgress === 100 ? "Upload Complete!" : "Importing Students..."}</span>
          <span>{uploadProgress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700">
          <div
            className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    )}
    {/* PARSED DATA PREVIEW TABLE */}
    {bulkParsedData.length > 0 && (
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Parsed Preview ({bulkParsedData.length} Students Ready)
          </span>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setBulkParsedData([])}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Clear Preview
          </button>
          <button
            type="button"
            onClick={handleExecuteBulkImport}
            disabled={isProcessingBulk}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-md shadow transition-all disabled:opacity-50"
          >
            {isProcessingBulk ? "Importing..." : `Confirm & Register (${bulkParsedData.length}) Students`}
          </button>
        </div>
        </div>

        <div className="max-h-56 overflow-y-auto border border-gray-700 rounded-lg">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#141d2b] text-gray-400 sticky top-0 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-2 border-b border-gray-700">Full Name</th>
                <th className="p-2 border-b border-gray-700">Gender</th>
                <th className="p-2 border-b border-gray-700">Date of Birth</th>
                <th className="p-2 border-b border-gray-700">Residence</th>
                <th className="p-2 border-b border-gray-700">Guardian Name</th>
                <th className="p-2 border-b border-gray-700">Guardian Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
               {bulkParsedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/40">
              <td className="p-2 text-xs sm:text-base font-medium text-[#FDFBF7]">{row.fullName || row["Full Name"] || '-'}</td>
              <td className="p-2">{row.gender || row["Gender"] || '-'}</td>
              <td className="p-2">{row.dob || row["Date of Birth"] || row["DOB"] || '-'}</td>
              <td className="p-2">{row.residence || row["Residence"] || '-'}</td>
              <td className="p-2">{row.guardian_name || row["Guardian Name"] || '-'}</td>
              <td className="p-2">{row.guardian_phone || row["Guardian Phone"] || row.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
)}

              {regRole === 'student' ? (
                <form onSubmit={handleStudentRegistration} className="space-y-2">
                  {/* STUDENT REGISTRATION GUIDE CONTAINER */}
          <div className="bg-[#1f2937]/60 border border-gray-700/80 rounded-xl p-3.5 mb-3 shadow-inner">
            <p className="text-xs text-gray-200 italic leading-relaxed font-sans">
              <strong className="text-blue-400 not-italic font-semibold mr-1">Important Registration Guide:</strong>
              Accurate registration directly determines student report cards and academic records. Ensure all required fields—including Section, Class Level, and Trade/Series—are correctly filled. If a class enrollment is under 50 students, assign all students to stream <span className="text-blue-300 font-semibold not-italic">A</span> (e.g., Form 1A) and avoid mixing streams.
            </p>
          </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">SECTION</label>
  <select
    value={section}
   onChange={(e) => {
  const newSec = e.target.value;
  setSection(newSec);
  setMasterSection(newSec);
  if (newSec === 'General Education') {
    setClassLevel(GENERAL_CLASSES_CATALOG[0]);
    setMasterClass(GENERAL_CLASSES_CATALOG[0]);
  } else if (newSec === 'Technical Commercial (STT)') {
    setClassLevel(TECHNICAL_COMMERCIAL_CATALOG[0]);
    setMasterClass(TECHNICAL_COMMERCIAL_CATALOG[0]);
  } else if (newSec === 'Technical Industrial (IND)') {
    setClassLevel(TECHNICAL_INDUSTRIAL_CATALOG[0]);
    setMasterClass(TECHNICAL_INDUSTRIAL_CATALOG[0]);
  }
  setSelectedSeries('');
  setSelectedTechnicalSubject('');
}}
    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
  >
<option value="General Education">General Education</option>
<option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
<option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
  </select>
</div>

<div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
    CLASS LEVEL
  </label>
  <select
    value={classLevel}
    onChange={(e) => {
  const val = e.target.value;
  setClassLevel(val);
  setSelectedSeries('');
  setSelectedTechnicalSubject('');
}}
    className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
  >
{((section?.includes('General') || section === 'General Education')
  ? [...((typeof customClasses !== 'undefined' && customClasses?.general) || []), ...(GENERAL_CLASSES_CATALOG || [])]
  : section?.includes('Commercial')
  ? [...((typeof customClasses !== 'undefined' && customClasses?.commercial) || []), ...(TECHNICAL_COMMERCIAL_CATALOG || [])]
  : section?.includes('Industrial')
  ? [...((typeof customClasses !== 'undefined' && customClasses?.industrial) || []), ...(TECHNICAL_INDUSTRIAL_CATALOG || [])]
  : []
).map((cls, idx) => {
  const className = typeof cls === 'string' ? cls : cls.name;
  return (
    <option key={idx} value={className}>
      {className}
    </option>
  );
})}
  </select>
</div>

{/* Conditional Series Selector for Upper / Lower Sixth General Education */}
{['Lower Sixth Arts (L6A)', 'Upper Sixth Arts (U6A)', 'Lower Sixth Science (L6S)', 'Upper Sixth Science (U6S)'].includes(classLevel) && (
  <div className="mt-3">
    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">SELECT SERIES</label>
    <select
            value={selectedSeries}
            onChange={(e) => {
              setSelectedSeries(e.target.value);
              setSelectedTechnicalSubject(e.target.value);
            }}
            className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
            required
          >
      <option value="">-- Choose Series Option --</option>
      {(classLevel.includes('Arts') ? GENERAL_SERIES_CATALOG.ARTS : GENERAL_SERIES_CATALOG.SCIENCE).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>
)}
                  </div>
                  {(section?.includes('Commercial') || section?.includes('Industrial')) && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            TRADE / SERIES
          </label>
        <select
            value={selectedTechnicalSubject}
            onChange={(e) => {
              setSelectedTechnicalSubject(e.target.value);
              setSelectedSeries(e.target.value);
            }}
            className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="">-- Select Trade / Series --</option>
           {(section?.includes('Commercial')
  ? (COMMERCIAL_TRADE_SERIES || [])
  : (INDUSTRIAL_TRADE_SERIES || [])
).map((trade, idx) => (
  <option key={idx} value={trade}>
    {trade}
  </option>
))}
          </select>
        </div>
      )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Ngo Cecilia Taku"
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Gender</label>
                      <select 
                        value={gender} 
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-amber-300 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Age</label>
                   <input
              type="number"
              value={age}
              readOnly
              placeholder="15"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
            />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Date of Birth</label>
                 <input
              type="date"
              value={dob}
              min="1995-01-01"
              max={`${currentYear}-12-31`}
              onChange={(e) => {
                const selectedDob = e.target.value;
                setDob(selectedDob);
                if (selectedDob) {
                  const birthYear = new Date(selectedDob).getFullYear();
                  const currentYearNow = new Date().getFullYear();
                  const calculatedAge = currentYearNow - birthYear;
                  if (calculatedAge >= 0) setAge(calculatedAge);
                }
              }}
              required
              className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
            />
                  </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Quarter / Residence *</label>
                      <input 
                        type="text" 
                        value={residence}
                        onChange={(e) => setResidence(e.target.value)}
                        placeholder="Mankon"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Student Phone (Opt.)</label>
                   <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && (!v.startsWith('6') || v.length !== 9 || !/^\d+$/.test(v))) alert("Wrong phone number"); }}
                placeholder="682491189"
                className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
              />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Guardian Name</label>
                      <input 
                        type="text" 
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Mr. Taku"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                 <div>
                {/* Medical History Input */}
       {/* Medical History Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Medical History / Conditions
          </label>
          <input
     list="register-medical-conditions"
     type="text"
     placeholder="Select or type condition (e.g. Asthma, Peanut Allergy...)"
     value={medicalHistory}
     onChange={(e) => setMedicalHistory(e.target.value)}
     className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none transition shadow-inner"
   />
   <datalist id="register-medical-conditions">
     <option value="None / No Known Medical Conditions" />
     <option value="Asthma / Respiratory Conditions" />
     <option value="Peanut / Groundnut Allergy" />
     <option value="Penicillin / Antibiotic Allergy" />
     <option value="Sickle Cell Trait / Anemia" />
     <option value="Lactose Intolerance" />
     <option value="Dust & Pollen Allergy" />
     <option value="Epilepsy / Seizure History" />
   </datalist>
        </div>

        {/* Guardian Phone Number */}
       <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            Guardian Phone Number
          </label>
          <input
            type="text"
            value={guardianPhone}
            onChange={(e) => {
              setGuardianPhone(e.target.value);
              setPhoneError("");
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && (!v.startsWith('6') || v.length !== 9 || !/^\d+$/.test(v))) {
                setPhoneError("Wrong phone number");
              }
            }}
            placeholder="6xxxxxxxx"
            className={`w-full bg-[#1f2937] border ${phoneError ? 'border-red-500' : 'border-amber-500/60'} rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none`}
          />
            {phoneError && (
              <p className="mt-1 text-xs text-red-500 font-medium">{phoneError}</p>
            )}
          </div>
          </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Student Picture (Camera or File)</label>
                    <div className="flex items-center gap-4">
                      {picturePreview ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-amber-500">
                          <img src={picturePreview} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-[#1f2937] border border-gray-700 flex items-center justify-center text-xs text-gray-500">
                          No Image
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="bg-[#1f2937] hover:bg-gray-700 border border-gray-700 text-xs text-center py-2 px-3 rounded-lg cursor-pointer font-medium">
                          Upload From Device
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                        <button type="button" onClick={startCamera} className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-xs text-blue-300 py-2 px-3 rounded-lg font-medium">
                          Snap With Phone Camera
                        </button>
                      </div>
                    </div>

                    {isCameraActive && (
                      <div className="mt-4 p-4 bg-[#1f2937] border border-gray-700 rounded-xl text-center space-y-3">
                        <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 rounded object-cover bg-black mx-auto" />
                        <button type="button" onClick={capturePhoto} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-6 rounded-lg">
                          Capture Snapshot Now
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all mt-4">
                    Register Student & Generate Unique ID
                  </button>
                </form>
              ) : (
                /* Personnel Registration Screen for Bursar, Supervisor, Discipline Master, Principal */
                <form onSubmit={handlePersonnelRegistration} className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300">
                  Registering for role: <strong className="uppercase">
{regRole.replace('_', ' ')}</strong>. Name and Contact Number are mandatory. A unique Personnel ID and signup link will be generated.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Full Name (Mandatory)</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Dr. Tse Aloysius"
                      className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Contact Number (Mandatory)</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="682491189"
                      className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address (Optional)</label>
                      <input 
                        type="email" 
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff@wisdomcollege.cm"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Place of Residence</label>
                      <input 
                        type="text" 
                        value={staffResidence}
                        onChange={(e) => setStaffResidence(e.target.value)}
                        placeholder="Up Station, Bamenda"
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all mt-4">
                    Register Personnel & Generate Unique American Standard ID & Link
                  </button>
                </form>
              )}
            </div>

            {successPopup && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                <div className="bg-[#111827] border border-amber-500 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                  <h3 className="text-lg font-bold text-white">Student Registered Successfully!</h3>
                  <div className="bg-[#1f2937] border border-dashed border-amber-500/60 p-3 rounded-xl text-amber-400 font-mono text-lg font-bold select-all">
                    {successPopup}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(successPopup);
                      alert('Copied to clipboard!');
                      setSuccessPopup(null);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-lg text-sm"
                  >
                    Copy Code & Close
                  </button>
                </div>
              </div>
            )}

            {activePersonnelResult && (
              <div className="mt-6 p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-emerald-400">Personnel Registered Successfully!</h3>
                <p className="text-xs text-gray-300">Generated ID: <strong className="text-amber-300 font-mono">{activePersonnelResult.id}</strong></p>
                <p className="text-xs text-gray-300">Share this dedicated signup and login link with <strong>{activePersonnelResult.fullName}</strong>:</p>
                <div className="bg-[#1f2937] p-3 rounded border border-emerald-500/40 text-amber-300 font-mono text-xs select-all">
                  {activePersonnelResult.signupLink}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(activePersonnelResult.signupLink);
                    alert('Signup link copied to clipboard!');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg"
                >
                  Copy Signup Link
                </button>
              </div>
            )}
          </div>
        )}

        {/* ALL STUDENT LIST TAB */}
        {activeTab === 'students' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
           <div className="flex justify-between items-center border-b border-gray-800 pb-3 gap-2">
    <h2 className="text-base sm:text-lg font-bold text-white">
      All Registered Students
    </h2>
    <span className="text-[11px] sm:text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30 whitespace-nowrap">
      Total: {studentsList.length} (TE: {studentsList.filter(s => s.section === 'Technical Commercial (STT)' || s.section === 'Technical Industrial (STI)').length} | General: {studentsList.filter(s => s.section === 'General Education').length})
    </span>
  </div>

  {/* Smart Search Bar - Broad and full-width on mobile */}
  <div className="relative w-full">
    <input
      type="text"
      placeholder="Search ID, Name, Class, Trade..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full bg-gray-900/90 text-white placeholder-gray-400 text-xs sm:text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-amber-500"
    />
    {searchQuery && (
      <button
        type="button"
        onClick={() => setSearchQuery('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
      >
        ✕
      </button>
    )}
  </div>
{/* Export & Print Action Bar */}
<div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between items-start sm:items-center bg-gray-800/80 p-3 rounded-lg border border-gray-700">
  <h3 className="text-lg font-bold text-white">Student Directory Actions</h3>
  
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
    <div className="flex flex-wrap items-center gap-2">
          {/* Section Selector */}
          <select
              value={printSection}
              onChange={(e) => {
                setPrintSection(e.target.value);
                setPrintClass('All');
                setPrintTrade('All');
              }}
              className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none"
            >
             <option value="All">All Sections</option>
            <option value="General Education">General Education</option>
            <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
            <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
          </select>

          {/* Class Selector */}
          <select
            value={printClass}
            onChange={(e) => setPrintClass(e.target.value)}
            className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none"
          >
            <option value="All">All Classes</option>
           {/* General Catalog */}
            {printSection === 'General Education' &&
              GENERAL_CLASSES_CATALOG.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}

            {/* Technical Commercial Catalog */}
            {printSection === 'Technical Commercial (STT)' &&
              TECHNICAL_COMMERCIAL_CATALOG.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}

            {/* Technical Industrial Catalog */}
            {printSection === 'Technical Industrial (IND)' &&
              TECHNICAL_INDUSTRIAL_CATALOG.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}

            {/* All Sections Selected - Combined List */}
            {printSection === 'All' &&
              [
                ...GENERAL_CLASSES_CATALOG,
                ...TECHNICAL_COMMERCIAL_CATALOG,
                ...TECHNICAL_INDUSTRIAL_CATALOG,
              ].map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
          </select>
{/* Trade Selector */}
        <select
            value={printTrade}
            onChange={(e) => setPrintTrade(e.target.value)}
            className="bg-gray-800 text-amber-400 text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none"
          >
            <option value="All">
              {printSection === 'General Education' ? 'All Series' : 'All Trades / Series'}
            </option>

            {/* General Arts Series */}
            {(printSection === 'General Education' || printSection === 'All') &&
              (printClass.includes('Arts') || printClass === 'All') &&
              GENERAL_SERIES_CATALOG.ARTS.map((s) => (
                <option key={s} value={s}>
                  Series {s}
                </option>
              ))}

            {/* General Science Series */}
            {(printSection === 'General Education' || printSection === 'All') &&
              (printClass.includes('Science') || printClass === 'All') &&
              GENERAL_SERIES_CATALOG.SCIENCE.map((s) => (
                <option key={s} value={s}>
                  Series {s}
                </option>
              ))}

            {/* Technical Commercial Trade Series */}
            {(printSection === 'Technical Commercial (STT)' || printSection === 'All') &&
              COMMERCIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>

              ))}

            {/* Technical Industrial Trade Series */}
            {(printSection === 'Technical Industrial (IND)' || printSection === 'All') &&
              INDUSTRIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
          {/* Print Trigger Button */}
        <button
  type="button"
  onClick={handlePrint}
  className="hidden sm:flex w-full sm:w-auto px-3 py-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 transition-transform text-white font-medium rounded text-xs items-center justify-center gap-2"
>
  🖨️ Print List
</button>
  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 w-full my-3">
    <span className="w-full sm:w-auto px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 font-semibold text-xs text-center sm:text-left">
    Filtered: {studentsList.filter((stu) => {
      // 1. Flexible Section Filter (STT = Commercial, IND = Industrial, TE = Technical)
      if (printSection !== 'All' && printSection !== 'All Sections') {
        const pSec = printSection.toLowerCase();
        const sSec = String(stu.section || stu.education_type || stu.educationType || stu.school_type || '').toLowerCase();
        const sClass = String(stu.classLevel || stu.class_level || stu.className || stu.class || '').toLowerCase();
        
        let secMatch = sSec === pSec || sSec.includes(pSec) || pSec.includes(sSec);
        if (!secMatch) {
          if (pSec.includes('commercial') || pSec.includes('stt')) {
            secMatch = sSec.includes('commercial') || sSec.includes('stt') || sSec === 'te' || sSec.includes('technical') || sClass.includes('com') || sClass.includes('stt');
          } else if (pSec.includes('industrial') || pSec.includes('ind')) {
            secMatch = sSec.includes('industrial') || sSec.includes('ind') || sSec === 'te' || sSec.includes('technical') || sClass.includes('ind');
          } else if (pSec.includes('general')) {
            secMatch = sSec.includes('general') || sClass.includes('gen');
          }
        }
        if (!secMatch) return false;
      }

      // 2. Flexible Class Filter (Extracts short codes like 'Y1Com' or 'Y1Ind')
      if (printClass !== 'All' && printClass !== 'All Classes') {
        const pClass = printClass.toLowerCase();
        const sClass = String(stu.classLevel || stu.class_level || stu.className || stu.class || '').toLowerCase();
        const codeInParen = pClass.match(/\(([^)]+)\)/)?.[1] || '';
        const classMatch = sClass === pClass || sClass.includes(pClass) || pClass.includes(sClass) || (codeInParen !== '' && sClass.includes(codeInParen.toLowerCase()));
        if (!classMatch) return false;
      }
     if (printTrade !== 'All' && printTrade !== 'All Trades / Series' && printTrade !== '') {
        const pTrade = printTrade.toLowerCase();
        const sTrade = String(stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        if (sTrade && !sTrade.includes(pTrade) && !pTrade.includes(sTrade)) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const name = (stu.fullName || stu.fullname || stu.full_name || '').toLowerCase();
        const id = (stu.unique_code || stu.id || stu.student_id || '').toLowerCase();
        const cls = (stu.classLevel || stu.class_level || '').toLowerCase();
        const sec = (stu.section || '').toLowerCase();
        const trd = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !cls.includes(q) && !sec.includes(q) && !trd.includes(q)) return false;
      }
      return true;
    }).length
  }
</span>
</div>
</div>

<div className="relative group sm:w-auto w-full">
  <button
    type="button"
    onClick={handleExportExcel}
    className="w-full sm:w-auto px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-transform text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
  >
    📊 Export to Excel
  </button>
  
  {/* Pop-up Tooltip */}
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-active:flex flex-col items-center w-64 p-2.5 bg-[#0f172a] text-white text-[11px] rounded-md shadow-2xl border border-gray-700 pointer-events-none z-50 text-center leading-tight">
    Export student list to Excel. Easily re-enroll these students for the next academic year with a single click.
    <div className="w-2 h-2 bg-[#0f172a] border-r border-b border-gray-700 rotate-45 -mb-3 mt-1"></div>
  </div>
</div>

<button
  type="button"
  onClick={() => setShowPdfModal(true)}
  className="w-full sm:w-auto px-3 py-1.5 bg-rose-700 hover:bg-rose-600 active:scale-95 transition-transform text-white font-medium text-xs rounded flex items-center justify-center gap-1.5 cursor-pointer"
>
  📄 Download PDF
</button>
  </div>
  {/* PDF Export Modal */}
{showPdfModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-[#042014] border border-emerald-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
      {/* Decorative Green Glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

      <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wide">
        Select PDF Export Type
      </h3>

      <div className="flex flex-col gap-3">
        {/* Class List Option */}
        <button
          type="button"
          onClick={() => {
            setShowPdfModal(false);
            handleExportPDF('classList');
          }}
          className="w-full py-3 px-4 rounded-lg border border-emerald-500/50 bg-emerald-900/40 hover:bg-emerald-800/60 transition-all font-semibold text-emerald-300 hover:text-white flex items-center justify-between group"
        >
          <span className="animate-pulse underline underline-offset-4 decoration-emerald-400">
            📋 Class List (Roster)
          </span>
          <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">
            S/N, Name & Blank Columns
          </span>
        </button>

        {/* All Selected Fields Option */}
        <button
          type="button"
          onClick={() => {
            setShowPdfModal(false);
            handleExportPDF('all');
          }}
          className="w-full py-3 px-4 rounded-lg border border-emerald-500/50 bg-emerald-900/40 hover:bg-emerald-800/60 transition-all font-semibold text-emerald-300 hover:text-white flex items-center justify-between group"
        >
          <span className="animate-pulse underline underline-offset-4 decoration-emerald-400 delay-150">
            📑 All Selected Fields
          </span>
          <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">
            Full Table Details
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowPdfModal(false)}
        className="text-xs text-gray-400 hover:text-white underline mt-2"
      >
        Cancel
      </button>
    </div>
  </div>
)}
</div>
            {studentsList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No students registered yet. Use the "Register New Member" tab to add students.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1f2937] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Photo</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Section / Class</th>
                      <th className="p-3">Trade / Series</th>
                      <th className="p-3">Gender / Age</th>
<th className="p-3">Guardian Contact</th>
<th className="p-3">Residence</th>
<th className="p-3">Reg. Date / Time</th>
</tr>
</thead>
  <tbody className="divide-y divide-gray-800">
 
    
          {studentsList
                  .filter((stu) => {
                    if (printSection !== 'All' && stu.section?.toLowerCase() !== printSection.toLowerCase()) {
                      return false;
                    }
                    if (printClass !== 'All' && stu.classLevel?.toLowerCase() !== printClass.toLowerCase()) {
                      return false;
                    }
                  if (printTrade !== 'All') {
  const tradeVal = stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '';
  if (tradeVal.toLowerCase() !== printTrade.toLowerCase()) return false;
}
                    // Smart Search (First letters, Name, ID, Class, Section, Trade)
                    if (searchQuery.trim() !== '') {
  const q = searchQuery.toLowerCase().trim();
  const name = (stu.fullName || stu.fullname || stu.full_name || '').toLowerCase();
  const id = (stu.unique_code || stu.id || stu.student_id || '').toLowerCase();
  const cls = (stu.classLevel || stu.class_level || '').toLowerCase();
  const sec = (stu.section || '').toLowerCase();
  const trd = (stu.trades_series || stu.trade_series || stu.trade || stu.series || stu.specialty || '').toLowerCase();
                      const nameMatch = name.includes(q) || name.startsWith(q);
                      const idMatch = id.includes(q);
                      const classMatch = cls.includes(q);
                      const sectionMatch = sec.includes(q);
                      const tradeMatch = trd.includes(q);

                      if (!nameMatch && !idMatch && !classMatch && !sectionMatch && !tradeMatch) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                  .map((stu, i) => (
              <tr 
                key={i} 
                onClick={() => handleRowClick(stu)}
                className="hover:bg-gray-800/60 cursor-pointer transition"
              >
<td className="p-3 font-mono text-[10px] sm:text-sm text-amber-100 font-bold whitespace-nowrap">{stu.unique_code || stu.id}</td>
<td className="p-3"> 
  {stu.picture ? (
    <img src={stu.picture} alt="" className="w-12 h-12 rounded-lg object-cover border border-amber-500/50 shadow-sm" />
  ) : (
    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">No Photo</div>
  )}
</td>
<td className="p-3 font-semibold text-[11px] sm:text-base text-amber-100 whitespace-nowrap">{stu.fullName}</td>
             <td className="p-3">
  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
  <span className="text-[11px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/40">
    {stu.section}
  </span>
  <span className="text-[11px] text-gray-400">
    {stu.classLevel}
  </span>
</div>
    </td>
          <td className="p-3">
  <div className="font-semibold text-[14px] sm:text-sm text-amber-100">
    {stu.section?.toLowerCase() === 'general' ? 'N/A' : (stu.trades_series || stu.trade || stu.trade_series || stu.series || stu.specialty || '-')}
  </div>
</td>
                <td className="p-3"><span className="text-amber-200 font-medium">{stu.gender}</span>, {stu.age} yrs</td>
                <td className="p-3">
                  <div className="font-semibold text-white">{stu.guardianName}</div>
                  <div className="text-amber-200 font-mono text-xs">{stu.guardian_phone || stu.guardianPhone || 'N/A'}</div>
                </td>
                <td className="p-3">
  <div className="font-semibold text-white">{stu.residence || 'N/A'}</div>
</td>
               {/* REG DATE / TIME CELL */}
          <td className="p-3 text-[11px] leading-tight text-amber-200/90 whitespace-nowrap">
            <div className="font-semibold text-[11px] text-amber-200">
              {stu.created_at ? new Date(stu.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </div>
            <div className="text-[10px] text-blue-300/80 font-mono mt-0.5">
              {stu.created_at ? new Date(stu.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setStudentToDelete(stu); }}
                    className="bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-lg text-xs font-semibold border border-red-500/30 transition flex items-center justify-center gap-1 ml-auto"
                    title="Delete Student"
                  >
                    🗑️ <span className="hidden sm:inline">Delete</span>
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
                </table>
              </div>
            )}
          </div>
        )}

    {activeTab === 'teachers' && (
  <TeacherAssignment
    activeTab={activeTab}
    teachersList={teachersList}
    setTeachersList={setTeachersList}
    activeSchool={activeSchool}
    ALL_SUBJECTS_LIST={ALL_SUBJECTS_LIST}
    ALL_AVAILABLE_CLASSES={GENERAL_CLASSES_CATALOG}
    getAcademicYear={getCurrentAcademicYear}
    isEditing={isEditingSchedule}
    teacherToEdit={teacherToEdit}
    onClose={() => {
      setIsEditingSchedule(false);
      setTeacherToEdit(null);
    }}
  />
)}
        {/* ALL TEACHER LIST TAB (Updated: Summary of names, subjects taught, and ID that can be clicked to copy) */}
        {activeTab === 'teacher-list' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
           {/* Sub-tab buttons */}
        <div className="flex border-b border-gray-800 pb-3 space-x-4">
         <button
          onClick={() => setTeacherSubTab('assigned')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition ${
            teacherSubTab === 'assigned'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Assigned Teachers
        </button>

        </div>

        {/* 1. ASSIGNED TEACHERS SUB-TAB */}
        {teacherSubTab === 'assigned' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>All Assigned Teachers Summary (Click ID to Copy)</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30">
                Total: {teachersList.length}
              </span>
            </h2>
          </div>
          
        )}
            {teachersList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No teachers assigned yet. Use the "Assign New Teacher" tab to add faculty members.
              </div>
            ) : (
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {deleteBanner && (
    <div className="col-span-full mb-2 p-4 rounded-lg text-sm font-medium text-center shadow-lg transition-all bg-emerald-900/60 border border-emerald-500 text-emerald-300">
      {deleteBanner.message}
    </div>
  )}
  {teachersList.map((teacher, index) => ( 
<div key={`${teacher.id || teacher.teacher_id || 'teacher'}-${index}`} className="bg-[#1f2937]/50 border border-gray-800 p-5 rounded-xl space-y-4">
    <div>
      {/* Header: Teacher Name, Contact & Copyable ID */}
      <div className="flex justify-between items-start border-b border-gray-800 pb-3">
       <div>
  <h3 className="text-base font-bold text-white">{teacher.name}</h3>
  <p className="text-xs text-gray-400 mt-1">Phone: {teacher.phone || 'N/A'} | Email: {teacher.email || 'N/A'}</p>
</div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(teacher.id);
            alert(`Teacher ID ${teacher.id} copied to clipboard!`);
          }}
          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs px-2.5 py-1 rounded transition-colors"
          title="Click to copy Teacher ID"
        >
          ID {teacher.id} (Copy)
        </button>
      </div>

    </div>
    {/* Subject Log Inspection Buttons */}
<div className="pt-2 border-t border-gray-800">
  <span className="text-xs font-semibold text-gray-300 block mb-1.5">Click Subject to View Log Sheet:</span>
  <div className="flex flex-wrap gap-1.5">
   {(() => {
  const scheduleSlots = [];

  // Parse teacher.schedules (e.g. { Commerce: [{classLevel: '...'}], ... })
  if (teacher.schedules && typeof teacher.schedules === 'object') {
    Object.entries(teacher.schedules).forEach(([subjectName, slots]) => {
      if (Array.isArray(slots)) {
        slots.forEach(slot => {
          const classTitle = slot.classLevel || slot.className || slot.class || '';
          const exists = scheduleSlots.some(s => s.subject === subjectName && s.classLevel === classTitle);
          if (!exists) {
            scheduleSlots.push({ subject: subjectName, classLevel: classTitle });
          }
        });
      }
    });
  } 
  // Fallback if teacher.schedule is an array
  else if (Array.isArray(teacher.schedule)) {
    teacher.schedule.forEach(slot => {
      if (slot.subject) {
        const classTitle = slot.classLevel || slot.className || slot.class || '';
        const exists = scheduleSlots.some(s => s.subject === slot.subject && s.classLevel === classTitle);
        if (!exists) {
          scheduleSlots.push({ subject: slot.subject, classLevel: classTitle });
        }
      }
    });
  }

  // Final fallback to teacher.subjects array
  const displayItems = scheduleSlots.length > 0 
    ? scheduleSlots 
    : (teacher.subjects || []).map(s => ({
        subject: typeof s === 'object' ? (s.name || s.subject) : s,
        classLevel: teacher.classLevel || ''
      }));

  if (displayItems.length === 0) {
    return <span className="text-xs text-gray-500 italic">No log subjects assigned</span>;
  }

  return displayItems.map((item, sIdx) => (
    <button
      key={sIdx}
      onClick={() => setSelectedTeacherForLogs({
        teacher,
        subject: item.subject,
        classLevel: item.classLevel,
        className: item.classLevel,
        section: teacher.section
      })}
      className="bg-blue-900/40 border border-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs px-2.5 py-1 rounded flex items-center gap-2 mb-1.5"
    >
      <span>📄</span>
      <span>
        <strong>{item.subject}</strong>
        {item.classLevel && (
          <span className="ml-1.5 bg-blue-800/80 text-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
            ({item.classLevel})
          </span>
        )}
      </span>
      <span className="text-gray-400 text-[11px]">(View Logs & Progression)</span>
    </button>
  ));
})()}
  </div>
</div>

    {/* Dedicated Portal Signup Link Bar & Action Buttons */}
    <div className="pt-2 border-t border-gray-800 space-y-2.5">
      <div className="bg-[#111827] border border-gray-800 p-2 rounded flex items-center justify-between gap-2">
        <code className="text-xs font-mono text-emerald-400 truncate">
          {teacher.signupLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/staff-signup?role=teacher&id=${teacher.id}`}
        </code>
        <button
          onClick={() => {
            const link = teacher.signupLink || `${window.location.origin}/staff-signup?role=teacher&id=${teacher.id}`;
            navigator.clipboard.writeText(link);
            alert('Signup link copied to clipboard!');
          }}
          className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors"
        >
          Copy Link
        </button>
      </div>

      {/* Action Buttons Row: View Timetable & Delete */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedTeacherModal(teacher)}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-3 rounded transition-colors"
        >
          <span>📑</span> Click to See Timetable & Details
        </button>

        {confirmDeleteId === (teacher.teacher_id || teacher.id) ? (
  <div className="flex flex-col sm:flex-row items-center gap-2 bg-red-950/80 border border-red-700/80 p-2 rounded-lg">
    <span className="text-xs font-semibold text-red-200">
      Are you sure you want to delete {teacher.name}?
    </span>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={async () => {
          const targetId = teacher.teacher_id || teacher.id;
          const currentSchoolId = localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');

          const { error } = await supabase
            .from('teachers')
            .delete()
            .eq('teacher_id', targetId)
            .eq('school_id', currentSchoolId);

          if (error) {
            setDeleteBanner({ type: 'error', message: `Error deleting teacher: ${error.message}` });
            setConfirmDeleteId(null);
            return;
          }

          setTeachersList((prev) => prev.filter((t) => (t.teacher_id || t.id) !== targetId));
          setDeleteBanner({ type: 'success', message: `${teacher.name} has been permanently deleted.` });
          setConfirmDeleteId(null);

          setTimeout(() => setDeleteBanner(null), 4000);
        }}
        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1 px-2.5 rounded transition-all"
      >
        Yes, Delete
      </button>
      <button
        type="button"
        onClick={() => setConfirmDeleteId(null)}
        className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-xs py-1 px-2.5 rounded transition-all"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    type="button"
    onClick={() => setConfirmDeleteId(teacher.teacher_id || teacher.id)}
    className="bg-red-900/40 hover:bg-red-800/60 border border-red-700/60 text-red-300 font-bold text-xs py-2 px-3 rounded transition-all"
    title="Delete Teacher"
  >
    <span>🗑️</span> Delete
  </button>
)}
      </div>
    </div>
  </div>
))}
              </div>
            )}
          </div>
        )}

        {/* OTHER SCHOOL PERSONNEL TAB */}
        {activeTab === 'personnel' && (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>Other School Personnel (Bursar, Supervisors, Discipline Masters, Principals)</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 font-mono">
                Total: {personnelList.length}
              </span>
            </h2>

            {personnelList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No school personnel added yet. Use the "Register New Member" tab to add personnel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">Title Position</th>
                      <th className="p-3 border border-gray-700">Name</th>
                      <th className="p-3 border border-gray-700">Unique ID (Click to Copy)</th>
                      <th className="p-3 border border-gray-700">Contact / Email</th>
                      <th className="p-3 border border-gray-700">Signup Link</th>
                      <th className="p-3 border border-gray-700 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {personnelList.map((person) => (
                      <tr key={person.id} className="hover:bg-gray-800/40">
                        <td className="py-3 px-4 border border-gray-700 font-bold text-amber-300 uppercase">{person.role ? person.role.replace('_', ' ') : ''}</td>
<td className="py-3 px-4 border border-gray-700 font-semibold text-white">{person.full_name}</td>
                        <td className="p-3 border border-gray-700 font-mono">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(person.id);
                              alert(`Personnel ID ${person.id} copied to clipboard!`);
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded font-bold"
                            title="Click to copy ID"
                          >
                            {person.id} 📋
                          </button>
                        </td>
                        <td className="p-3 border border-gray-700">
                          <div>{person.phone}</div>
                          <div className="text-gray-400 text-[11px]">{person.email}</div>
                        </td>
                        <td className="p-3 border border-gray-700">
              {person.signup_link || person.signupLink ? (
                <button
                  onClick={() => {
                    const link = person.signup_link || person.signupLink;
                    navigator.clipboard.writeText(link);
                    alert(`Signup Link copied: ${link}`);
                  }}
                  className="px-2 py-1 bg-emerald-900/40 text-emerald-300 border border-emerald-700/60 rounded text-xs hover:bg-emerald-800/60 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  title="Click to copy signup link"
                >
                  <span>📋</span> Copy Link
                </button>
              ) : (
                <span className="text-gray-500 italic text-[11px]">N/A</span>
              )}
            </td>
                      <td className="p-3 border border-gray-700 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPersonnel(person);
                        setIsEditPersonnelModalOpen(true);
                      }}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded text-xs transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePersonnel(person.id)}
                      className="bg-red-900/40 hover:bg-red-900/70 border border-red-700/50 text-red-300 px-2.5 py-1 rounded text-xs transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SCHOOL DETAILS TAB */}
        {/* CLASS & COEFFICIENT SETTINGS TAB */}
     {activeTab === 'coefficients' && (
  <SubjectCoefficientsManager activeSchool={activeSchool} />
)} 

{/* GENERAL SETTINGS TAB */}
{activeTab === 'settings' && (
  <SchoolSettings 
    schoolId={activeSchool?.id || activeSchool} 
  />
)}
      
        {/* MASTER MARK SHEET TAB */}
{activeTab === 'master-marks' && (
  <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
      <div>
        <h2 className="text-xl font-bold text-white">Master Mark Sheet</h2>
        <p className="text-xs text-gray-400">View complete class performance breakdown across sequence evaluations</p>
      </div>
    </div>

    {/* Section Selector Bar */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-900/60 p-4 rounded-lg border border-gray-800">
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Section</label>
        <select
          value={masterSection}
          onChange={(e) => setMasterSection(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
        >
          <option value="General Education">General Education</option>
          <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
          <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
        </select>
      </div>
      {/* Right Side: Preview & Print Action Button */}
        <div className="md:col-span-3 flex items-end justify-end">
      {/* DYNAMIC TRACK-SPECIFIC BULK PRINT BUTTON */}
{(() => {
  const sectionLower = (masterSection || '').toLowerCase();
  
  if (sectionLower.includes('commercial') || sectionLower.includes('stt')) {
    return (
      <button
        type="button"
        onClick={() => handleOpenBulkReportCards('commercial', 'First Year Commercial (Y1Com)', printTrade || 'ALL', 'Term 1')}
        className="px-4 py-2.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-amber-300 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 border border-[#d8f3dc]/30"
      >
        <span>🏢</span> Technical Commercial Preview & Bulk Printing
      </button>
    );
  }

  if (sectionLower.includes('industrial') || sectionLower.includes('ind')) {
    return (
      <button
        type="button"
        onClick={() => handleOpenBulkReportCards('industrial', 'First Year Industrial (Y1Ind)', printTrade || 'ALL', 'Term 1')}
        className="px-4 py-2.5 bg-orange-900 hover:bg-orange-800 text-amber-300 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 border border-orange-700/50"
      >
        <span>⚙️</span> Technical Industrial Preview & Bulk Printing
      </button>
    );
  }

  // Default Fallback: General Education
  return (
    <button
      type="button"
      onClick={() => handleOpenBulkReportCards('general', classLevel || 'Form 1', 'ALL', 'Term 1')}
      className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 border border-blue-500/30"
    >
      <span>📄</span> General Education Preview & Bulk Printing
    </button>
  );
})()}
        </div>
    </div>

    {/* Render Section Specific Mark Sheet Component */}
    {masterSection?.includes('Commercial') ? (
      <TechnicalCommercialMarkSheet activeSchool={activeSchool} />
    ) : masterSection?.includes('Industrial') ? (
      <TechnicalIndustrialMarkSheet activeSchool={activeSchool} />
    ) : (
      <GeneralMarkSheet activeSchool={activeSchool} />
    )}

{/* BULK REPORT CARD MODALS */}
{bulkModalState.isOpen && bulkModalState.trackType === 'general' && (
  <BulkGeneralReportCard
    isOpen={bulkModalState.isOpen}
    onClose={handleCloseBulkModal}
    activeClass={bulkModalState.activeClass || 'Form 1'}
    activeTerm={bulkModalState.activeTerm || 'Term 1'}
    schoolInfo={activeSchool || {}}
  />
)}

{bulkModalState.isOpen && bulkModalState.trackType === 'commercial' && (
  <BulkTechnicalCommercialReportCard
    isOpen={bulkModalState.isOpen}
    onClose={handleCloseBulkModal}
    activeClass={bulkModalState.activeClass || 'First Year Commercial (Y1Com)'}
    activeTrade={bulkModalState.activeTrade || 'ALL'}
    activeTerm={bulkModalState.activeTerm || 'Term 1'}
    schoolInfo={activeSchool || {}}
  />
)}

{bulkModalState.isOpen && bulkModalState.trackType === 'industrial' && (
  <BulkTechnicalIndustrialReportCard
    isOpen={bulkModalState.isOpen}
    onClose={handleCloseBulkModal}
    activeClass={bulkModalState.activeClass || 'First Year Industrial (Y1Ind)'}
    activeTrade={bulkModalState.activeTrade || 'ALL'}
    activeTerm={bulkModalState.activeTerm || 'Term 1'}
    schoolInfo={activeSchool || {}}
  />
)}
  </div>
)}
        {activeTab === 'details' && (
          <div className="bg-[#0b1329] border border-gray-800 p-4 sm:p-8 rounded-2xl w-full max-w-7xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">School Parameters & Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Official Name</label>
                <input 
                  type="text" 
                  value={activeSchool?.name || ''}
                  disabled 
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                />
              </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* SCHOOL MOTTO */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      School Motto
    </label>
    <input
      type="text"
      value={schoolMotto || ''}
      onChange={(e) => setSchoolMotto(e.target.value)}
      placeholder="e.g. Discipline, Hard Work, Success"
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
    />
  </div>

  {/* SCHOOL REGION */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      School Region (MINSEC Delegation)
    </label>
    <input
      type="text"
      value={schoolRegion || ''}
      onChange={(e) => setSchoolRegion(e.target.value)}
      placeholder="e.g. NORTH WEST REGION"
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
    />
  </div>
</div>
              <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              School Official Logo
            </label>
            <div className="flex items-center space-x-4">
              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt="School Logo Preview"
                  className="h-16 w-16 object-cover rounded-lg border border-gray-700 bg-[#1f2937]"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
              />
            </div>
          </div>

{/* ADMINISTRATOR CONTACT LINE (EDITABLE) */}
<div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
    Administrator Contact Line
  </label>
  <input
    type="text"
    value={schoolContact}
    onChange={(e) => setSchoolContact(e.target.value)}
    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
  />
</div>

{/* SCHOOL OFFICIAL EMAIL (EDITABLE) */}
<div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
    School Official Email
  </label>
  <input
    type="email"
    value={schoolEmail}
    onChange={(e) => setSchoolEmail(e.target.value)}
    placeholder="e.g. admin@school.cm"
    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
  />
</div>

{/* ACADEMIC YEAR - DYNAMIC SINGLE SOURCE OF TRUTH (STATIC) */}
<div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
    Academic Year
  </label>
  <input
    type="text"
    value={activeSchool?.academic_year || getCurrentAcademicYear()}
    disabled
    readOnly
    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
  />
</div>
{/* ACADEMIC YEAR DATES (EDITABLE) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
      Academic Year Start Date
    </label>
    <input
      type="date"
      value={academicYearStartDate}
      onChange={(e) => setAcademicYearStartDate(e.target.value)}
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
      Academic Year End Date
    </label>
    <input
      type="date"
      value={academicYearEndDate}
      onChange={(e) => setAcademicYearEndDate(e.target.value)}
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
    />
  </div>
</div>
      <div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
    Address / Location
  </label>
  <input
    type="text"
    value={schoolLocation}
    onChange={(e) => setSchoolLocation(e.target.value)}
    className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
  />
</div>
{/* SCHOOL RULES & REGULATIONS */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              School Rules & Regulations
            </label>
            <textarea
              rows={6}
              value={schoolRules}
              onChange={(e) => setSchoolRules(e.target.value)}
              placeholder="Type, paste, or format internal school rules, policies, or code of conduct..."
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans shadow-inner"
            />
            {/* DOCUMENT UPLOAD (PDF / WORD <= 0.5MB) */}
            <div className="bg-[#1f2937] p-3 rounded-lg border border-gray-700 mt-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                Upload Official Rules Document (PDF / Word — Max 0.5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleRulesFileUpload}
                className="block w-full text-xs text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 hover:file:bg-blue-500 file:text-white hover:file:bg-amber-500 cursor-pointer"
              />
              {rulesFileUrl && (
                <p className="mt-2 text-xs text-green-400 font-medium truncate">
                  Attached: {rulesFileUrl}
                </p>
              )}
            </div>
          </div>
          {/* CUSTOM SUCCESS / ERROR BANNER */}
        {deleteBanner && (
          <div className={`mb-4 p-4 rounded-xl flex items-center justify-between text-sm font-medium animate-fade-in ${
            (deleteBanner.type === 'error' || deleteBanner.isError)
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{typeof deleteBanner === 'string' ? deleteBanner : deleteBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteBanner(null)} 
              className="opacity-70 hover:opacity-100 text-xs uppercase tracking-wider font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}
              <button
             type="button"
             onClick={(e) => handleSaveSchoolDetails(e)}
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all cursor-pointer"
             >
             Save Changes
            </button>
            </div>
          </div>
        )}
      </main>
      {/* EDIT PERSONNEL MODAL SCREEN */}
      {isEditPersonnelModalOpen && editingPersonnel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => {
                setIsEditPersonnelModalOpen(false);
                setEditingPersonnel(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">
              Edit School Personnel Details
            </h2>

            <form onSubmit={handleUpdatePersonnel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPersonnel.full_name || editingPersonnel.fullName || ''}
                  onChange={(e) =>
                    setEditingPersonnel({ ...editingPersonnel, full_name: e.target.value, fullName: e.target.value })
                  }
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Contact Phone (6xxxxxxxx) *
                </label>
                <input
                  type="tel"
                  required
                  value={editingPersonnel.phone || ''}
                  onChange={(e) => setEditingPersonnel({ ...editingPersonnel, phone: e.target.value })}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editingPersonnel.email || ''}
                  onChange={(e) => setEditingPersonnel({ ...editingPersonnel, email: e.target.value })}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Residence / Quarter
                </label>
                <input
                  type="text"
                  value={editingPersonnel.residence || ''}
                  onChange={(e) => setEditingPersonnel({ ...editingPersonnel, residence: e.target.value })}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Role / Title
                </label>
                <select
                  value={editingPersonnel.role || editingPersonnel.title || 'teacher'}
                  onChange={(e) => setEditingPersonnel({ ...editingPersonnel, role: e.target.value, title: e.target.value })}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="teacher">Teacher</option>
                  <option value="bursar">Bursar</option>
                  <option value="principal">Principal</option>
                  <option value="discipline_master">Discipline Master</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPersonnelModalOpen(false);
                    setEditingPersonnel(null);
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{/* EDIT STUDENT MODAL SCREEN */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">
              Edit Student Credentials ({editFormData.unique_code || editFormData.id})
            </h2>

            {/* Large Student Facial Inspection Photo */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-4 border-amber-500 shadow-xl bg-gray-800 flex items-center justify-center mb-2">
                {editFormData.picture ? (
                  <img
                    src={editFormData.picture}
                    alt={editFormData.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">No Photo Available</div>
                )}
              </div>
          <label className="mt-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition">
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditFormData({ ...editFormData, picture: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editFormData.fullName || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fullName: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={editFormData.section || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, section: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Class Level</label>
                  <input
                    type="text"
                    value={editFormData.classLevel || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, classLevel: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Gender</label>
                  <select
                    value={editFormData.gender || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, gender: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={editFormData.guardianName || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, guardianName: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={editFormData.guardianPhone || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, guardianPhone: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none"
                  />
                </div>
                {/* Student Direct Phone */}
<div>
  <label className="block text-xs font-semibold text-gray-400 mb-1">Student Phone</label>
  <input
    type="text"
    value={editFormData.phone || editFormData.student_phone || ''}
    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
    placeholder="Optional (e.g. 670000000)"
    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm"
  />
</div>
{/* Technical Specialty Trade Field */}
{(editFormData.section?.toLowerCase().includes('technical') || editFormData.trade) && (
  <div>
    <label className="block text-xs font-semibold text-amber-400 mb-1">Technical Specialty Trade</label>
    <input
      type="text"
      value={editFormData.trade || editFormData.trade_series || editFormData.specialty || ''}
      onChange={(e) => setEditFormData({ ...editFormData, trade: e.target.value })}
      placeholder="e.g. Building Construction"
      className="w-full bg-gray-800 border border-amber-500/50 rounded-lg p-2.5 text-amber-300 text-sm font-medium"
    />
  </div>
)}
              </div>
{/* Medical Notes & Health History (View/Edit Only - Excluded from Printouts) */}
          <div className="col-span-1 md:col-span-2 space-y-1 mt-2">
            <label className="block text-xs font-semibold text-amber-400">
              Medical Notes / Health History
            </label>
            <input
              list="common-medical-conditions"
              type="text"
              placeholder="Select or type condition (e.g. Asthma, Peanut Allergy...)"
              value={editFormData.medical_history || ''}
              onChange={(e) => setEditFormData({ ...editFormData, medical_history: e.target.value })}
              className="w-full bg-gray-900/90 text-white placeholder-gray-500 text-xs px-3 py-2 rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none transition shadow-inner"
            />
            <datalist id="common-medical-conditions">
              <option value="None / No Known Medical Conditions" />
              <option value="Asthma / Respiratory Conditions" />
              <option value="Peanut / Groundnut Allergy" />
              <option value="Penicillin / Antibiotic Allergy" />
              <option value="Sickle Cell Trait / Anemia" />
              <option value="Lactose Intolerance" />
              <option value="Dust & Pollen Allergy" />
              <option value="Epilepsy / Seizure History" />
            </datalist>
            <p className="text-[10px] text-gray-400 italic">
              ℹ️ Confidential internal note. Visible on administrative screen only (excluded from official printouts).
            </p>
          </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm transition"
                >
                  Save & Update Student
                </button>
              </div>
              {/* Universal Red Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-600/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Permanent Deletion</h3>
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Warning: Action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-300 bg-gray-800/80 p-4 rounded-xl border border-gray-700/50 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white underline decoration-red-500">{studentToDelete.fullName || studentToDelete.full_name}</span> permanently from student records?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm rounded-xl transition-all"
              >
                No, Cancel
              </button>
              <button
  type="button"
  disabled={isDeleting}
  onClick={confirmDeleteStudent}
  className={`px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-lg transition-all ${
    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
  }`}
>
  {isDeleting ? 'Deleting...' : 'Yes, Delete Student'}
</button>
            </div>
          </div>
        </div>
      )}
            </form>
          </div>
        </div>
      )}
      {/* VIEW / EDIT TEACHER TIMETABLE & DETAILS MODAL */}
      {selectedTeacherModal && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          
           <div id="teacher-timetable-print-area" className="printable-modal bg-[#111827] border border-gray-800 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedTeacherModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold no-print"
            >
              
            </button>

            {/* Header & Details */}
            <div className="border-b border-gray-800 pb-4 mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {selectedTeacherModal.picture ? (
                  <img
                    src={selectedTeacherModal.picture}
                    alt={selectedTeacherModal.name}
                    className="w-16 h-16 rounded-full object-cover border border-amber-400"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-400">
                    No Photo
                  </div>
                )}
                <div id="printable-teacher-timetable">
                  <h2 className="text-2xl font-bold text-amber-400">{selectedTeacherModal.name || 'Unnamed Teacher'}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: <span className="font-mono text-gray-200">{selectedTeacherModal.id}</span> | Email: {selectedTeacherModal.email || 'N/A'} | Phone: {selectedTeacherModal.phone || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Section: <span className="text-amber-300">{selectedTeacherModal.section || 'N/A'}</span> | Residence: {selectedTeacherModal.residence || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Share & Download */}
              <div className="flex gap-2 no-print">
                <button
                  onClick={async () => {
                   const link = `${window.location.origin}/staff-signup?role=teacher&token=${selectedTeacherModal.invite_token || 'default'}&id=${selectedTeacherModal.custom_id || selectedTeacherModal.unique_id || selectedTeacherModal.id}`;
                    const shareText = `Teacher Portal Access for ${selectedTeacherModal.name || 'Teacher'}\nID: ${selectedTeacherModal.id || selectedTeacherModal.teacher_id || ''}`;

                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `Teacher Credentials: ${selectedTeacherModal.name}`,
                          text: shareText,
                          url: link || undefined,
                        });
                      } catch (err) {
                        console.log('Share canceled or failed:', err);
                      }
                    } else {
                      // WhatsApp Fallback
                     const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\nLink: ${link}`)}`;
                      window.open(waUrl, '_blank');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition"
                >
                  📱 Share via WhatsApp
                </button>
               <button
  type="button"
  onClick={() => window.print()}
  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 rounded-lg no-print"
>
  Print Timetable
</button>
<button
  type="button"
  onClick={() => {
    if (!selectedTeacherModal) return;

    // 1. Extract raw schedules using your exact component logic
    const rawSchedules = selectedTeacherModal?.schedules || selectedTeacherModal?.timetable || {};
    let scheduleArray = [];

    if (Array.isArray(rawSchedules)) {
      scheduleArray = rawSchedules;
    } else if (typeof rawSchedules === 'object' && rawSchedules !== null) {
      Object.entries(rawSchedules).forEach(([subjectName, slots]) => {
        if (Array.isArray(slots)) {
          slots.forEach((s) => scheduleArray.push({ ...s, subject: subjectName, className: s.className || s.class }));
        }
      });
    }

    if (scheduleArray.length === 0 && selectedTeacherModal.timetable && Array.isArray(selectedTeacherModal.timetable)) {
      scheduleArray = selectedTeacherModal.timetable;
    }

    // 2. Derive exact subjects and classes matching your UI state
    const subjectsList = Array.from(new Set(scheduleArray.map((item) => item.subject).filter(Boolean)));
    const dynamicClasses = Array.from(new Set(scheduleArray.map((item) => item.className).filter(Boolean)));

    if (subjectsList.length === 0 || dynamicClasses.length === 0) {
      alert('No timetable data available to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const teacherName = selectedTeacherModal.name || 'Teacher';
    const school = schoolName || activeSchoolName || 'DEVELOPPER TEST INSTITUTE';

    // 3. Document Header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`Teacher Timetable - ${teacherName}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`School: ${school} | Academic Year: ${getCurrentAcademicYear()}`, 14, 22);

    // 4. Construct Table Header & Body
    const head = [['SUBJECTS', ...dynamicClasses]];
    const body = subjectsList.map((subj) => {
      const row = [subj];
      dynamicClasses.forEach((cls) => {
        const matchingSlots = scheduleArray.filter(
          (item) => item.subject === subj && item.className === cls
        );

        if (matchingSlots.length > 0) {
          const slotDetails = matchingSlots
            .map((s) => `${s.day || ''}\n${s.startTime || s.period || ''} - ${s.endTime || ''}`.trim())
            .join('\n\n');
          row.push(slotDetails);
        } else {
          row.push('-');
        }
      });
      return row;
    });

    // 5. Generate Pure Black & White PDF Grid
    autoTable(doc, {
      head: head,
      body: body,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' }
      }
    });

    doc.save(`${teacherName.replace(/\s+/g, '_')}_Timetable.pdf`);
  }}
  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
>
  Download PDF
</button>
              </div>
            </div>
            
{/* Dynamic School & Academic Year Banner for Multi-Tenant Isolation */}
        <div id="printable-teacher-timetable" className="grid grid-cols-3 gap-2 bg-[#1f2937]/60 border border-gray-800 p-3 rounded-xl mb-4">
          <div className="text-gray-400">ASSIGNED CLASSES & SUBJECTS</div>
          <div className="text-center text-amber-400 font-extrabold">
  {activeSchool?.name || activeSchool?.school_name || (typeof window !== 'undefined' ? (localStorage.getItem('active_school_name') || localStorage.getItem('school_name')) : '') || '-'}
</div>

<div className="text-right flex items-center justify-end gap-2">
  <span className="text-xs text-emerald-400 hidden sm:inline">ACADEMIC YEAR: {getCurrentAcademicYear()}</span>
  <button
    type="button"
    onClick={handleToggleLock}
    disabled={isTogglingLock}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md border ${
      isMarkEntryAuthorized
        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 hover:bg-emerald-600 hover:text-white'
        : 'bg-rose-600/20 border-rose-500 text-rose-300 hover:bg-rose-600 hover:text-white'
    }`}
  >
    <span>{isMarkEntryAuthorized ? '🔓 Marks: AUTHORIZED' : '🔒 Marks: FROZEN'}</span>
  </button>
</div>
        </div>
            {/* Assigned Classes & Subjects */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Assigned Classes & Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(selectedTeacherModal.subjects) && selectedTeacherModal.subjects.length > 0 ? (
                  selectedTeacherModal.subjects.map((sub, idx) => (
                    <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-medium">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 italic">No subjects assigned</span>
                )}
              </div>
            </div>

            {/* Class Timetable Matrix (Dynamic Columns & Rows) */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Class Timetable</h3>
             <div className="overflow-x-auto border border-gray-800 rounded-xl p-4 bg-slate-900 print:bg-white print:text-black">
                {(() => {
                 const rawSchedules = selectedTeacherModal?.schedules || selectedTeacherModal?.timetable || {};
let scheduleArray = [];

                  if (Array.isArray(rawSchedules)) {
                    scheduleArray = rawSchedules;
                  } else if (typeof rawSchedules === 'object' && rawSchedules !== null) {
                    Object.entries(rawSchedules).forEach(([subjectName, slots]) => {
                      if (Array.isArray(slots)) {
                        slots.forEach((s) => scheduleArray.push({ ...s, subject: subjectName, className: s.className || s.class || 'N/A', startTime: s.startTime || s.start_time || 'N/A', endTime: s.endTime || s.end_time || 'N/A' }));
                      }
                    });
                  }

                  if (scheduleArray.length === 0 && selectedTeacherModal.timetable && Array.isArray(selectedTeacherModal.timetable)) {
                    scheduleArray = selectedTeacherModal.timetable;
                  }
const subjectsList = Array.from(
  new Set(scheduleArray.map((item) => item.subject).filter(Boolean))
);
const dynamicClasses = Array.from(
  new Set(scheduleArray.map((item) => item.className).filter(Boolean))
);

if (subjectsList.length === 0 || dynamicClasses.length === 0) {
  return (
    <div className="p-6 text-center text-xs text-gray-500 italic">
      No active timetable matrix generated for this teacher.
    </div>
  );
}

return (
  <table className="w-full text-left border-collapse border border-gray-700 min-w-[600px]">
    <thead>
      <tr className="bg-gray-800 text-amber-400 text-xs uppercase font-bold border-b border-gray-700">
        <th className="p-3 border-r border-gray-700 w-1/4">Subjects</th>
        {dynamicClasses.map((cls, idx) => (
          <th key={idx} className="p-3 border-r border-gray-700 text-center last:border-r-0">
            {cls}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-700 text-xs">
      {subjectsList.map((subj, rowIdx) => (
        <tr key={rowIdx} className="hover:bg-gray-800/40 border-b border-gray-700">
          {/* Subject Column */}
          <td className="p-3 font-semibold text-white bg-gray-900/60 border-r border-gray-700">
            {subj}
          </td>
          {/* Class Cell Intersections */}
          {dynamicClasses.map((cls, colIdx) => {
            const matchingSlots = scheduleArray.filter(
              (slot) => slot.subject === subj && slot.className === cls
            );

            return (
              <td key={colIdx} className="p-3 border-r border-gray-700 text-center align-middle last:border-r-0">
                {matchingSlots.length > 0 ? (
                  <div className="space-y-1">
                    {matchingSlots.map((slot, sIdx) => (
                      <div key={sIdx} className="bg-emerald-950/60 border border-emerald-600 text-emerald-300 rounded px-2 py-1 text-[11px] font-medium">
                        <div>{slot.day}</div>
                        <div className="text-[10px] text-emerald-400">{slot.startTime} - {slot.endTime}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-600 font-mono">—</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
);
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-between items-center no-print">
              <button
  onClick={() => { handleEditTeacherSchedule(selectedTeacherModal); setSelectedTeacherModal(null); }}
  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded transition"
>
  Edit Schedule & Workload
</button>
              <button
                onClick={() => setSelectedTeacherModal(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
     
      {showWelcomeOverlay && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full p-6 sm:p-8 text-white shadow-2xl relative">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          🎓
        </div>
        <h2 className="text-2xl font-extrabold text-blue-400">
          Welcome to NsuhRecords, thank you for trusting us!
        </h2>
        <p className="text-gray-300 text-sm font-semibold mt-2">
          School administration dashboard for <span className="text-blue-300 font-bold">{activeSchool?.name || activeSchool?.institution_name || "Your School"}</span>
        </p>
      </div>

      <div className="space-y-4 text-sm text-gray-300 bg-gray-800 p-5 rounded-lg border border-gray-700 max-h-[50vh] overflow-y-auto">
        <p className="font-semibold text-blue-300">
          This innovative school management application helps you:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Easily register and manage new students.</li>
          <li>Assign teachers and generate downloadable time tables upon assignment.</li>
          <li>Empower teachers to record student marks easily with their phones.</li>
          <li>Manage institutional financial records seamlessly.</li>
          <li>Help parents track real-time live performance of their children at school.</li>
          <li>Track and record student attendance.</li>
          <li>Permit school supervisors to have access and control school records.</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={async () => {
            setShowWelcomeOverlay(false);
            if (activeSchool?.school_id) {
              await supabase
                .from('assigned_schools')
                .update({ has_onboarded: true })
                .eq('school_id', activeSchool.school_id);
            }
          }}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition duration-200 shadow-lg"
        >
          Proceed to Administrator Dashboard
        </button>
      </div>
    </div>
  </div>
)}
{/* Dedicated Progression Sheet Modal */}
      {/* Dedicated Progression Sheet Modal - View Only Mode */}
      {selectedTeacherForLogs && (
        
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#FDFBF7] border-2 border-[#2D5A27] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-gray-900 overflow-hidden">
            
            {/* Modal Forest Green Header */}
            <div className="bg-[#2D5A27] text-white p-4 flex items-center justify-between shadow-md">
              <div>
                <h2 className="text-lg font-bold tracking-wide uppercase text-white flex items-center gap-2">
                  <span>📄</span> Progression Sheet (View Only)
                </h2>
                <div className="text-xs text-emerald-100 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Teacher: <strong className="text-white">{selectedTeacherForLogs?.teacher?.name || selectedTeacherForLogs?.teacher?.full_name || 'Staff Member'}</strong></span>
                  <span className="text-emerald-300">|</span>
                  <span>Subject: <strong className="text-white">{selectedTeacherForLogs?.subject || 'N/A'}</strong></span> | <span>classLevel: <strong className="text-white">{selectedTeacherForLogs?.classLevel || selectedTeacherForLogs?.className || 'N/A'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacherForLogs(null)}
                className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 transition-colors text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Actions & Active Class Bar */}
            <div className="bg-[#EFECE6] border-b border-[#2D5A27]/30 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="bg-[#EFECE6] border-b border-[#2D5A27]/30 px-5 py-3 flex items-center justify-between flex-wrap gap-2 text-xs">
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
      <span className="text-gray-700">Active Class Sheet:</span>
      <span className="bg-[#2D5A27] text-white px-3 py-1 rounded-md font-bold tracking-wide">
        {selectedTeacherForLogs?.section || 'General'}
      </span>
    </div>
    
    {/* World-Class ClassLogs Metrics */}
    
  </div>
</div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#2D5A27] font-bold">Academic Year: {getCurrentAcademicYear() || '2026/2027'}</span>
              {/* Dynamic Metrics Badge */}
                  <div className="flex items-center gap-2 bg-[#EFECE6] border border-[#2D5A27]/30 text-[#2D5A27] text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs">
                    <span>LOGGED ENTRIES:</span>
                    <span className="bg-[#2D5A27] text-white px-2 py-0.5 rounded text-[11px] font-extrabold">
                      {completedLogsCount}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span>HOURS TAUGHT:</span>
                    <span className="bg-[#2D5A27] text-white px-2 py-0.5 rounded text-[11px] font-extrabold">
                      {totalHoursTaught} hrs
                    </span>
                  </div>

                  {/* Copy Supervisor Link Button */}
                  <button
                    onClick={() => {
                      const teacherId = selectedTeacherForLogs.teacher_id || selectedTeacherForLogs.id;
                      const subject = encodeURIComponent(selectedTeacherForLogs.subject);
                      const shareableUrl = `${window.location.origin}/progression-sheet?teacherId=${teacherId}&subject=${subject}`;
                      navigator.clipboard.writeText(shareableUrl);
                      alert("Copied shareable link to clipboard! Anyone with this link can view the progression sheet.");
                    }}
                    className="bg-[#2D5A27] hover:bg-[#1e3e1a] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>🔗</span> Copy Supervisor Link
                  </button>
              </div>
            </div>

            {/* Content Body - White-Beige Theme */}
            <div className="p-5 overflow-y-auto flex-1 bg-[#FDFBF7]">
              
              <div className="border-2 border-[#2D5A27] rounded-lg overflow-hidden bg-[#FDFBF7] shadow-sm">
                <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2D5A27] text-white text-xs font-bold uppercase tracking-wider">
                <th className="p-3 border border-[#2D5A27] w-[10%] text-center">Week</th>
                <th className="p-3 border border-[#2D5A27] w-[15%] text-center">Date & Time</th>
                <th className="p-3 border border-[#2D5A27] w-[50%] text-center">Lesson Taught</th>
                <th className="p-3 border border-[#2D5A27] w-[25%] text-center">Supervisor Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D5A27]/30 text-xs">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-600 font-medium bg-[#FDFBF7]">
                    Loading teacher logs...
                  </td>
                </tr>
              ) : fetchedLessonLogs && fetchedLessonLogs.length > 0 ? (
                (() => {
                  const groupedMap = new Map();
                  fetchedLessonLogs.forEach((log) => {
                    const weekNum =
                      log.week_number ||
                      calculateAcademicWeek(
                        academicYearStartDate,
                        log.date_logged || log.created_at
                      );
                    if (!groupedMap.has(weekNum)) {
                      groupedMap.set(weekNum, []);
                    }
                    groupedMap.get(weekNum).push(log);
                  });

                  return Array.from(groupedMap.entries()).flatMap(
                    ([weekNum, logs]) =>
                      logs.map((log, index) => {
                        const logDate = log.date_logged || log.created_at;
                        const formattedDate = logDate
                          ? new Date(logDate).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              month: 'short',
                              day: '2-digit',
                            })
                          : '-';
                        const formattedTime = logDate
                          ? new Date(logDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '';

                        return (
                          <tr
                            key={log.id || `${weekNum}-${index}`}
                            className="bg-[#FDFBF7] hover:bg-[#EFECE6]/50"
                          >
                            {index === 0 && (
                              <td
                                rowSpan={logs.length}
                                className="p-3 border border-[#2D5A27]/40 text-center font-bold text-[#2D5A27] bg-[#EFECE6] align-middle"
                              >
                                <div className="text-xs font-extrabold">
                                  W{weekNum}
                                </div>
                              </td>
                            )}
                            {/* Lesson Taught Cell with Drawing/Image Attachment Support */}
                          {/* Column 2: Date & Time */}
                            <td className="p-3 border border-[#2D5A27]/40 text-center text-[11px] font-medium text-gray-800 bg-[#FDFBF7] align-top">
                              <div>{formattedDate}</div>
                              {formattedTime && (
                                <span className="text-[10px] text-[#2D5A27] font-bold">
                                  {formattedTime}
                                </span>
                              )}
                            </td>

                          {/* Column 3: Lesson Taught (Wide, Centered Header, Spacious Text) */}
                            <td className="p-3 border border-[#2D5A27]/40 font-medium text-gray-900 bg-[#FDFBF7] align-top text-left">
                              <div className="whitespace-pre-line text-xs leading-relaxed break-words">
                                {log.lesson_content && log.lesson_content !== 'EMPTY'
                                  ? log.lesson_content
                                  : 'No lesson details entered'}
                              </div>

                              {/* Attachment Preview Chip */}
                              {(log.attachment_url || log.image_url) && (
                                <div className="mt-2.5 flex items-center gap-2">
                                  <a
                                    href={log.attachment_url || log.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] text-[10px] font-bold px-2.5 py-1 rounded border border-[#2D5A27]/30 transition-colors"
                                  >
                                    <span>🖼️</span> View Attached Diagram / Work
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* Column 4: Status & Supervisor Remarks */}
                            {/* Column 4: Dedicated Supervisor Remarks Editor */}
<td className="p-3 border border-[#2D5A27]/40 bg-[#FDFBF7] text-center align-top">
  <div className="text-left">
    {editingRemarkId === log.id ? (
      /* Active Editing Box */
      <div className="space-y-1.5">
        <textarea
          value={tempRemarkText}
          onChange={(e) => setTempRemarkText(e.target.value)}
          placeholder="Type supervisor remark..."
          className="w-full text-[10px] p-2 border border-[#2D5A27] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
          rows={2}
        />
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => { setEditingRemarkId(null); setTempRemarkText(""); }}
            className="text-[9px] px-2 py-0.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSaveSupervisorRemark(log.id)}
            disabled={savingRemark}
            className="text-[9px] px-2.5 py-0.5 text-white bg-[#2D5A27] hover:bg-[#1e3e1a] rounded font-bold shadow-xs"
          >
            {savingRemark ? 'Saving...' : 'Save Remark'}
          </button>
        </div>
      </div>
    ) : log.supervisor_remark || log.admin_remark || log.remarks ? (
      /* Display Saved Supervisor Remark with Edit Option */
      <div className="bg-[#2D5A27]/10 border-l-2 border-[#2D5A27] p-2 rounded-r text-[10px] text-gray-800">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-extrabold text-[#2D5A27] flex items-center gap-1 uppercase tracking-wider text-[9px]">
            💬 Remark
          </span>
          <button
            onClick={() => {
              setEditingRemarkId(log.id);
              setTempRemarkText(log.supervisor_remark || log.admin_remark || log.remarks || "");
            }}
            className="text-[9px] text-[#2D5A27] underline font-bold hover:text-black"
          >
            Edit
          </button>
        </div>
        <p className="italic leading-tight font-medium text-gray-700">
          "{log.supervisor_remark || log.admin_remark || log.remarks}"
        </p>
      </div>
    ) : (
      /* Clickable Button to Add Remark */
      <button
        onClick={() => {
          setEditingRemarkId(log.id);
          setTempRemarkText("");
        }}
        className="w-full bg-gray-100/80 hover:bg-[#2D5A27]/10 border border-dashed border-gray-300 hover:border-[#2D5A27] p-2 rounded text-center text-[10px] text-gray-600 hover:text-[#2D5A27] font-medium italic transition-colors flex items-center justify-center gap-1"
      >
        <span>✏️</span> Add Supervisor Remark
      </button>
    )}
  </div>
</td>
                          </tr>
                        );
                      })
                  );
                })()
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center py-6 text-gray-500 italic bg-[#FDFBF7]"
                  >
                    No lesson logs recorded for this subject yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
         App Conceived by Norbert Che Nsuh - 682491189
      </footer>
    </div>
    
  );
}