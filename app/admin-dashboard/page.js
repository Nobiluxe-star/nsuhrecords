'use client';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
// Cameroon Ministry of Secondary Education Official Classes, Technical & Commercial Trades, Subjects & Series Catalog
const GENERAL_LOWER_CLASSES = [
  'Form 1 (F1)',
  'Form 2 (F2)',
  'Form 3 (F3)',
  'Form 4 (F4)',
  'Form 5 (F5 Arts)',
  'Form 5 (F5 Science)'
];
const GENERAL_CLASSES_CATALOG = [
  'Form 1 (F1)',
  'Form 2 (F2)',
  'Form 3 (F3)',
  'Form 4 (F4)',
  'Form 5 (F5 Arts)',
  'Form 5 (F5 Science)',
  'Lower Sixth Arts (L6A)',
  'Lower Sixth Science (L6S)',
  'Upper Sixth Arts (U6A)',
  'Upper Sixth Science (U6S)',
];

const TECHNICAL_COMMERCIAL_CATALOG = [
  'First Year Commercial (Y1Com)',
  'Second Year Commercial (Y2Com)',
  'Third Year Commercial (Y3Com)',
  'Fourth Year Commercial / CAP / CAPIET (Y4Com)',
  'Fifth Year Commercial / Seconde (Y5Com)',
  'Lower Sixth Commercial / Première (Probatoire Com)',
  'Upper Sixth Commercial / Terminale (Baccalauréat Com)',
];

const TECHNICAL_INDUSTRIAL_CATALOG = [
  'First Year Industrial (Y1Ind)',
  'Second Year Industrial (Y2Ind)',
  'Third Year Industrial (Y3Ind)',
  'Fourth Year Industrial / CAP / CAPIET (Y4Ind)',
  'Fifth Year Industrial / Seconde (Y5Ind)',
  'Lower Sixth Industrial / Première (Probatoire Ind)',
  'Upper Sixth Industrial / Terminale (Baccalauréat Ind)',
];

// Series mapping for Upper/Lower Sixth General
const GENERAL_SERIES_CATALOG = {
  ARTS: ['A1', 'A2', 'A3', 'A4', 'A5'],
  SCIENCE: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
};

// Trade Series mapping for Technical Commercial
const COMMERCIAL_TRADE_SERIES = [
  'FOUNDATIONAL',
  'G1 - Secretarial Studies',
  'G2 - Accounting and Management',
  'G3 - Commercial Action / Marketing',
  'FIG - Taxation and Management Information Systems',
  'ACA - Administrative Action and Communication',
  'HE - Home Economics',
  'IH - Bespoke Tailoring',
  'HOT - Hotel Management',
  'TO - Tourism',
  'BO - Bakery and Pastry'
];

// Trade Series mapping for Technical Industrial
const INDUSTRIAL_TRADE_SERIES = [
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

const ALL_AVAILABLE_CLASSES = [
  ...GENERAL_CLASSES_CATALOG,
  ...TECHNICAL_COMMERCIAL_CATALOG,
  ...TECHNICAL_INDUSTRIAL_CATALOG
];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Student ID Generator: WC-GMA15739G or WC-TPA16814B
const generateStudentId = (schoolName, section, fullName, classLevel, age, gender, academicYear) => {
  // Dynamic school code: Takes first letter of up to 2 words
  const schoolCode = String(schoolName || 'SCH')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  // Section code: T for Technical, G for General
  const secCode = String(section || 'General Education').toUpperCase().startsWith('T') ? 'T' : 'G';

  // Student name initials
  const initials = String(fullName || 'ST')
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  // Class code: Extracts F3 directly from "Form 3 (F3)" or parses initials safely
  const rawClass = String(classLevel || 'F1');
  const bracketMatch = rawClass.match(/\(([^)]+)\)/);
  const classCode = bracketMatch 
    ? bracketMatch[1].toUpperCase() 
    : rawClass.split(/\s+/).map(word => word[0]).join('').toUpperCase();

  // Age string
  const studentAge = String(age || '15');

  // Gender check: G for Female/Girl, B for Male/Boy
  const cleanGender = String(gender || '').toLowerCase();
  const genderCode = (cleanGender.includes('female') || cleanGender.includes('girl') || cleanGender.startsWith('g')) ? 'G' : 'B';

  // Academic year code
  const yearCode = String(academicYear || '2026').slice(-2);

  return `${schoolCode}-${secCode}${initials}${classCode}${studentAge}${genderCode}${yearCode}`;
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
const START_TIME_OPTIONS = [
  "07:30 AM", "08:15 AM", "09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM",
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
const getAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 8 is September
    
    if (currentMonth >= 8) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  };
  const NSUH_SECTIONS_DATA = {
  GENERAL: {
    classes: [
      'Form 1 (F1)', 'Form 2 (F2)', 'Form 3 (F3)', 'Form 4 (F4)',
      'Form 5 (F5 Arts)', 'Form 5 (F5 Science)',
      'Lower Sixth Arts (L6A)', 'Lower Sixth Science (L6S)',
      'Upper Sixth Arts (U6A)', 'Upper Sixth Science (U6S)'
    ],
    series: {
      ARTS: [
        { code: 'A1', subjects: ['Literature in English', 'History', 'French Language'] },
        { code: 'A2', subjects: ['Geography', 'Economics', 'History'] },
        { code: 'A3', subjects: ['Literature in English', 'Economics', 'History'] },
        { code: 'A4', subjects: ['Economics', 'Geography', 'Mathematics'] },
        { code: 'A5', subjects: ['Literature in English', 'History', 'Philosophy'] }
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
  },
  COMMERCIAL: {
    classes: [
      'First Year Commercial (Y1COM)', 'Second Year Commercial (Y2COM)',
      'Third Year Commercial (Y3COM)', 'Fourth Year Commercial / CAP / CAPIET (Y4COM)',
      'Fifth Year Commercial / Seconde (Y5COM)',
      'Lower Sixth Commercial / Première/Probatoire/ (PROBCOM)',
      'Upper Sixth Commercial / Terminale (Baccalauréat/ (BACCOM)'
    ],
    series: [
      'G1 - Secretarial Studies', 'G2 - Accounting and Management',
      'G3 - Commercial Action / Marketing', 'FIG - Taxation and Management Information Systems',
      'ACA - Administrative Action and Communication', 'HE - Home Economics',
      'HOT - Hotel Management', 'TO - Tourism', 'BO - Bakery and Pastry'
    ]
  },
  INDUSTRIAL: {
    classes: [
      'First Year Industrial (Y1IND)', 'Second Year Industrial (Y2IND)',
      'Third Year Industrial (Y3IND)', 'Fourth Year Industrial/CAP/CAPIET (Y4IND)',
      'Fifth Year Industrial/Seconde (Y5IND)',
      'Lower Sixth Industrial/Première/ Probatoire Ind/ (PROBIND)',
      'Upper Sixth Industrial/Terminale /Baccalaureat/ (BACIND)'
    ],
    series: [
      'F1 - Mechanical Manufacturing', 'F2 - Electronics', 'F3 - Electrical Power Systems',
      'F4BA - Civil Engineering Building Construction', 'F4BE - Building Study and Study Office',
      'F4TP - Public Works', 'F5 - Air Conditioning and Ventilation',
      'F6 - Laboratory Chemistry', 'F7 - Biological Sciences',
      'F8 - Medical and Social Sciences', 'ARM - Automobile Repair Mechanics',
      'PL - Plumbing and Hydraulic Installation Systems'
    ]
  }
};
// Master Subjects Database List
const ALL_SUBJECTS_LIST = [
  // General Core Subjects
  { name: "Additional Mathematics", category: "General Core Subjects" },
  { name: "Artistic Education", category: "General Core Subjects" },
  { name: "Biology", category: "General Core Subjects" },
  { name: "Chemistry", category: "General Core Subjects" },
  { name: "Citizenship Education / Moral Education", category: "General Core Subjects" },
  { name: "Computer Science / ICT", category: "General Core Subjects" },
  { name: "Economic Geography", category: "General Core Subjects" },
  { name: "English Language", category: "General Core Subjects" },
  { name: "English Literature", category: "General Core Subjects" },
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
  { name: "Sports and Physical Education", category: "General Core Subjects" },

  // Commercial Subjects
  { name: "Application of Management Software", category: "Commercial Subjects" },
  { name: "Business Management", category: "Commercial Subjects" },
  { name: "Business Mathematics", category: "Commercial Subjects" },
  { name: "Commerce", category: "Commercial Subjects" },
  { name: "Computer-Aided Accounting", category: "Commercial Subjects" },
  { name: "Corporate Accounting", category: "Commercial Subjects" },
  { name: "Digital Marketing", category: "Commercial Subjects" },
  { name: "Economics", category: "Commercial Subjects" },
  { name: "Entrepreneurship", category: "Commercial Subjects" },
  { name: "Family Life Education and Gerontology", category: "Commercial Subjects" },
  { name: "Food Nutrition & Health", category: "Commercial Subjects" },
  { name: "International Financial Accounting", category: "Commercial Subjects" },
  { name: "Management Accounting", category: "Commercial Subjects" },
  { name: "OHADA Financial Accounting", category: "Commercial Subjects" },
  { name: "Principles of Accounts", category: "Commercial Subjects" },
  { name: "Product Mastery", category: "Commercial Subjects" },
  { name: "Professional Communication Techniques", category: "Commercial Subjects" },
  { name: "Resource Management on Home Studies", category: "Commercial Subjects" },
  { name: "Sales Method", category: "Commercial Subjects" },

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
// Default persistent subjects for Form 1 (F1) - Form 4 (F4) in General Education (Alphabetical)
const GENERAL_CORE_SUBJECTS = [
  "Biology",
  "Chemistry",
  "English Language",
  "English Literature",
  "French Language",
  "Geography",
  "History",
  "Mathematics"
];
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [isEditPersonnelModalOpen, setIsEditPersonnelModalOpen] = useState(false);
  const [pendingUncheckSubject, setPendingUncheckSubject] = useState(null);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
const [teacherToEdit, setTeacherToEdit] = useState(null);
const [selectedTeacherForLogs, setSelectedTeacherForLogs] = useState(null);

const handleEditTeacherSchedule = (teacher) => {
  setTeacherToEdit(teacher);
  if (teacher?.name || teacher?.full_name) setTeacherName(teacher.name || teacher.full_name);
  if (teacher?.phone || teacher?.phone_number || teacher?.contact) setTeacherPhone(teacher.phone || teacher.phone_number || teacher.contact);
  if (teacher?.email) setTeacherEmail(teacher.email);
  if (teacher?.section) setSelectedSection(teacher.section);
  
  // Hydrate assigned subjects and schedule configurations
  if (teacher?.subjects && Array.isArray(teacher.subjects)) {
    setSelectedTeacherSubjects(teacher.subjects);
  }
  if (teacher?.schedules) {
    setSubjectSchedules(teacher.schedules);
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
  // Class & Coefficient Settings States
  const [selectedSection, setSelectedSection] = useState('General Education');
  const [selectedClass, setSelectedClass] = useState('Form 1 (F1)');
  const [selectedTradeSeries, setSelectedTradeSeries] = useState('');
  const [customSubjectModal, setCustomSubjectModal] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectCategory, setNewSubjectCategory] = useState('General Core Subjects');
  const [subjectCoefficients, setSubjectCoefficients] = useState([]);
  const [teacherSubTab, setTeacherSubTab] = useState('assigned');
const [logSectionFilter, setLogSectionFilter] = useState('General');
// Master Mark Sheet States
  const [masterSection, setMasterSection] = useState('General Education');
  const [masterClass, setMasterClass] = useState(GENERAL_CLASSES_CATALOG[0]);
  const [masterSeries, setMasterSeries] = useState('');
  const [masterTerm, setMasterTerm] = useState('Term 1');
  // Helper function to update coefficient state
  const handleCoefficientChange = (subjectName, coefValue) => {
    setSubjectCoefficients(prev =>
      prev.map(item =>
        item.name === subjectName ? { ...item, coefficient: Number(coefValue) || 1 } : item
      )
    );
  };
  const handleCoefficientSubjectToggle = (subjectName) => {
    // Find current state of the target subject
    const targetSub = subjectCoefficients.find((s) => s.name === subjectName);
    const isCurrentlySelected = targetSub ? targetSub.selected : false;

    // Strict catalog string checks for Form 1 through Form 4
    const MANDATORY_GENERAL_CLASSES = [
      'Form 1 (F1)',
      'Form 2 (F2)',
      'Form 3 (F3)',
      'Form 4 (F4)'
    ];

    const isMandatoryClass = 
      (selectedSection === "General" || selectedSection === "General Education") && 
      MANDATORY_GENERAL_CLASSES.includes(selectedClass);

    const isCore = GENERAL_CORE_SUBJECTS.includes(subjectName);

    // Trigger state confirmation instead of browser popup
   if (isCurrentlySelected && isMandatoryClass && isCore) {
    if (!window.confirm(`Are you sure you want to remove ${subjectName} from ${selectedClass}? Checked subjects dictate student report cards.`)) {
        return;
      }
    }

    setSubjectCoefficients((prev) =>
      prev.map((sub) =>
        sub.name === subjectName ? { ...sub, selected: !sub.selected } : sub
      )
    );
  };

  // Master Mark Sheet States & Fetcher
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [masterStudentsData, setMasterStudentsData] = useState([]);
  const [isMasterLoading, setIsMasterLoading] = useState(false);

const handleSaveMasterMarks = async () => {
    try {
      setIsMasterLoading(true);
      const updates = [];
// Step 1: Fetch class coefficients directly from DB to resolve UUIDs (Multi-tenant secured)
    const { data: activeCoefficients } = await supabase
      .from('class_coefficients')
      .select('id, subject_name, subject_code, trades_series')
      .eq('school_id', activeSchool?.id || activeSchool?.school_id);

const coeffMap = new Map();
(activeCoefficients || []).forEach(c => {
  if (c.id) coeffMap.set(c.id, c.subject_name);
  
  const rawSeries = c.trades_series ? String(c.trades_series).trim().toLowerCase() : '';
  const rawName = c.subject_name ? String(c.subject_name).trim().toLowerCase() : '';
  const rawCode = c.subject_code ? String(c.subject_code).trim().toLowerCase() : '';

  if (rawName) coeffMap.set(rawName, c.subject_name);
  if (rawCode) coeffMap.set(rawCode, c.subject_name);

  // Matches full string trades_series like "Applied Mechanics"
  if (rawSeries) {
    if (rawName) coeffMap.set(`${rawName}_${rawSeries}`, c.subject_name);
    if (rawCode) coeffMap.set(`${rawCode}_${rawSeries}`, c.subject_name);
  }
});
      (masterStudentsData || []).forEach((student) => {
        // Safely extract trades_series
        let formattedTradesSeries = null;
        if (student.trades_series) {
          formattedTradesSeries = Array.isArray(student.trades_series)
            ? student.trades_series.join(', ')
            : String(student.trades_series);
        }

        if (Array.isArray(student.marks)) {
          student.marks.forEach((m) => {
        // Step 2: Resolve human-readable subject name directly from DB Map
        const subjectName = coeffMap.get(m.subject_id || m.id || m.subject) || m.subject_name;

        if (!subjectName) return;
            const record = {
              school_id: activeSchool?.id || activeSchool?.school_id,
              student_id: student.id,
              subject_name: subjectName,
              term: m.term || 'Term 1',
              academic_year: activeSchool?.academic_year || getAcademicYear(),
              trades_series: formattedTradesSeries,
            };

            let hasMarks = false;

            if (m.seq1_mark !== undefined && m.seq1_mark !== null && m.seq1_mark !== '') {
              record.seq1_mark = parseFloat(m.seq1_mark);
              hasMarks = true;
            }

            if (m.seq2_mark !== undefined && m.seq2_mark !== null && m.seq2_mark !== '') {
              record.seq2_mark = parseFloat(m.seq2_mark);
              hasMarks = true;
            }

            if (hasMarks) {
              updates.push(record);
            }
          });
        }
      });
const uniqueMap = new Map();
  updates.forEach((item) => {
    const key = `${item.school_id}_${item.student_id}_${item.subject_name}_${item.term}_${item.academic_year}`;
    uniqueMap.set(key, item);
  });
  const cleanUpdates = Array.from(uniqueMap.values());
     if (cleanUpdates.length === 0) {
    alert('No marks to update.');
    setIsMasterLoading(false);
    return;
  }

  // Upsert matching the existing unique constraint in PostgreSQL
  const { error } = await supabase
    .from('marks')
    .upsert(cleanUpdates, { onConflict: 'school_id,student_id,subject_name,term,academic_year' });

      if (error) throw error;

      alert('Marks saved and updated successfully!');
      await fetchMasterMarkSheetData();
    } catch (err) {
      console.error('Error saving master marks:', err.message);
      alert('Failed to save marks: ' + err.message);
    } finally {
      setIsMasterLoading(false);
    }
  };
  const fetchMasterMarkSheetData = async () => {
    const schoolId = activeSchool?.id || activeSchool?.school_id;
    if (!schoolId || !masterClass) return;

const TECHNICAL_COMMERCIAL_CATALOG = [
  'First Year Commercial (Y1Com)',
  'Second Year Commercial (Y2Com)',
  'Third Year Commercial (Y3Com)',
  'Fourth Year Commercial / CAP / CAPIET (Y4Com)',
  'Fifth Year Commercial / Seconde (Y5Com)',
  'Lower Sixth Commercial / Première (Probatoire Com)',
  'Upper Sixth Commercial / Terminale (Baccalauréat Com)'
];

const TECHNICAL_INDUSTRIAL_CATALOG = [
  'First Year Industrial (Y1Ind)',
  'Second Year Industrial (Y2Ind)',
  'Third Year Industrial (Y3Ind)',
  'Fourth Year Industrial / CAP / CAPIET (Y4Ind)',
  'Fifth Year Industrial / Seconde (Y5Ind)',
  'Lower Sixth Industrial / Première (Probatoire Ind)',
  'Upper Sixth Industrial / Terminale (Baccalauréat Ind)'
];
setIsMasterLoading(true);
    try {
      // 1. Fetch configured subjects & coefficients for table headers (class_coefficients table)
// 1. Fetch configured subjects & coefficients for table headers
   let coefQuery = supabase
  .from('class_coefficients')
  .select('*')
  .eq('school_id', schoolId)
  .eq('classLevel', masterClass);

if (masterSection) {
  coefQuery = coefQuery.eq('section', masterSection);
}

    // 2. Build student query for active class level
    let studentQuery = supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('classLevel', masterClass);

   // Fetch students by school and class level only (Supabase query)
// JS will safely filter section and trade in memory below

    // 3. Execute all queries concurrently
    const [
      { data: savedCoeffs, error: coefErr },
      { data: students, error: studentErr },
      { data: marksData, error: marksErr }
    ] = await Promise.all([
      coefQuery,
      studentQuery.order('fullName', { ascending: true }),
      supabase
        .from('marks')
        .select('*')
        .eq('school_id', activeSchool?.id || activeSchool?.school_id)
        .eq('term', masterTerm)
        .eq('classLevel', masterClass)
    ]);
    if (coefErr) console.warn("Notice loading coefficients:", coefErr.message);
    if (studentErr) throw studentErr;
    if (marksErr) console.warn("Notice loading marks:", marksErr.message);
// 2. Active subjects become horizontal table headers
const isTechnical = masterSection === 'Technical Commercial (STT)' || 
                    masterSection === 'Technical Industrial (IND)' || 
                    TECHNICAL_COMMERCIAL_CATALOG.includes(masterClass) || 
                    TECHNICAL_INDUSTRIAL_CATALOG.includes(masterClass);

const activeSubs = (savedCoeffs || []).filter(s => {
  const trade = s.trades_series ? s.trades_series.trim() : '';

  // Discard specific Technical subjects when viewing General section
  if (!isTechnical && trade) return false;

  // Filter Technical specialty subjects if a specific series is selected
  if (isTechnical && masterSeries && masterSeries !== 'FOUNDATIONAL' && masterSeries !== 'COMMON') {
    const isFoundationalOrCommon = trade === 'FOUNDATIONAL' || trade === 'COMMON' || !trade;
    const isExactTradeMatch = trade === masterSeries.trim();
    const isSubTradeMatch = masterSeries.includes(trade) || trade.includes(masterSeries);

    if (!isFoundationalOrCommon && !isExactTradeMatch && !isSubTradeMatch) {
      return false;
    }
  }

  return s.coefficient > 0 || s.is_included !== false;
});

// CRITICAL: Commit calculated subjects to table headers state immediately
setMasterSubjects(activeSubs);

// CASE 2: Subjects loaded successfully, but zero students registered
if (!students || students.length === 0) {
  setMasterStudentsData([]);
  setIsMasterLoading(false);
  return;
}
  const marksMap = new Map();
  (marksData || []).forEach(m => {
    if (!m.unique_code) return;
    if (!marksMap.has(m.unique_code)) marksMap.set(m.unique_code, []);
    marksMap.get(m.unique_code).push(m);
  });
 const formatted = (students || [])
  .filter(st => {
    // 1. Strict Class Level
    if (st.classLevel !== masterClass) return false;

    // 2. Section Matching
    const studentSec = (st.section || st.school_section || '').trim().toLowerCase();
    const selectedSec = (masterSection || '').trim().toLowerCase();
    if (selectedSec && studentSec && !studentSec.includes(selectedSec) && !selectedSec.includes(studentSec)) {
      return false;
    }

    // 3. Technical Trade/Specialty Matching
    // 3. Technical Trade/Specialty Matching
if (isTechnical && masterSeries) {
  const stTrade = (st.trades_series || st.series_specialty || st.series || '').trim();
  const selectedSeries = masterSeries.trim();

  if (selectedSeries !== 'FOUNDATIONAL' && selectedSeries !== 'COMMON') {
    if (!stTrade || (stTrade !== selectedSeries && !selectedSeries.includes(stTrade) && !stTrade.includes(selectedSeries))) {
      return false;
    }
  }
}

    return true;
  })
  .map(st => {
    const code = st.unique_code || st.student_matricule;
    return {
      ...st,
      name: st.fullName || st.name,
      unique_code: code,
      marks: marksMap.get(code) || []
    };
  });
      setMasterStudentsData(formatted);
    } catch (err) {
      console.error("Error fetching master sheet data:", err);
    } finally {
      setIsMasterLoading(false);
    }
  };
const handleUnlockMarks = async (markId) => {
    try {
      const { error } = await supabase
        .from('marks')
        .update({ edit_count: 0 })
        .eq('id', markId);

      if (error) throw error;

      toast.success('Marks unlocked successfully for teacher editing!');
      fetchMasterMarkSheetData();
    } catch (err) {
      console.error('Error unlocking marks:', err?.message || err);
      toast.error('Failed to unlock marks');
    }
  };
  const autoSaveTimerRef = useRef(null);
  const handleAdminMarkChange = (studentId, subjectId, field, value) => {
    let parsedValue = value === '' ? null : Math.min(20, Math.max(0, parseFloat(value) || 0));

    setMasterStudentsData((prev) =>
      prev.map((student) => {
        if (student.id !== studentId && student.unique_code !== studentId) return student;

        const currentMarks = student.marks || [];
        const existingIdx = currentMarks.findIndex(
          (m) => (m.subject_id === subjectId || m.subject === subjectId || (m.subject_name || m.subject) === subjectId)
        );

        let updatedMarks = [...currentMarks];
        if (existingIdx > -1) {
          updatedMarks[existingIdx] = { ...updatedMarks[existingIdx], [field]: parsedValue };
        } else {
          updatedMarks.push({ student_id: studentId, unique_code: student.unique_code || studentId, subject_id: subjectId, [field]: parsedValue });
        }
        return { ...student, marks: updatedMarks };
      })
    );
    // if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
// autoSaveTimerRef.current = setTimeout(() => {
//   fetchMasterMarkSheetData();
// }, 2000);
  };
  // Auto-fetch whenever Master Mark Sheet filters change or tab becomes active
  useEffect(() => {
    if (activeTab === 'master-marks') {
      fetchMasterMarkSheetData();
    }
  }, [activeTab, masterSection, masterClass, masterSeries, masterTerm, activeSchool?.id]);
  // Auto-populate initial subject list on change
 // Dedicated Series Subject Mapping Lookup (Aligned with ALL_SUBJECTS_LIST)
  const SERIES_LOOKUP = {
    A1: ["English Literature", "History", "French Language"],
    A2: ["Geography", "Economics", "History"],
    A3: ["English Literature", "Economics", "History"],
    A4: ["Economics", "Geography", "Pure Mathematics with Statistics"],
    A5: ["English Literature", "History", "Philosophy"],
    S1: ["Physics", "Chemistry", "Pure Mathematics"],
    S2: ["Chemistry", "Physics", "Biology"],
    S3: ["Biology", "Chemistry", "Pure Mathematics"],
    S4: ["Biology", "Chemistry", "Geology"],
    S5: ["Chemistry", "Computer Science", "Mathematics"],
    S6: ["Chemistry", "Physics", "Mathematics", "Further Mathematics"],
    S7: ["Chemistry", "Biology", "Physics", "Mathematics"],
    S8: ["Biology", "Chemistry", "Physics", "Mathematics", "Further Mathematics"]
  };

 useEffect(() => {
   const MANDATORY_GENERAL_CLASSES = [
      'Form 1 (F1)',
      'Form 2 (F2)',
      'Form 3 (F3)',
      'Form 4 (F4)'
    ];

    const isMandatoryClass = 
      (selectedSection === "General Education" || selectedSection === "General Education") && 
      MANDATORY_GENERAL_CLASSES.includes(selectedClass);

    let initialList = ALL_SUBJECTS_LIST.map((sub) => ({
      ...sub,
      coefficient: 1,
      selected: isMandatoryClass && GENERAL_CORE_SUBJECTS.includes(sub.name)
    }));

    const activeSeriesCode = selectedTradeSeries?.trim()?.toUpperCase();

    if (activeSeriesCode && SERIES_LOOKUP[activeSeriesCode]) {
      const targetSubjects = SERIES_LOOKUP[activeSeriesCode];

      initialList = initialList.map((sub) => {
        const isMatch = targetSubjects.some((target) => {
          const tName = target.toLowerCase().trim();
          const sName = sub.name.toLowerCase().trim();

          if (sName === tName) return true;
          if (tName.includes("pure mathematics") && sName.includes("pure mathematics")) return true;

          return false;
        });
        return { ...sub, selected: isMatch };
      });
    }

    // Check Supabase for previously saved/validated coefficients
    const loadSavedCoefficients = async () => {
      if (!activeSchool?.id || !selectedClass) {
        setSubjectCoefficients(initialList);
        return;
      }

      let query = supabase
        .from('class_coefficients')
        .select('*')
        .eq('school_id', activeSchool.id)
        .eq('section', selectedSection)
        .eq('classLevel', selectedClass);

      if (selectedTradeSeries) {
        query = query.eq('series', selectedTradeSeries);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        // Overlay saved database values on top of initialList
        const mergedList = initialList.map((item) => {
          const matched = data.find((d) => d.subject_name === item.name);
          if (matched) {
            return {
              ...item,
              coefficient: matched.coefficient,
              selected: matched.is_included,
              subject_code: matched.subject_code
            };
          }
          return item;
        });
        setSubjectCoefficients(mergedList);
      } else {
        setSubjectCoefficients(initialList);
      }
    };

    loadSavedCoefficients();
  }, [activeSchool?.id, selectedSection, selectedClass, selectedTradeSeries]);
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
 const [selectedTeacherModal, setSelectedTeacherModal] = useState(null);
 const [teacherPhoto, setTeacherPhoto] = useState(null);
const [teacherPhotoPreview, setTeacherPhotoPreview] = useState(null);
  // Real Phone Time State
  const [currentTime, setCurrentTime] = useState(null);
  const [schedulerData, setSchedulerData] = useState({});

  const handleSchedulerRowChange = (subject, rIdx, field, value) => {
    setSchedulerData((prevData) => {
      const updated = { ...prevData };
      if (!updated[subject]) updated[subject] = [];
      if (!updated[subject][rIdx]) updated[subject][rIdx] = {};
      updated[subject][rIdx][field] = value;
      return updated;
    });
  };
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

   // 1. HARD SAFETY GAURDS & MULTI-TENANT CONTEXT
    const studentId = studentToDelete?.id;
    const studentCode = studentToDelete?.unique_code || studentToDelete?.matricule;
    const currentSchoolId = activeSchool?.id || studentToDelete?.school_id;

    // Reject operation if primary key or tenant identity is missing
    if (!studentId || typeof studentId !== 'string' || !studentId.includes('-')) {
      alert("Safety Lock: Cannot delete record without a valid UUID primary key.");
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
      return;
    }

    // 3. PERMANENT LOCAL UI STATE PURGE
    setStudentsList((prev) => prev.filter((s) => s.id !== studentId));
    setStudentToDelete(null);
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
      }
    };

    if (activeSchool?.school_id) {
      fetchStudentsFromSupabase();
    }
  }, [activeSchool?.school_id]);
  // Registration Form State
  const [regRole, setRegRole] = useState('student');
  
  // Common Member / Student Form Credentials
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [residence, setResidence] = useState('');
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
  const [section, setSection] = useState('General Education'); 
  const [classLevel, setClassLevel] = useState(GENERAL_CLASSES_CATALOG[0]); 
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
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
      if (typeof window === 'undefined') return;

      let schoolIdToUse = typeof activeSchool === 'object' ? (activeSchool?.id || activeSchool?.school_id) : activeSchool;
    if (!schoolIdToUse || typeof schoolIdToUse !== 'string' || schoolIdToUse.includes(' ')) {
      schoolIdToUse = localStorage.getItem('school_id');
    }
      if (!schoolIdToUse) return;
console.log('Active School ID inside fetch:', schoolIdToUse);
      // Parallel fetch for sub-second performance across devices
      const [studentsRes, teachersRes] = await Promise.all([
        supabase.from('students').select('*').eq('school_id', schoolIdToUse),
        supabase.from('teachers').select('*').eq('school_id', schoolIdToUse)
      ]);
console.log('Students Response:', studentsRes);
      if (studentsRes.data) {
        setStudentsList(studentsRes.data);
      }

      if (teachersRes.data) {
        const formattedTeachers = teachersRes.data.map((t) => ({
          ...t,
          id: t.teacher_id || t.id,
          phone: t.contact || t.phone,
          signupLink: t.signup_link || t.signupLink,
          schedules: t.schedules || {}
        }));
        setTeachersList(formattedTeachers);
      }
    };

    fetchAllSchoolData();
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
  const handleExportExcel = () => {
    if (!studentsList || studentsList.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(studentsList);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "Student_List.xlsx");
  };

  // Helper: Export current student list to PDF
  const handleExportPDF = () => {
    if (!studentsList || studentsList.length === 0) return;
    const doc = new jsPDF();
    doc.text("Student List", 14, 15);

    const tableColumn = ["ID", "Full Name", "Section", "Class Level", "Gender", "Guardian Phone"];
    const tableRows = studentsList.map((stu) => [
      stu.id || "",
      stu.fullName || "",
      stu.section || "",
      stu.classLevel || "",
      stu.gender || "",
      stu.guardianPhone || "",
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save("Student_List.pdf");
  };

  const handlePrint = () => {
    let filteredStudents = [...studentsList];

    if (printSection !== 'All') {
      filteredStudents = filteredStudents.filter(
        (stu) => stu.section?.toLowerCase() === printSection.toLowerCase()
      );
    }

    if (printClass !== 'All') {
      filteredStudents = filteredStudents.filter(
        (stu) => stu.classLevel?.toLowerCase() === printClass.toLowerCase()
      );
    }

    if (printTrade !== 'All') {
      filteredStudents = filteredStudents.filter((stu) => {
        const tradeVal = stu.trades_series || stu.trade || stu.specialty || '';
        return tradeVal.toLowerCase() === printTrade.toLowerCase();
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
    if (printClass !== 'All') classTitle = printClass;
    else if (printSection !== 'All') classTitle = `${printSection} Section`;

    if (printTrade !== 'All') classTitle += ` - Trade: ${printTrade}`;

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
    const chosenSeriesOrTrade = (selectedSeries || selectedTechnicalSubject || 'N/A');

  if ((classLevel?.includes('Sixth') || masterClass?.includes('Sixth')) && chosenSeriesOrTrade === 'N/A') {
    alert('Please select a Series for Sixth Form students before registering.');
    return;
  }
    if (!fullName || !guardianPhone || !age || !dob || !gender || !residence) {
  alert('Please fill in all mandatory student credential fields including gender and residence.');
  return;
}

    if (phone && !validateCameroonPhone(phone)) {
      alert('Invalid Student Phone Number! Must start with 6 and contain 9 digits.');
      return; 
    }

    if (!validateCameroonPhone(guardianPhone)) {
      alert('Invalid Guardian Phone Number! Must start with 6 and contain 9 digits.');
      return;
    }
// Direct Multi-Tenant Resolution (Bypasses verification query failures)
    const { data: { session } } = await supabase.auth.getSession();

    // Resolve tenant school details directly from active state or user session
    const currentSchoolId = 
      activeSchool?.id || 
      activeSchool?.school_id || 
      session?.user?.user_metadata?.school_id || 
      session?.user?.id;

    const currentSchoolName = 
      activeSchool?.school_name || 
      activeSchool?.name || 
      session?.user?.user_metadata?.school_name || 
      "Official Registry";

    if (!currentSchoolId) {
      alert("Security Error: No active school session or tenant ID found. Please re-select your school.");
      return;
    }
    const uniqueStudentId = generateStudentId(currentSchoolName, section, fullName, classLevel, age, gender);
    const newStudentRecord = {
      school_id: currentSchoolId,
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

    // 1. Insert new student into Supabase database
const { error } = await supabase
  .from('students')
  .insert([newStudentRecord]);

if (error) {
  alert("Error registering student to Supabase: " + error.message);
  return;
}

// 2. Update UI locally
setStudentsList((prev) => [newStudentRecord, ...prev]);
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
      setSelectedSeries(''); // <-- ADD THIS LINE
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
let uniqueStaffId = '';

  if (regRole === 'teacher') {
    // Teacher ID logic: WC-TJO45626K
    uniqueStaffId = generateTeacherId(schoolName, 'General', fullName, phone);
  } else {
    // Original logic strictly preserved for all other staff roles
    const resolvedSchoolName = (typeof active_school_name !== 'undefined' && active_school_name) 
      ? active_school_name 
      : (typeof activeSchool !== 'undefined' ? (activeSchool?.school_name || activeSchool?.name || schoolName || 'School') : (schoolName || 'School'));
      
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

  const token = Math.random().toString(36).substring(2, 10);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const signupLink = `${baseUrl}/staff-signup?token=${token}&id=${uniqueStaffId}`;

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
      setActivePersonnelResult(savedPerson);
    }

    setFullName('');
    setPhone('');
    setStaffEmail('');
    setStaffResidence('');
    alert(`${newStaffRecord.title} registered successfully with unique ID ${uniqueStaffId}!`);
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
  // Handle Toggle Subject & Initialize default schedule rows
  const handleSubjectToggle = (sub, checked) => {
    let updatedSubjects;
    if (checked) {
      updatedSubjects = [...selectedTeacherSubjects, sub];
      setSubjectSchedules(prev => ({
        ...prev,
        [sub]: [
          { className: ALL_AVAILABLE_CLASSES[0], day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' }
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

  // Helper alias to avoid scope confusion
  const subjectSchedules = subjectClassSchedules;
  const setSubjectSchedules = setSubjectClassSchedules;

  // Add another class session row for a particular subject
  const addClassRowToSubject = (subject) => {
    setSubjectSchedules(prev => ({
      ...prev,
      [subject]: [
        ...(prev[subject] || []),
        { className: ALL_AVAILABLE_CLASSES[0], day: 'Monday', startTime: '07:30 AM', endTime: '09:00 AM' }
      ]
    }));
  };

  // Remove a class session row for a subject
  const removeClassRowFromSubject = (subject, index) => {
    setSubjectSchedules(prev => {
      const list = [...(prev[subject] || [])];
      list.splice(index, 1);
      return { ...prev, [subject]: list };
    });
  };

  // Update specific class schedule row values for a teacher's subject
  const handleScheduleRowChange = (subject, index, field, value) => {
    // 1. Update subjectSchedules
    setSubjectSchedules((prev) => {
      const list = [...(prev[subject] || [])];
      const existingRow = list[index] || { className: '', day: '', startTime: '', endTime: '' };
      list[index] = {
        ...existingRow,
        [field]: value
      };
      return { ...prev, [subject]: list };
    });

    // 2. Update schedulerData to keep UI in sync
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
// Handle Teacher Photo Selection / Camera Snapshot
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
  // Teacher Assignment Submission with Validation Rules & Conflict Checks
  const handleTeacherAssignment = async (e) => {
    e.preventDefault();

    if (!teacherName || !teacherPhone || !teacherEmail || selectedTeacherSubjects.length === 0) {
      alert('Please provide teacher name, mandatory email, phone number, and select at least one subject with class schedules.');
      return;
    }


    if (!validateCameroonPhone(teacherPhone)) {
      alert('Invalid Teacher Phone Number! Must be 9 digits starting with 6.');
      return;
    }

    // Validation: Prevent duplicate overlapping class time slots
    // Time string parser helper (e.g. "09:00 AM" -> 540 minutes)
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    
    // Clean string and handle spaces properly
    const cleanStr = String(timeStr).replace(/\u00a0/g, ' ').trim().toUpperCase();
    const parts = cleanStr.split(/\s+/);
    const timePart = parts[0];
    const modifier = parts[1] || '';

    let [hours, minutes] = timePart.split(':').map(Number);

    // Standard 12-hour clock conversion rules
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

// Flatten and normalize all schedule slots safely from BOTH state sources
    const allScheduleSlots = [];
    for (const sub of selectedTeacherSubjects) {
      // Prioritize schedulerData if available, fallback to subjectSchedules
      const rows = (schedulerData && schedulerData[sub] && schedulerData[sub].length > 0)
        ? schedulerData[sub]
        : (subjectSchedules[sub] || []);

      for (const row of rows) {
        if (!row) continue;
        const normalizedClass = row?.className || row?.class || row?.form || "";
        if (normalizedClass && row?.day && row?.startTime && row?.endTime) {
          allScheduleSlots.push({
            ...row,
            subject: sub,
            className: normalizedClass,
          });
        }
      }
    }

    console.log("SLOT_0:", JSON.stringify(allScheduleSlots[0]), "SLOT_1:", JSON.stringify(allScheduleSlots[1]));
    let hasConflict = false;

    // Strict overlap validation
    for (let i = 0; i < allScheduleSlots.length; i++) {
      for (let j = i + 1; j < allScheduleSlots.length; j++) {
        const slotA = allScheduleSlots[i];
        const slotB = allScheduleSlots[j];

        // Only compare if it is the EXACT SAME class on the EXACT SAME day
        if (slotA.day === slotB.day && slotA.className === slotB.className) {
          const startA = parseTimeToMinutes(slotA.startTime);
          const endA = parseTimeToMinutes(slotA.endTime);
          const startB = parseTimeToMinutes(slotB.startTime);
          const endB = parseTimeToMinutes(slotB.endTime);

          // Overlap condition: Period A starts strictly before Period B ends AND Period B starts strictly before Period A ends
          if (startA < endB && startB < endA) {
            console.warn("Conflict detected between slots:", { slotA, slotB });
            hasConflict = true;
            break;
          }
        }
      }
      if (hasConflict) break;
    }

    if (hasConflict) {
      alert('Conflict Error: A class cannot receive two subjects at the exact same day and time slot!');
      return;
    }
// Dynamic Academic Year Calculator (September 1st cutoff)
  
   // Dynamic Teacher ID Generator
const generateTeacherId = (schoolNameInput, section, fullName, phoneNumber) => {
    // Clean string helper to remove special characters
    const cleanStr = (str) => (str || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();

    // 1. School Initials (e.g., "Virgin Island" -> "VI", "SCHOOL 001" -> "S0")
    const validSchoolName = cleanStr(schoolNameInput) || 'School';
    const schoolWords = validSchoolName.split(/\s+/).filter(Boolean);
    let schoolCode = '';
    if (schoolWords.length >= 2) {
      schoolCode = (schoolWords[0][0] + schoolWords[1][0]).toUpperCase();
    } else {
      schoolCode = schoolWords[0].substring(0, 2).toUpperCase();
    }

    // 2. Section: T for Technical, G for GeneralG
    const secCode = (section || 'General').toUpperCase().startsWith('T') ? 'T' : 'G';

    // 3. Teacher Initials (e.g., "John Matthew" -> "JM", "Norbert Nsuh" -> "NN")
    const validFullName = cleanStr(fullName) || 'Teacher';
    const nameWords = validFullName.split(/\s+/).filter(Boolean);
    let initials = '';
    if (nameWords.length >= 2) {
      initials = (nameWords[0][0] + nameWords[1][0]).toUpperCase();
    } else {
      initials = nameWords[0].substring(0, 2).toUpperCase();
    }

    // 4. Last 3 digits of phone number
    const cleanPhone = (phoneNumber || '0000').replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 3 ? cleanPhone.slice(-3) : '000';

    // 5. Academic Year (26)
    const yearSuffix = '26';

    // 6. Random Uppercase Letter (A-Z)
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

    // Result Format: VI-GJM45826L
    return `${schoolCode}-${secCode}${initials}${phoneSuffix}${yearSuffix}${randomLetter}`;
  };

  const currentSchoolTitle = activeSchool?.name || schoolName || 'Virgin Island';

  const teacherId = generateTeacherId(
    currentSchoolTitle,
    teacherSection,
    teacherName,
    teacherPhone
  );



const signupToken = 'teach_' + Math.random().toString(36).substring(2, 9);
const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const generatedLink = `${baseUrl}/staff-signup?role=teacher?token=${signupToken}&id=${teacherId}`;

 // 1. Safe Multi-Tenant School ID Resolution
    let activeSchoolId = activeSchool?.school_id || activeSchool?.id || currentSchoolId;
let activeSchoolName = activeSchool?.name || activeSchool?.['school-name'] || schoolName;

// If state isn't populated yet, do a exact fallback lookup
if (!activeSchoolId) {
  const targetTitle = currentSchoolTitle || activeSchoolName;
  if (targetTitle) {
    const { data: matchedSchool } = await supabase
      .from('assigned_schools')
      .select('school_id, id, name')
      .ilike('name', `%${targetTitle}%`)
      .maybeSingle();

    if (matchedSchool) {
      activeSchoolId = matchedSchool.school_id || matchedSchool.id;
      activeSchoolName = matchedSchool.name;
    }
  }
}

if (!activeSchoolId) {
  alert("Security Notice: Could not locate active School ID. Please re-select your school or log in again.");
  return;
}

   const newTeacherRecord = {
      signup_link: generatedLink,
      
      // UI / Component Props Keys
      id: teacherId,
      name: teacherName,
      phone: teacherPhone,
      email: teacherEmail,
      residence: teacherResidence || 'N/A',
      section: teacherSection,
      subjects: selectedTeacherSubjects,
      schedules: subjectSchedules,
      picture: teacherPhotoPreview || picturePreview || null,
      signupLink: generatedLink,
      role: 'teacher',
    };

  // Payload object for create/update
const payloadData = {
  school_id: activeSchoolId,
  teacher_id: teacherId,
  name: teacherName,
  contact: teacherPhone,
  email: teacherEmail,
  residence: teacherResidence || 'N/A',
  section: teacherSection,
  subjects: selectedTeacherSubjects,
  schedules: subjectSchedules,
  picture: teacherPhotoPreview || picturePreview || null,
  signup_link: generatedLink,
  role: 'teacher'
};

let error = null;

if (teacherToEdit) {
  // Exclude key identifiers from payload so Supabase update doesn't hit UUID conflicts
  const { teacher_id, id, ...updateFields } = payloadData;

  const res = await supabase
    .from('teachers')
    .update(updateFields)
    .eq('teacher_id', teacherToEdit.teacher_id || teacherToEdit.id);
  error = res.error;
} else {
  // INSERT new teacher when not in edit mode
  const res = await supabase
    .from('teachers')
    .insert([payloadData]);
  error = res.error;
}

    if (error) {
      alert('Error saving teacher to database: ' + error.message);
      return;
    }

    // Update UI state & popup modal
    // Update UI state cleanly without creating duplicates
if (teacherToEdit) {
  const targetId = teacherToEdit.teacher_id || teacherToEdit.id;
  setTeachersList(prev => 
    prev.map(t => (t.teacher_id === targetId || t.id === targetId) ? newTeacherRecord : t)
  );
  setTeacherToEdit(null); // Reset edit state after saving
} else {
  // Add new teacher to the top of the list
  setTeachersList(prev => [newTeacherRecord, ...prev]);
}

setActiveTeacherResult(newTeacherRecord);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pending_teacher_draft');
    }
    setPicturePreview(null);
setTeacherPhoto(null);
setTeacherPhotoPreview(null);
    setTeacherName('');
    setTeacherPhone('');
    setTeacherEmail('');
    setTeacherResidence('');
    setSelectedTeacherSubjects([]);
    setSubjectSchedules({});
    alert('Teacher successfully assigned with unique ID, validation passed, and timetable generated!');
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
              className="bg-gray-800 hover:bg-gray-700 text-amber-400 border border-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-400 uppercase">
              {hasMounted ? (localStorage.getItem('active_school_name') || localStorage.getItem('activeSchoolName') || schoolName || '') : ''}
</h1>
<p className="text-xs text-gray-400">Academic Year: {getAcademicYear()} | Administrator Portal | Contact: {schoolContact}</p>          </div>
        </div>
       {/* High-Resolution School Logo Container */}
        <div className="hidden md:flex items-center justify-center border border-dashed border-sky-500/50 bg-[#1f2937]/50 rounded-lg px-4 py-1.5 min-w-[130px] h-[52px] overflow-hidden">
          {schoolLogo && schoolLogo.startsWith('http') ? (
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
            <div className="text-xs font-mono text-amber-300 font-semibold">
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
  { id: 'details', label: 'School Details' }
].map((tab) => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
<div className="flex flex-col gap-2 p-3 md:hidden w-full">
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
    ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-amber-500/10 ring-1 ring-amber-500/30'
    : 'bg-gray-900/90 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
}`}
          >
            <span>{tab.label}</span>
            <span className="text-xs">{activeTab === tab.id ? '▲' : '▼'}</span>
          </button>
        ))}
      </div>
      <main className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#111827] border border-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Students</h3>
                <p className="text-3xl font-black mt-2 text-white">{totalStudents}</p>
                <div className="text-[11px] text-gray-400 mt-1 flex gap-2">
                  <div>
    <span>General Education = <strong className="text-amber-400">{generalStudentsCount}</strong></span> | 
    <span>Technical Commercial = <strong className="text-amber-400">{tcStudentsCount}</strong></span> | 
    <span>Technical Industrial = <strong className="text-amber-400">{tiStudentsCount}</strong></span>
  </div>
                </div>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Teachers</h3>
                <p className="text-3xl font-black mt-2 text-white">{teachersList.length}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Other Personnel</h3>
                <p className="text-3xl font-black mt-2 text-blue-400">{personnelList.length}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Administrators</h3>
                <p className="text-3xl font-black mt-2 text-amber-400">
  {personnelList.filter(p => p.role === 'administrator').length + 1} / 4
</p>
              </div>
            </div>

            {/* General Teacher Timetable Collected Summary */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 border-b border-gray-800 pb-3">
                General School Master Timetable & Teacher Subject Allocation Summary
              </h3>
              {teachersList.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No teacher timetables collected yet. Assign teachers to build the master schedule.
                </div>
              ) : (
                <div className="hidden md:block overflow-x-auto">
                  {/* Mobile Responsive Card Stack */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {teachersList.map((t, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h4 className="font-bold text-sm text-white">{t.name}</h4>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{t.id}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Subjects Taught</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.subjects?.map((sub, sIdx) => (
                    <span key={sIdx} className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-700/50">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
                  <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                    <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
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
                            <span className="text-[10px] font-mono text-amber-400">{t.id}</span>
                          </td>
                          <td className="p-3 border border-gray-700">
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
                  <option value="teacher">Teacher (Use Assign New Teacher Tab)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="bursar">Bursar</option>
                  <option value="discipline_master">Discipline Master</option>
                  <option value="principal">Principal</option>
                </select>
              </div>

              {regRole === 'student' ? (
                <form onSubmit={handleStudentRegistration} className="space-y-2">
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
      setClassLevel(e.target.value);
    }}
    className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
  >
  {((section?.includes('General') || section === 'General Education')
  ? GENERAL_CLASSES_CATALOG
  : section?.includes('Commercial')
  ? TECHNICAL_COMMERCIAL_CATALOG
  : section?.includes('Industrial')
  ? TECHNICAL_INDUSTRIAL_CATALOG
  : []
).map((cls, idx) => (
  <option key={idx} value={cls}>{cls}</option>
))}
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
            {(section?.includes('Commercial') ? COMMERCIAL_TRADE_SERIES : INDUSTRIAL_TRADE_SERIES).map((trade, idx) => (
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
                      placeholder="e.g. Nsuh Brayden"
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Quarter / Residence</label>
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
                        placeholder="Mr. Che"
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
                      placeholder="e.g. Dr. Mbah Paul"
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
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3 flex justify-between items-center">
              <span>All Registered Students</span>
              {/* Smart Search Bar */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="🔍 Search ID, Name, Class, Trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900/90 text-white placeholder-gray-400 text-xs px-3 py-1.5 rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 font-mono">
              Total: {studentsList.length} (TE: {studentsList.filter(s => s.section === 'Technical Commercial' || s.section === 'Technical Industrial' || s.section?.toLowerCase().includes('technical')).length} | General: {studentsList.filter(s => s.section === 'General Education' || s.section?.toLowerCase().includes('general')).length})
              </span>
            </h2>
{/* Export & Print Action Bar */}
<div className="flex flex-wrap gap-3 mb-4 justify-between items-center bg-gray-800/80 p-3 rounded-lg border border-gray-700">
  <h3 className="text-lg font-bold text-white">Student Directory Actions</h3>
  
  <div className="flex gap-2">
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
              <option value="Technical Commercial">Technical Commercial (STT)</option>
              <option value="Technical Industrial">Technical Industrial (IND)</option>
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
            {printSection === 'Technical Commercial' &&
              TECHNICAL_COMMERCIAL_CATALOG.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}

            {/* Technical Industrial Catalog */}
            {printSection === 'Technical Industrial' &&
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
            {(printSection === 'Technical Commercial' || printSection === 'All') &&
              COMMERCIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}

            {/* Technical Industrial Trade Series */}
            {(printSection === 'Technical Industrial' || printSection === 'All') &&
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
className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-semibold text-xs px-3 py-1.5 rounded border border-gray-600 flex items-center justify-center gap-1.5"          >
            🖨️ Print List
          </button>
        </div>

    <button
      type="button"
      onClick={handleExportExcel}
      className="w-full sm:w-auto px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium text-xs transition flex items-center justify-center gap-1.5"
    >
      📊 Export to Excel
    </button>

    <button
      type="button"
      onClick={handleExportPDF}
      className="w-full sm:w-auto px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-medium text-xs transition flex items-center justify-center gap-1.5"
    >
      📄 Download PDF
    </button>
  </div>
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
                      const tradeVal = stu.trade || stu.trade_series || stu.specialty || '';
                      if (tradeVal.toLowerCase() !== printTrade.toLowerCase()) return false;
                    }
                    // Smart Search (First letters, Name, ID, Class, Section, Trade)
                    if (searchQuery.trim() !== '') {
                      const q = searchQuery.toLowerCase().trim();
                      const name = (stu.fullName || '').toLowerCase();
                      const id = (stu.unique_code || stu.id || '').toLowerCase();
                      const cls = (stu.classLevel || '').toLowerCase();
                      const sec = (stu.section || '').toLowerCase();
                      const trd = (stu.trade || stu.trade_series || stu.specialty || '').toLowerCase();

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
                <td className="p-3 font-mono text-amber-400 font-bold">{stu.unique_code || stu.id}</td>
<td className="p-3">
  {stu.picture ? (
    <img src={stu.picture} alt="" className="w-12 h-12 rounded-lg object-cover border border-amber-500/50 shadow-sm" />
  ) : (
    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">No Photo</div>
  )}
</td>
                <td className="p-3 font-semibold text-white text-base">{stu.fullName}</td>
             <td className="p-3">
      <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-700/40">
        {stu.section}
      </span>
      <div className="text-gray-400 mt-1 text-xs">
        {stu.classLevel}
      </div>
    </td>
    <td className="p-3">
      <div className="font-semibold text-white">
        {stu.section?.toLowerCase() === 'general' ? 'N/A' : (stu.trades_series || stu.trade || stu.trade_series || stu.specialty || 'N/A')}
      </div>
    </td>
                <td className="p-3"><span className="text-amber-300 font-medium">{stu.gender}</span>, {stu.age} yrs</td>
                <td className="p-3">
                  <div className="font-semibold text-white">{stu.guardianName}</div>
                  <div className="text-amber-300 font-mono text-xs">{stu.guardian_phone || stu.guardianPhone || 'N/A'}</div>
                </td>
                <td className="p-3">
  <div className="font-semibold text-white">{stu.residence || 'N/A'}</div>
</td>
               {/* REG DATE / TIME CELL */}
          <td className="p-3 text-[11px] leading-tight text-amber-400/90 whitespace-nowrap">
            <div className="font-semibold text-[11px] text-amber-400">
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

        {/* ASSIGN NEW TEACHER TAB (Updated: Dynamic classes per subject click, no period field) */}
        {activeTab === 'teachers' && (
          <div className={`p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6 transition-colors duration-300 ${teacherToEdit ? 'bg-white text-gray-900 border border-gray-300' : 'bg-[#111827] text-white border border-gray-800'}`}>
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Assign New Teacher & Configure Timetable</h2>
            
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
              {/* TEACHER PROFILE PHOTO / CAMERA SNAPSHOT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Teacher Profile Picture / Take Photo
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleTeacherPhotoChange}
              className="w-full text-xs text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 cursor-pointer bg-[#1f2937] border border-gray-700 rounded-lg p-1"
            />
          </div>
          <div className="flex items-center gap-3">
            {teacherPhotoPreview ? (
              <img
                src={teacherPhotoPreview}
                alt="Teacher Preview"
                className="w-14 h-14 rounded-xl object-cover border-2 border-amber-500 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 text-[10px] text-center p-1 font-semibold">
                No Photo
              </div>
            )}
            <span className="text-xs text-gray-400">
              {teacherPhotoPreview ? 'Photo ready to save' : 'Upload photo or tap on phone to snap picture'}
            </span>
          </div>
        </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Section</label>
                <select 
                  value={teacherSection} 
                  onChange={(e) => {
                    setTeacherSection(e.target.value);
                    setSelectedTeacherSubjects([]);
                    setSubjectSchedules({});
                  }}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                >
                  <option value="General Education">General Education</option>
<option value="Technical Commercial">Technical Commercial</option>
<option value="Technical Industrial">Technical Industrial</option>
<option value="Both">Both (All Sections)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                  Select Subjects Taught (Click subjects to add forms and configure day, start time, and end time)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto bg-[#1f2937]/50 p-3 rounded-lg border border-gray-700/50">
          {getAvailableSubjects().map((sub, idx) => (
            <label 
              key={idx} 
              className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer p-2 hover:bg-gray-800/60 rounded-md transition-colors touch-manipulation active:bg-gray-700/50"
            >
              <input
                type="checkbox"
                checked={selectedTeacherSubjects.includes(sub)}
                onChange={(e) => handleSubjectToggle(sub, e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 text-amber-600 focus:ring-0 cursor-pointer accent-amber-500 shrink-0"
              />
              <span className="leading-tight select-none">{sub}</span>
            </label>
          ))}
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
                                  value={row.className}
                                  onChange={(e) => handleScheduleRowChange(subject, rIdx, 'className', e.target.value)}
                                  className="w-full bg-[#1f2937] border border-gray-700 rounded p-2 text-xs text-amber-300"
                                >
                                  {ALL_AVAILABLE_CLASSES.map((cls, cId) => (
                                    <option key={cId} value={cls}>{cls}</option>
                                  ))}
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

              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg">
                Save Teacher Assignment, Verify Conflicts & Generate Timetable
              </button>
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
                ? 'bg-amber-500 text-black'
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

            {teachersList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No teachers assigned yet. Use the "Assign New Teacher" tab to add faculty members.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachersList.map((teacher, index) => (
                  <div key={teacher.id || index} className="bg-[#1f2937]/50 border border-gray-800 p-5 rounded-xl space-y-4">
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
                        className="text-xs bg-amber-500/10 border border-amber-500/40 text-amber-400 font-mono px-2 py-1 rounded hover:bg-amber-500/20 transition"
                      >
                        ID: {teacher.id} (Copy)
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subjects Taught:</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(teacher.subjects || []).map((sub, sIdx) => (
                          <span key={sIdx} className="text-xs bg-blue-900/40 border border-blue-600/40 text-blue-300 px-2.5 py-1 rounded-md">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

            {teachersList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No teachers assigned yet. Use the "Assign New Teacher" tab to add faculty members.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {teachersList.map((teacher, index) => (
  <div key={teacher.id || index} className="bg-[#1f2937]/50 border border-gray-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
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
  const rawSchedules = teacher.schedules || teacher.timetable || [];
const scheduleList = Array.isArray(rawSchedules) ? rawSchedules : [];

const uniqueSlots = scheduleList
      .filter(s => s && s.subject && (s.className || s.class || s.class_name || s.form))
      .map(s => ({
        subject: s.subject,
        className: s.className || s.class || s.class_name || s.form
      }));

  return uniqueSlots.length > 0 ? (
    uniqueSlots.map((slot, sIdx) => (
      <button
        key={sIdx}
        onClick={() => setSelectedTeacherForLogs({ teacher, subject: slot.subject, className: slot.className || 'General Education' })}
        className="bg-blue-900/40 border border-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-all"
      >
        <span>📄</span>
        <span>{slot.className} - {slot.subject} (View Logs & Progression)</span>
      </button>
    ))
  ) : (
    teacher.subjects && teacher.subjects.length > 0 ? (
      teacher.subjects.map((sub, sIdx) => {
        const subName = typeof sub === 'object' ? sub.name || sub.label || sub.subject : sub;
        const clsName = typeof sub === 'object' ? (sub.class || sub.className || sub.form || '') : (teacher.assigned_classes?.[sIdx] || teacher.class_name || teacher.className || '');
        const displayLabel = clsName ? `${clsName} - ${subName}` : subName;
        return (
          <button
            key={sIdx}
            onClick={() => setSelectedTeacherForLogs({ teacher, subject: subName, className: clsName || 'General Education' })}
            className="bg-blue-900/40 border border-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors"
          >
            <span>📄</span>
            <span>{displayLabel} (View Logs & Progression)</span>
          </button>
        );
      })
    ) : (
      <span className="text-xs text-gray-500 italic">No log subjects assigned</span>
    )
  );
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
          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <span>📋</span> Click to See Timetable & Details
        </button>

        <button
          onClick={() => {
            const confirmDelete = window.confirm(`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`);
            if (confirmDelete) {
              setTeachersList((prev) => prev.filter((t) => t.id !== teacher.id));
              alert(`${teacher.name} has been successfully deleted.`);
            }
          }}
          className="bg-red-900/40 hover:bg-red-800/60 border border-red-700/60 text-red-300 font-bold text-xs py-2 px-3 rounded transition-colors flex items-center justify-center gap-1"
          title="Delete Teacher"
        >
          <span>🗑️</span> Delete
        </button>
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
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white">Class & Subject Coefficients</h2>
              <p className="text-xs text-gray-400">Select section, class, and set individual subject coefficients for report card calculations.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCustomSubjectModal(true)}
                className="bg-gray-800 hover:bg-gray-700 text-blue-400 border border-blue-500/30 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                + Add Custom Subject
              </button>
              <button
                onClick={async () => {
                  const currentSchoolId = activeSchool?.id || activeSchool?.school_id || session?.user?.user_metadata?.school_id || session?.user?.id;

      if (!currentSchoolId) {
        alert("School ID missing. Please refresh or select a school.");
        return;
      }
                 const payload = subjectCoefficients
  .filter(s => s.selected)
  .map(s => ({
    school_id: currentSchoolId,
    section: selectedSection,
    classLevel: selectedClass,
   trades_series: selectedTradeSeries || null,
    subject_code: s.subject_code || (s.name ? s.name.substring(0, 4).toUpperCase() : 'SUBJ'),
    subject_name: s.name || s.subject_name,
    category: s.category || 'General Core Subjects',
    coefficient: parseFloat(s.coefficient) || 1,
    is_included: true
  }));

let deleteQuery = supabase
  .from('class_coefficients')
  .delete()
  .eq('school_id', currentSchoolId)
  .eq('section', selectedSection)
  .eq('classLevel', selectedClass);

if (selectedTradeSeries) {
  deleteQuery = deleteQuery.eq('trades_series', selectedTradeSeries);
} else {
  deleteQuery = deleteQuery.is('trades_series', null);
}

const { error: deleteError } = await deleteQuery;

if (deleteError) {
  alert("Error clearing old coefficients: " + deleteError.message);
  return;
}

if (payload.length > 0) {
      const { error: insertError } = await supabase
        .from('class_coefficients')
        .insert(payload);

      if (insertError) {
        alert("Error saving coefficients: " + insertError.message);
      } else {
        alert("Coefficients saved successfully! Report cards will automatically reflect these values.");
      }
    } else {
      alert("Please check at least one subject before saving.");
    }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs px-5 py-2 rounded-lg shadow-md transition"
              >
                Save & Validate
              </button>
            </div>
          </div>

          {/* Section & Class Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900/60 p-4 rounded-lg border border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Section</label>
              <select
                value={selectedSection}
               onChange={(e) => {
  const newSec = e.target.value;
  setSelectedSection(newSec);
  setSelectedTradeSeries('');
  if (newSec === 'General Education') setSelectedClass('Form 1 (F1)');
  else if (newSec === 'Technical Commercial (STT)') setSelectedClass('First Year Commercial (Y1Com)');
  else if (newSec === 'Technical Industrial (IND)') setSelectedClass('First Year Industrial (Y1Ind)');
}}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="General Education">General Education</option>
<option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
<option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Class Level</label>
              <select
                value={selectedClass}
                onChange={async (e) => {
  const newClass = e.target.value;
  setSelectedClass(newClass);
  setSelectedTradeSeries('');

  if (!newClass || !activeSchool?.id) return;

  // Fetch saved coefficients/subjects for this class from Supabase
  const { data, error } = await supabase
    .from('class_coefficients')
    .select('*')
    .eq('school_id', activeSchool.id)
    .eq('classLevel', newClass);

  if (error) {
    console.error("Error fetching class subjects:", error.message);
    return;
  }

  if (data && data.length > 0) {
    // Map fetched records back into your local subject state array
    setSubjectCoefficients(prevSubjects => 
      prevSubjects.map(sub => {
        const found = data.find(d => d.subject_name === (sub.name || sub.subject_name));
        return found ? { ...sub, selected: true, coefficient: found.coefficient } : { ...sub, selected: false };
      })
    );
  } else {
    // Reset selections if no template exists yet for this class
    setSubjectCoefficients(prevSubjects => 
      prevSubjects.map(sub => ({ ...sub, selected: false }))
    );
  }
}}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
              {(selectedSection === 'General Education' ? GENERAL_CLASSES_CATALOG : selectedSection === 'Technical Industrial (IND)' ? TECHNICAL_INDUSTRIAL_CATALOG : TECHNICAL_COMMERCIAL_CATALOG).map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

           <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Series / Specialty</label>
              {(selectedClass?.toUpperCase().includes('ARTS') || selectedClass?.toUpperCase().includes('SCI') || selectedClass?.toUpperCase().includes('L6') || selectedClass?.toUpperCase().includes('U6') || selectedSection !== 'General Education') ? (
                <select
                  value={selectedTradeSeries}
                  onChange={(e) => setSelectedTradeSeries(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">e.g. A4, S1, G2, </option>
                  {(selectedClass?.toUpperCase().includes('ARTS') || selectedClass?.toUpperCase().includes('L6A') || selectedClass?.toUpperCase().includes('U6A')) ? (
              <>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="A3">A3</option>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </>
            ) : (selectedClass?.toUpperCase().includes('SCIENCE') || selectedClass?.toUpperCase().includes('L6S') || selectedClass?.toUpperCase().includes('U6S')) ? (
              <>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
                <option value="S5">S5</option>
                <option value="S6">S6</option>
                <option value="S7">S7</option>
                <option value="S8">S8</option>
              </>
            ) : selectedSection?.includes("Commercial") ? (
              COMMERCIAL_TRADE_SERIES.map((trade) => (
                <option key={trade} value={trade}>{trade}</option>
              ))
            ) : selectedSection?.includes("Industrial") ? (
              INDUSTRIAL_TRADE_SERIES.map((trade) => (
                <option key={trade} value={trade}>{trade}</option>
              ))
            ) : null}
                  
                </select>
              ) : (
                <input
                  disabled
                  type="text"
                  placeholder="e.g. A4, S1, G2, Specialty Code"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-500 cursor-not-allowed"
                />
              )}
            </div>
          </div>

          {/* Tabular Table with Visible Lines */}
          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-300 border-b border-gray-700 uppercase tracking-wider font-semibold">
                  <th className="p-3 border-r border-gray-700 w-12 text-center">Include</th>
                  <th className="p-3 border-r border-gray-700">Subject Code</th>
                  <th className="p-3 border-r border-gray-700">Subject Name</th>
                  <th className="p-3 border-r border-gray-700">Category</th>
                  <th className="p-3 w-36 text-center">Coefficient</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {[...subjectCoefficients].sort((a, b) => {
  const targetCategory = selectedSection?.includes("Commercial") ? "Commercial Subjects" : selectedSection?.includes("Industrial") ? "Industrial Subjects" : "General Core Subjects";
  const aCatMatch = a.category === targetCategory ? 1 : 0;
  const bCatMatch = b.category === targetCategory ? 1 : 0;
  if (bCatMatch !== aCatMatch) return bCatMatch - aCatMatch;
  return (b.selected ? 1 : 0) - (a.selected ? 1 : 0);
}).map((sub, idx) => (
                  <tr key={sub.code || idx} className={`hover:bg-gray-800/50 transition ${sub.selected ? '' : 'opacity-40 bg-gray-900/40'}`}>
                   <td className="p-3 border-r border-gray-800 text-center">
                  {pendingUncheckSubject === sub.name ? (
                    <div className="flex items-center justify-center space-x-1 text-xs">
                      <button
                        type="button"
                        onClick={() => confirmUncheckCoreSubject(sub.name)}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-[10px]"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingUncheckSubject(null)}
                        className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded font-semibold text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <input
                      type="checkbox"
                      checked={sub.selected}
                      onChange={() => handleCoefficientSubjectToggle(sub.name)}
                      className="w-4 h-4 rounded accent-amber-500 bg-gray-800 border-gray-700 focus:ring-0 cursor-pointer"
                    />
                  )}
                </td>
                    <td className="p-3 border-r border-gray-800 font-mono text-amber-400 font-semibold">{sub.code}</td>
                    <td className="p-3 border-r border-gray-800 font-medium text-white">{sub.name}</td>
                    <td className="p-3 border-r border-gray-800 text-gray-400">{sub.category || 'General Core Subjects'}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={sub.coefficient || 1}
                        onChange={(e) => handleCoefficientChange(sub.name, e.target.value)}
                        disabled={!sub.selected}
                        className="w-20 bg-gray-900 border border-amber-500/50 rounded p-1.5 text-center text-xs text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-30 disabled:border-gray-700"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-900/60 p-4 rounded-lg border border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Section</label>
              <select
                value={masterSection}
                onChange={(e) => {
                  setMasterSection(e.target.value);
                  setMasterSeries('');
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="General Education">General Education</option>
<option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
<option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Class Level</label>
              <select
                value={masterClass}
               onChange={(e) => {
  const selectedClass = e.target.value;
  setMasterClass(selectedClass);
  setMasterSeries('');

  // Auto-sync Section state using Catalogs as the Single Source of Truth (General First)
  if (GENERAL_CLASSES_CATALOG.includes(selectedClass)) {
    setMasterSection('General Education');
  } else if (TECHNICAL_COMMERCIAL_CATALOG.includes(selectedClass)) {
    setMasterSection('Technical Commercial (STT)');
  } else if (TECHNICAL_INDUSTRIAL_CATALOG.includes(selectedClass)) {
    setMasterSection('Technical Industrial (IND)');
  }
}}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                {((masterSection === 'General Education' || masterSection?.includes('General'))
  ? GENERAL_CLASSES_CATALOG
  : masterSection?.includes('Commercial')
  ? TECHNICAL_COMMERCIAL_CATALOG
  : masterSection?.includes('Industrial')
  ? TECHNICAL_INDUSTRIAL_CATALOG
  : []
).map((cls) => (
  <option key={cls} value={cls}>{cls}</option>
))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Series / Specialty</label>
              <select
                value={masterSeries}
                onChange={(e) => {
                  const selectedSeries = e.target.value;
                  setMasterSeries(selectedSeries);
                 if (
    GENERAL_SERIES_CATALOG.ARTS.includes(selectedSeries) || 
    GENERAL_SERIES_CATALOG.SCIENCE.includes(selectedSeries)
  ) {
    setMasterSection('General Education');
  } else if (COMMERCIAL_TRADE_SERIES.includes(selectedSeries)) {
    setMasterSection('Technical Commercial (STT)');
  } else if (INDUSTRIAL_TRADE_SERIES.includes(selectedSeries)) {
    setMasterSection('Technical Industrial (IND)');
  }
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="">e.g. A4, S1, G2, Specialty Code</option>
                {(masterClass?.toUpperCase().includes('ARTS') || masterClass?.toUpperCase().includes('L6A') || masterClass?.toUpperCase().includes('U6A')) && (
              GENERAL_SERIES_CATALOG.ARTS.map((s) => <option key={s} value={s}>{s}</option>)
            )}
            {(masterClass?.toUpperCase().includes('SCIENCE') || masterClass?.toUpperCase().includes('L6S') || masterClass?.toUpperCase().includes('U6S')) && (
              GENERAL_SERIES_CATALOG.SCIENCE.map((s) => <option key={s} value={s}>{s}</option>)
            )}
            {masterSection?.includes("Commercial") && COMMERCIAL_TRADE_SERIES.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
            {masterSection?.includes("Industrial") && INDUSTRIAL_TRADE_SERIES.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
            </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Term</label>
              <select
                value={masterTerm}
                onChange={(e) => setMasterTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="Term 1">Term 1 (Seq 1 & 2)</option>
                <option value="Term 2">Term 2 (Seq 3 & 4)</option>
                <option value="Term 3">Term 3 (Seq 5 & 6)</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          {isMasterLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading master mark sheet...</div>
          ) : masterStudentsData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No registered students found for this selection.</div>
          ) : (
            <div className="overflow-x-auto border border-gray-700 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1B4D3E] text-white border-b border-emerald-900 text-center">
                    <th className="p-3 border-r border-gray-700 w-10 sticky left-0 z-20 bg-[#1B4D3E]" rowSpan={2}>N°</th>
                    <th className="p-3 border-r border-gray-700 text-left min-w-[180px] sticky left-10 z-20 bg-[#1B4D3E]" rowSpan={2}>Student Name</th>
                    {masterSubjects.map((sub) => (
                      <th key={sub.id || sub.subject_name} className="p-2 border-r border-gray-700 min-w-[120px]" colSpan={2}>
                        <div className="font-bold text-white text-xs leading-tight line-clamp-2 min-h-[28px] flex items-center justify-center">{sub.subject_name}</div>
<div className="text-[10px] text-amber-400 font-mono mt-1 bg-black/20 py-0.5 px-1.5 rounded inline-block">Coef: {sub.coefficient || 1}</div>
                      </th>
                    ))}
                    <th className="p-3 border-r border-emerald-900 bg-[#12362B] text-amber-300 font-bold min-w-[90px]" rowSpan={2}>TOTAL COEF</th>
<th className="p-3 border-r border-emerald-900 bg-[#12362B] text-amber-300 font-bold min-w-[90px]" rowSpan={2}>TOTAL MARKS</th>
<th className="p-3 border-r border-emerald-900 bg-[#12362B] text-emerald-300 font-extrabold min-w-[100px]" rowSpan={2}>TERM AVG (/20)</th>
<th className="p-3 border-r border-emerald-900 bg-[#12362B] text-amber-300 font-bold min-w-[70px]" rowSpan={2}>RANK</th>
<th className="p-3 border-emerald-900 bg-[#12362B] text-white font-bold min-w-[110px]" rowSpan={2}>REMARKS</th>
                  </tr>
                  <tr className="bg-[#1B4D3E] text-white border-b border-emerald-900 text-center text-[10px]">
                    {masterSubjects.map((sub) => (
                      <React.Fragment key={`seq-hdr-${sub.id || sub.subject_name}`}>
                        <th className="p-1 border-r border-gray-700 w-1/2 min-w-[60px] text-[10px] font-semibold text-center uppercase tracking-wider text-gray-300">Seq 1</th>
<th className="p-1 border-r border-gray-700 w-1/2 min-w-[60px] text-[10px] font-semibold text-center uppercase tracking-wider text-gray-300">Seq 2</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-[#FDFBF7] text-gray-900">
                  {masterStudentsData.map((student, idx) => {
                    let totalWeighted = 0;
                    let totalCoeffs = 0;

                   const missingSubjects = [];

  masterSubjects.forEach((sub) => {
    const coef = Number(sub.coefficient) || 1;
    totalCoeffs += coef;

    const m = student.marks?.find((item) => (item.subject || item.subject_name) === (sub.subject || sub.subject_name));
    
    // Check available sequence marks dynamically
    const seq1Valid = m?.seq1_mark !== undefined && m?.seq1_mark !== null && m?.seq1_mark !== '' && m?.seq1 !== '-';
    const seq2Valid = m?.seq2_mark !== undefined && m?.seq2_mark !== null && m?.seq2_mark !== '' && m?.seq2 !== '-';

    const s1 = seq1Valid ? Number(m.seq1_mark ?? m.seq1) : null;
    const s2 = seq2Valid ? Number(m.seq2_mark ?? m.seq2) : null;

    let subAvg = 0;
    if (s1 !== null && s2 !== null) {
      subAvg = (s1 + s2) / 2;
    } else if (s1 !== null) {
      subAvg = s1;
    } else if (s2 !== null) {
      subAvg = s2;
    } else {
      missingSubjects.push(sub.subject_name || sub.subject || 'Unknown Subject');
    }

    totalWeighted += subAvg * coef;
  });

                    const termAvg = totalCoeffs > 0 ? (totalWeighted / totalCoeffs).toFixed(2) : '0.00';

                    return (
                      <tr key={student.id} className="hover:bg-amber-50/60 transition border-b border-gray-300">
                        <td className="p-2 border-r border-gray-800 text-center font-mono text-gray-400">{idx + 1}</td>
                        <td className="p-2 border-r border-gray-300 font-semibold text-gray-900 min-w-[180px] sticky left-10 z-10 bg-white">
  <div className="flex items-center justify-between gap-2">
    <span>{student.name}</span>
    {missingSubjects.length > 0 && (
      <span 
        className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 rounded cursor-help font-normal"
        title={`Pending mark entry for: ${missingSubjects.join(', ')}`}
      >
        ⚠️ {missingSubjects.length} Pending
      </span>
    )}
  </div>
</td>
                        {masterSubjects.map((sub) => {
                          const m = student.marks?.find((item) => (item.subject_id === sub.id || item.subject_name === sub.subject_name || item.subject === (sub.subject_name || sub.name || sub)));
                          return (
                            <React.Fragment key={`mark-${student.id}-${sub.id || sub.subject_name}`}>
                              <td className="p-2 border-r border-gray-800 text-center font-mono relative group">
                  <input
  type="number"
  min="0"
  max="20"
  step="0.5"
  value={m?.seq1_mark !== undefined && m?.seq1_mark !== null ? m.seq1_mark : (m?.seq1 !== undefined && m?.seq1 !== null ? m.seq1 : '')}
  placeholder="-"
  onChange={(e) => handleAdminMarkChange(student.id, sub.id || sub.subject || sub.subject_name, 'seq1_mark', e.target.value)}
  className="w-12 text-center bg-transparent border-b border-transparent hover:border-amber-500 focus:border-amber-600 focus:bg-amber-50 focus:outline-none font-mono text-xs font-semibold text-gray-900 transition-colors"
/>
                  {m?.edit_count > 0 && m?.id && (
                    <button
                      onClick={() => handleUnlockMarks(m.id)}
                      className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                      title="Unlock mark for teacher edit"
                    >
                      🔓
                    </button>
                  )}
                </td>
                              <td className="p-2 border-r border-gray-800 text-center font-mono relative group">
                  <input
  type="number"
  min="0"
  max="20"
  step="0.5"
  value={m?.seq2_mark !== undefined && m?.seq2_mark !== null ? m.seq2_mark : (m?.seq2 !== undefined && m?.seq2 !== null ? m.seq2 : '')}
  placeholder="-"
  onChange={(e) => handleAdminMarkChange(student.id, sub.id || sub.subject || sub.subject_name, 'seq2_mark', e.target.value)}
  className="w-12 text-center bg-transparent border-b border-transparent hover:border-amber-500 focus:border-amber-600 focus:bg-amber-50 focus:outline-none font-mono text-xs font-semibold text-gray-900 transition-colors"
/>
                  {m?.edit_count > 0 && m?.id && (
                    <button
                      onClick={() => handleUnlockMarks(m.id)}
                      className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                      title="Unlock mark for teacher edit"
                    >
                      🔓
                    </button>
                  )}
                </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="p-2 border-r border-gray-800 text-center font-mono font-semibold text-amber-400">{totalCoeffs}</td>
                        <td className="p-2 border-r border-gray-800 text-center font-mono font-bold text-gray-900">{totalWeighted.toFixed(2)}</td>
                        <td className={`p-2 border-r border-gray-800 text-center font-mono font-bold ${Number(termAvg) >= 10 ? 'text-blue-600' : 'text-red-600'}`}>{termAvg}</td>
                        <td className="p-2 border-r border-gray-800 text-center font-mono text-gray-300">-</td>
                        <td className="p-2 text-center text-xs font-semibold">
                          {Number(termAvg) >= 10 ? (
                            <span className="text-blue-600 font-bold">Passed</span>
                          ) : (
                            <span className="text-red-600 font-bold">Failed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
            {/* Subject Average Row */}
            <tr className="bg-slate-900/90 font-semibold border-t-2 border-emerald-600/60 text-white">
              <td colSpan={2} className="px-4 py-2 text-right text-xs text-slate-300">
                Subject Average (/20):
              </td>
              {masterSubjects?.map((sub) => {
                const validMarks = (masterStudentsData || [])
                  .map((s) => parseFloat(s.marks?.[sub.id] || s[sub.id]))
                  .filter((val) => !isNaN(val));

                const avg = validMarks.length
                  ? (validMarks.reduce((a, b) => a + b, 0) / validMarks.length).toFixed(2)
                  : '-';

                return (
                  <td key={`avg_${sub.id}`} colSpan={2} className="text-center py-2 text-xs text-amber-400">
                    {avg}
                  </td>
                );
              })}
              <td colSpan={3} className="bg-slate-900/90"></td>
            </tr>

            {/* Pass Percentage Row */}
            <tr className="bg-slate-900 font-semibold border-b border-slate-700 text-white">
              <td colSpan={2} className="px-4 py-2 text-right text-xs text-slate-300">
                Passed (% ≥ 10/20):
              </td>
              {masterSubjects?.map((sub) => {
                const validMarks = (masterStudentsData || [])
                  .map((s) => parseFloat(s.marks?.[sub.id] || s[sub.id]))
                  .filter((val) => !isNaN(val));

                const passedCount = validMarks.filter((val) => val >= 10).length;
                const passPct = validMarks.length
                  ? ((passedCount / validMarks.length) * 100).toFixed(1) + '%'
                  : '-';

                return (
                  <td key={`pct_${sub.id}`} colSpan={2} className="text-center py-2 text-xs text-emerald-400">
                    {passPct}
                  </td>
                );
              })}
              <td colSpan={3} className="bg-slate-900/90"></td>
            </tr>
          </tfoot>
              </table>
              <div className="mt-4 flex justify-end">
  <button
    type="button"
    onClick={handleSaveMasterMarks}
    className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2"
  >
    Save and Update Marks
  </button>
</div>
            </div>
          )}
        </div>
        
      )}
        {activeTab === 'details' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-2xl mx-auto shadow-2xl space-y-6">
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
    value={activeSchool?.academic_year || getAcademicYear()}
    disabled
    readOnly
    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
  />
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

              <button 
                onClick={() => alert('School parameters updated successfully!')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all"
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
                onClick={confirmDeleteStudent}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
              >
                Yes, Delete Student
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
    doc.text(`School: ${school} | Academic Year: ${getAcademicYear()}`, 14, 22);

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
          <div className="text-right text-emerald-400">ACADEMIC YEAR: {getAcademicYear()}</div>
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
      {/* EDIT SCHEDULE MODAL */}
{isEditingSchedule && teacherToEdit && (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6 text-white shadow-xl">
      <h3 className="text-lg font-bold text-amber-400 mb-2">
        Edit Timetable: {teacherToEdit?.name || teacherToEdit?.full_name}
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Teacher ID: <span className="font-mono text-gray-200">{teacherToEdit?.teacher_id || teacherToEdit?.id}</span>
      </p>

      {/* Editable Workload / Periods Container */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        <div className="p-3 bg-gray-800 rounded border border-gray-700 text-xs text-gray-300">
          Modify active classes, assigned subjects, or period times for this staff member without changing their system ID.
        </div>
        {/* You can map through teacherToEdit?.timetable_data here to render editable inputs */}
      </div>

      <div className="mt-6 flex justify-end gap-3 no-print">
        <button
          onClick={() => setIsEditingSchedule(false)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded transition"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Save updated timetable to Supabase
            setIsEditingSchedule(false);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}
      {/* CUSTOM SUBJECT MODAL */}
      {customSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-4">Add Custom Subject</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. Robotics, Home Economics"
                  value={newSubjectTitle}
                  onChange={(e) => setNewSubjectTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
                <select
                  value={newSubjectCategory}
                  onChange={(e) => setNewSubjectCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="General Core Subjects">General Core Subjects</option>
                  <option value="Arts & Humanities Series">Arts & Humanities Series</option>
                  <option value="Science & Technology Series">Science & Technology Series</option>
                  <option value="Commercial & Business Series">Commercial & Business Series</option>
                  <option value="Industrial & Technical Trades">Industrial & Technical Trades</option>
                  <option value="Custom/Other Subjects">Custom/Other Subjects</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setCustomSubjectModal(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newSubjectTitle.trim()) return;
                  const newSub = {
                    code: newSubjectTitle.trim().toUpperCase().replace(/\s+/g, '_'),
                    name: newSubjectTitle.trim(),
                    category: newSubjectCategory,
                    coefficient: 1,
                    selected: true
                  };
                  setSubjectCoefficients(prev => [...prev, newSub]);
                  setNewSubjectTitle('');
                  setCustomSubjectModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded"
              >
                Add Subject
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
          <li>Assign teachers and automatically generate downloadable time tables upon assignment.</li>
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
                  <span>Subject: <strong className="text-white">{selectedTeacherForLogs?.subject || 'N/A'}</strong></span>
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
              <div className="flex items-center gap-2 text-xs text-[#2D5A27] font-bold">
                <span className="text-gray-700">Active Class Sheet:</span>
                <span className="bg-[#2D5A27] text-white px-3 py-1 rounded-md text-xs font-bold tracking-wide shadow-sm">
                  {selectedTeacherForLogs?.className || 'General'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#2D5A27] font-bold">Academic Year: {activeSchool?.academic_year || '2026/2027'}</span>
                <button
                  onClick={() => window.print()}
                  className="bg-[#2D5A27] hover:bg-[#1E3E1A] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>🖨️</span> One-Click Print / Download PDF
                </button>
              </div>
            </div>

            {/* Content Body - White-Beige Theme */}
            <div className="p-5 overflow-y-auto flex-1 bg-[#FDFBF7]">
              
              <div className="border-2 border-[#2D5A27] rounded-lg overflow-hidden bg-[#FDFBF7] shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#2D5A27] text-white text-xs font-bold uppercase tracking-wider">
                      <th className="p-3 border border-[#2D5A27] w-[12%] text-center">Week</th>
                      <th className="p-3 border border-[#2D5A27] w-[18%] text-center">Date & Time</th>
                      <th className="p-3 border border-[#2D5A27] w-[50%]">Lesson Taught</th>
                      <th className="p-3 border border-[#2D5A27] w-[20%]">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D5A27]/30 text-xs">
                    <tr className="bg-[#FDFBF7]">
                      <td className="p-3 border border-[#2D5A27]/40 text-center font-bold text-[#2D5A27] bg-[#EFECE6]" rowSpan={2}>
                        <div className="text-xs font-extrabold">W1</div>
                        <div className="text-[10px] text-gray-600 font-normal">07/09 - 11/09</div>
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 text-center text-[11px] font-medium text-gray-800 bg-[#FDFBF7]">
                        Mon, Sep 07<br />
                        <span className="text-[10px] text-[#2D5A27] font-bold">07:30 - 08:15</span>
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 font-medium text-gray-900 bg-[#FDFBF7]"></td>
                      <td className="p-3 border border-[#2D5A27]/40 text-gray-700 bg-[#FDFBF7]"></td>
                    </tr>
                    <tr className="bg-[#FDFBF7]">
                      <td className="p-3 border border-[#2D5A27]/40 text-center text-[11px] font-medium text-gray-800 bg-[#FDFBF7]">
                        Wed, Sep 09<br />
                        <span className="text-[10px] text-[#2D5A27] font-bold">08:15 - 09:00</span>
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 font-medium text-gray-900 bg-[#FDFBF7]"></td>
                      <td className="p-3 border border-[#2D5A27]/40 text-gray-700 bg-[#FDFBF7]"></td>
                    </tr>
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