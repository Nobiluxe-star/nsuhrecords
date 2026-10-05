'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentAcademicYear } from '../../lib/academicYear';
import { toast } from 'react-hot-toast';
import { getTeacherLockStatus } from '../../lib/markLockService';

import { 
  GENERAL_LOWER_CLASSES,
  GENERAL_SERIES_CATALOG, 
  COMMERCIAL_TRADE_SERIES,
  TECHNICAL_COMMERCIAL_CATALOG,
  TECHNICAL_INDUSTRIAL_CATALOG
} from '../admin-dashboard/page';

const FORMULA_LIBRARY = {
  math: [
    { label: 'Fraction', symbol: '$$\\frac{a}{b}$$' },
    { label: 'Square Root', symbol: '$$\\sqrt{x}$$' },
    { label: 'Exponent', symbol: '$$x^n$$' },
    { label: 'Subscript', symbol: '$$x_i$$' },
    { label: 'Integral', symbol: '$$\\int_{a}^{b} x \\, dx$$' },
    { label: 'Summation', symbol: '$$\\sum_{i=1}^{n} x_i$$' },
    { label: 'Quadratic', symbol: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$' },
    { label: 'Pi / Theta', symbol: '$$\\pi, \\theta, \\alpha, \\beta$$' }
  ],
  physics: [
    { label: 'Newton 2nd Law', symbol: '$$F = m \\cdot a$$' },
    { label: 'Kinematics', symbol: '$$v = u + at$$' },
    { label: 'Work / Energy', symbol: '$$W = F \\cdot d \\cdot \\cos(\\theta)$$' },
    { label: 'Kinetic Energy', symbol: '$$E_k = \\frac{1}{2} m v^2$$' },
    { label: 'Ohm\'s Law', symbol: '$$V = I \\cdot R$$' },
    { label: 'Power', symbol: '$$P = I^2 \\cdot R = \\frac{V^2}{R}$$' }
  ],
  chemistry: [
    { label: 'Reaction Arrow', symbol: '$$\\rightarrow$$' },
    { label: 'Equilibrium', symbol: '$$\\rightleftharpoons$$' },
    { label: 'Concentration', symbol: '$$C = \\frac{n}{V}$$' },
    { label: 'Ideal Gas', symbol: '$$P V = n R T$$' },
    { label: 'pH Formula', symbol: '$$\\text{pH} = -\\log[H^+]$$' }
  ],
  electrical: [
    { label: 'AC Impedance', symbol: '$$Z = \\sqrt{R^2 + (X_L - X_C)^2}$$' },
    { label: 'Transformer Ratio', symbol: '$$\\frac{V_p}{V_s} = \\frac{N_p}{N_s} = \\frac{I_s}{I_p}$$' },
    { label: 'Apparent Power', symbol: '$$S = V \\cdot I \\quad \\text{(VA)}$$' },
    { label: 'Frequency', symbol: '$$f = \\frac{1}{2\\pi \\sqrt{L C}}$$' }
  ],
  mechanical: [
    { label: 'Torque', symbol: '$$\\tau = r \\cdot F \\cdot \\sin(\\theta)$$' },
    { label: 'Stress (Sigma)', symbol: '$$\\sigma = \\frac{F}{A}$$' },
    { label: 'Strain (Epsilon)', symbol: '$$\\epsilon = \\frac{\\Delta L}{L_0}$$' },
    { label: 'Gear Ratio', symbol: '$$i = \\frac{Z_2}{Z_1} = \\frac{N_1}{N_2}$$' }
  ],
  building_construction: [
    { label: 'Bending Moment', symbol: '$$M_{max} = \\frac{w \\cdot L^2}{8}$$' },
    { label: 'Concrete Mix Ratio', symbol: '$$1 : 2 : 4 \\quad \\text{(Cement : Sand : Aggregate)}$$' },
    { label: 'Slenderness Ratio', symbol: '$$\\lambda = \\frac{L_{eff}}{r}$$' }
  ]
};
const RenderFormattedLogContent = ({ content, mediaUrls }) => {
  if (!content) return null;

  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g);

  return (
    <div className="space-y-1.5">
      <div className="whitespace-pre-wrap word-break-break-word leading-relaxed font-mono text-[11px] text-gray-800">
        {parts.map((part, i) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return (
              <div key={i} className="my-1.5 p-2 bg-emerald-950/10 rounded border border-emerald-500/20 text-center font-bold text-emerald-950 overflow-x-auto text-[11px]">
                {part.slice(2, -2)}
              </div>
            );
          } else if (part.startsWith('$') && part.endsWith('$')) {
            return (
              <span key={i} className="px-1 py-0.5 bg-emerald-100 text-emerald-900 font-semibold rounded italic text-[11px]">
                {part.slice(1, -1)}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {mediaUrls && mediaUrls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {mediaUrls.map((url, imgIdx) => (
            <img key={imgIdx} src={url} alt="Whiteboard Snapshot" className="w-12 h-12 object-cover rounded border border-gray-300 shadow-sm cursor-pointer hover:opacity-80" />
          ))}
        </div>
      )}
    </div>
  );
};
  export default function TeacherDashboardPage() {
  const [teacherProfile, setTeacherProfile] = useState({
  school_id: '',
  id: '',
  name: '',
  email: '',
  phone: '',
  residence: '',
  section: '',
  subjects: [],
  schedules: {}
});
  const currentAcademicYear = getCurrentAcademicYear();
  const [schoolDetails, setSchoolDetails] = useState(null);
  const [selectedSubjectForAction, setSelectedSubjectForAction] = useState('');
  const [selectedSectionForAction, setSelectedSectionForAction] = useState('General');
  const [selectedClassForAction, setSelectedClassForAction] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [navigationHistory, setNavigationHistory] = useState(['overview']);
  const [currentTime, setCurrentTime] = useState(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedClassLog, setSelectedClassLog] = useState(/** @type {any} */ (null));const [lessonContent, setLessonContent] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState('ALL');
  const [successBanner, setSuccessBanner] = useState(null);
  const [databaseTrades, setDatabaseTrades] = useState([]);
  const [isMarkEntryAuthorized, setIsMarkEntryAuthorized] = useState(true);

  // Priority Mission: Fetch unique enrolled trades/series directly from Supabase
  useEffect(() => {
    const fetchEnrolledTradesFromSupabase = async () => {
      const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
      if (!activeSchoolId || !selectedClassForAction) {
        setDatabaseTrades([]);
        return;
      }

      const currentTeacherId = teacherProfile?.teacher_id || teacherProfile?.id || localStorage.getItem('teacher_id');
      if (activeSchoolId && currentTeacherId) {
        getTeacherLockStatus(currentTeacherId, activeSchoolId).then((isLocked) => {
          setIsMarkEntryAuthorized(!isLocked);
        });
      }
      
      // Lock General Lower Forms to N/A
      if (Array.isArray(GENERAL_LOWER_CLASSES) && GENERAL_LOWER_CLASSES.includes(selectedClassForAction)) {
        setDatabaseTrades(['N/A']);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('students')
          .select('trades_series')
          .eq('school_id', activeSchoolId)
          .eq('classLevel', selectedClassForAction.trim());

        if (error) throw error;

        if (data && data.length > 0) {
          const uniqueTrades = Array.from(
            new Set(
              data
                .map(s => s.trades_series)
                .filter(t => t && t.trim() !== '' && t !== 'N/A')
            )
          );
          setDatabaseTrades(uniqueTrades);
        } else {
          setDatabaseTrades([]);
        }
      } catch (err) {
        console.warn('Error fetching enrolled trades from Supabase:', err.message || err);
        setDatabaseTrades([]);
      }
    };

    fetchEnrolledTradesFromSupabase();
  }, [selectedClassForAction, teacherProfile?.school_id]);
  // Universal 24-Hour Strict Edit Lock Checker
  const checkIsLogLocked = (createdAt) => {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    const currentTime = Date.now();
    return (currentTime - createdTime) / (1000 * 60 * 60) >= 24;
  };
  // Dynamically resolve classes based strictly on the teacher's schedule assignment
const assignedClassesForSubject = useMemo(() => {
  if (!teacherProfile?.schedules || !selectedSubjectForAction) return [];
  const subjectSchedules = teacherProfile.schedules[selectedSubjectForAction] || [];
  const classes = new Set();
  subjectSchedules.forEach((item) => {
    if (item.className) {
      classes.add(item.className);
    }
  });
  return Array.from(classes);
}, [teacherProfile, selectedSubjectForAction]);

// Dynamically resolve trades/series from catalogs based on the selected class/form
const assignedTradesForClass = useMemo(() => {
    if (!selectedClassForAction) return [];

    // If the selected class belongs to general lower classes (Form 1 to 5), disable trade/series
    if (Array.isArray(GENERAL_LOWER_CLASSES) && GENERAL_LOWER_CLASSES.includes(selectedClassForAction)) {
      return ['N/A'];
    }

    const className = selectedClassForAction.toLowerCase();

    // For General 6th Form (Lower / Upper Sixth)
    if (className.includes('sixth') || className.includes('form') || className.includes('l6') || className.includes('u6')) {
      if (!GENERAL_SERIES_CATALOG) return [];

      const rawArts = GENERAL_SERIES_CATALOG.ARTS || [];
      const rawScience = GENERAL_SERIES_CATALOG.SCIENCE || [];

      // Extract subject-specific series if catalog metadata is available
      if (selectedSubjectForAction && GENERAL_SERIES_CATALOG.series) {
        const matchingArts = (GENERAL_SERIES_CATALOG.series.ARTS || [])
          .filter(s => s.subjects && s.subjects.includes(selectedSubjectForAction))
          .map(s => s.code);

        const matchingScience = (GENERAL_SERIES_CATALOG.series.SCIENCE || [])
          .filter(s => s.subjects && s.subjects.includes(selectedSubjectForAction))
          .map(s => s.code);

        const filtered = [...matchingArts, ...matchingScience];
        if (filtered.length > 0) return filtered;
      }

      // Fallback: Return all standard series codes
      return [...rawArts, ...rawScience];
    }

    // For Technical Commercial classes
    if (className.includes('comm') || className.includes('market') || className.includes('account')) {
      return COMMERCIAL_TRADE_SERIES || TECHNICAL_COMMERCIAL_CATALOG || [];
    }

    // For Technical Industrial classes
    if (className.includes('ind') || className.includes('tech') || className.includes('elect')) {
      return TECHNICAL_INDUSTRIAL_CATALOG || [];
    }

    // Default fallback
    const rawArts = GENERAL_SERIES_CATALOG?.ARTS || [];
    const rawScience = GENERAL_SERIES_CATALOG?.SCIENCE || [];
    return [...rawArts, ...rawScience];
  }, [selectedClassForAction, selectedSubjectForAction]);

const assignedSectionsForSubject = useMemo(() => {
  if (!teacherProfile?.schedules || !selectedSubjectForAction) return [];
  const subjectsSchedules = teacherProfile.schedules[selectedSubjectForAction] || [];
  const sectionsSet = new Set();
  subjectsSchedules.forEach((item) => {
    const sectionValue = item.section || item.schoolSection || item.sectionName;
    if (sectionValue) sectionsSet.add(sectionValue);
  });
  if (sectionsSet.size === 0) {
    return ['General Education', 'Technical Commercial (STT)', 'Technical Industrial (IND)'];
  }
  return Array.from(sectionsSet);
}, [teacherProfile, selectedSubjectForAction]);

  // Motivational Quotes state
  const [currentQuote, setCurrentQuote] = useState({
    quote: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela"
  });

 
  const canvasRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [savedLocalDocs, setSavedLocalDocs] = useState([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. HANDLER FUNCTIONS
  const saveCanvasDrawing = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    
    // Convert drawing into markdown image tag and append to document content
    setDocContent((prev) => prev + `\n\n![Canvas Diagram](${dataUrl})\n\n`);
    alert("Drawing attached successfully to your document draft!");
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };
  const syncDraftToSupabase = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      alert("Please enter a title and document content before syncing.");
      return;
    }

    setIsSyncingToSupabase(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const documentPayload = {
        school_id: teacherProfile?.school_id || 'DEFAULT_SCHOOL',
        teacher_id: user.id,
        academic_year: currentAcademicYear,
        title: docTitle,
        doc_type: selectedDocType,
        subject: selectedSubjectForAction,
        classLevel: selectedClassForAction,
        section: selectedSection,
        content: docContent,
        drawing_data: canvasRef.current ? canvasRef.current.toDataURL() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('teacher_documents')
        .upsert([documentPayload]);

      if (error) throw error;

      setLastSavedTime(`Synced: ${new Date().toLocaleTimeString()}`);
      alert(`Document successfully synced for Academic Year ${currentAcademicYear}!`);
    } catch (err) {
      console.error("Cloud Sync Error:", err);
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingToSupabase(false);
    }
  };

  const quotesList = [
    { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { quote: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
    { quote: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein" },
    { quote: "Teaching kids to count is fine, but teaching them what counts is best.", author: "Bob Talbert" }
  ];

  // Dynamically assigned Teacher Profile with real-world assignment data (reset/empty states for new assignments)
  const [schoolName, setSchoolName] = useState('Loading School...');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedSection, setSelectedSection] = useState('General');
  const [lessonText, setLessonText] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logsList, setLogsList] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isMarksLocked, setIsMarksLocked] = useState(false);
// Lesson Notes & Test Bank Workspace State
  const [notesAndTests, setNotesAndTests] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('note'); // 'note' or 'test'
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [selectedFormulaCategory, setSelectedFormulaCategory] = useState('math');
  // Canvas, Drawing & Subject-Specific State
  const [activeDrawingTool, setActiveDrawingTool] = useState('select');
  const [frenchAccentMode, setFrenchAccentMode] = useState(false);
  const [canvasShapes, setCanvasShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);

  // Helper to insert formula symbols or accents into text
  const insertSymbolIntoContent = (symbol) => {
    setDocContent((prev) => prev + ' ' + symbol);
  };

  // Helper to add interactive shapes/diagrams with customizable labels
  const addShapeToCanvas = (type) => {
    const newShape = {
      id: Date.now(),
      type, // 'rectangle', 'circle', 'dimension_line', 'angle_arc', 'gear'
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      label: type === 'rectangle' ? 'L = 10m' : 'Label',
      labelPosition: 'right', // 'top', 'bottom', 'left', 'right', 'inside'
    };
    setCanvasShapes((prev) => [...prev, newShape]);
    // Offline Local Draft & Supabase Sync Handlers
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);

  // Save current work to browser storage instantly (works offline)
  const saveDraftLocally = () => {
    setIsSavingLocal(true);
    const draftData = {
      docTitle,
      docContent,
      selectedDocType,
      canvasShapes,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('nsuhrecords_lesson_draft', JSON.stringify(draftData));
    setLastSavedTime(new Date().toLocaleTimeString());
    setTimeout(() => setIsSavingLocal(false), 400);
  };

  // Sync draft from local cache to Supabase database
  const syncDraftToSupabase = async () => {
    setIsSyncingToSupabase(true);
    try {
      const localData = localStorage.getItem('nsuhrecords_lesson_draft');
      const payload = localData ? JSON.parse(localData) : {
        docTitle,
        docContent,
        selectedDocType,
        canvasShapes,
      };

      // Push to Supabase 'lesson_notes_tests' table
      const { error } = await supabase.from('lesson_notes_tests').upsert([
        {
          teacher_id: teacherProfile?.id,
          subject: selectedSubjectForAction,
          class_name: selectedClassForAction,
          doc_type: payload.selectedDocType,
          title: payload.docTitle,
          content: payload.docContent,
          canvas_data: payload.canvasShapes,
          updated_at: new Date().toISOString(),
        }
      ]);

      if (!error) {
        setLastSavedTime(new Date().toLocaleTimeString() + ' (Synced)');
      }
    } catch (err) {
      console.error('Supabase Sync Error:', err);
    } finally {
      setIsSyncingToSupabase(false);
    }
  };
  };
  // Helper: auto-detect tools (formulas, shapes, french accents) based on active subject
  const getSubjectToolConfig = (subjectName) => {
    const sub = (subjectName || '').toLowerCase();
    if (sub.includes('math')) return { category: 'math', showCanvas: true, showAccents: false };
    if (sub.includes('phys') || sub.includes('elect')) return { category: 'physics', showCanvas: true, showAccents: false };
    if (sub.includes('chem')) return { category: 'chemistry', showCanvas: true, showAccents: false };
    if (sub.includes('mech') || sub.includes('build') || sub.includes('draw')) return { category: 'mechanical', showCanvas: true, showAccents: false };
    if (sub.includes('french') || sub.includes('français')) return { category: 'none', showCanvas: false, showAccents: true };
    return { category: 'math', showCanvas: true, showAccents: true };
  };
  // Save document directly to phone/device local document list
  const saveDocumentToDevice = () => {
    if (!docTitle.trim()) {
      alert('Please enter a document title before saving.');
      return;
    }
    const newDoc = {
      id: 'doc_' + Date.now(),
      title: docTitle,
      content: docContent,
      type: selectedDocType,
      shapes: canvasShapes,
      savedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
    };

    const existingDocs = JSON.parse(localStorage.getItem('nsuhrecords_saved_docs') || '[]');
    const updatedDocs = [newDoc, ...existingDocs.filter(d => d.id !== newDoc.id)];
    
    localStorage.setItem('nsuhrecords_saved_docs', JSON.stringify(updatedDocs));
    setNotesAndTests(updatedDocs);
    setLastSavedTime('Saved to phone at ' + new Date().toLocaleTimeString());
  };

  // Open a saved offline document into the editor
  const openLocalDocument = (doc) => {
    setDocTitle(doc.title || '');
    setDocContent(doc.content || '');
    setSelectedDocType(doc.type || 'note');
    setCanvasShapes(doc.shapes || []);
  };
  // Export document as Microsoft Word compatible file (.doc)
  const exportToWord = () => {
    if (!docTitle.trim() && !docContent.trim()) {
      alert('Document is empty. Please add a title or content before exporting.');
      return;
    }

    const fileName = (docTitle || 'Lesson_Note').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.doc';
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docTitle || 'Lesson Note'}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', sans-serif; margin: 1in; font-size: 12pt; line-height: 1.5; color: #1a1a1a; }
          h1 { color: #1b4332; border-bottom: 2px solid #1b4332; padding-bottom: 5px; font-size: 18pt; }
          .meta-info { font-style: italic; color: #555; margin-bottom: 20px; }
          .shape-box { border: 1px dashed #666; padding: 10px; margin: 15px 0; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${docTitle || 'Untitled Document'}</h1>
        <div class="meta-info">
          <p><strong>Type:</strong> ${selectedDocType === 'note' ? 'Lesson Note' : 'Test Paper / Exam'}</p>
          <p><strong>Subject:</strong> ${selectedSubjectForAction || 'General'} | <strong>Class:</strong> ${selectedClassForAction || 'N/A'}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <hr/>
        <div class="content">
          ${docContent.replace(/\n/g, '<br/>')}
        </div>
        ${canvasShapes.length > 0 ? `
          <div class="shape-box">
            <h3>Diagrams & Shape Labels Included (${canvasShapes.length})</h3>
            <ul>
              ${canvasShapes.map(s => `<li><strong>${s.type.toUpperCase()}:</strong> ${s.label || 'No label'} (Position: X:${s.x}, Y:${s.y})</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as Plain Text File (.txt)
  const exportToText = () => {
    const fileName = (docTitle || 'Document').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt';
    const textContent = `TITLE: ${docTitle}\nTYPE: ${selectedDocType}\nSUBJECT: ${selectedSubjectForAction}\nDATE: ${new Date().toLocaleDateString()}\n\n${docContent}`;
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Trigger Native Print / PDF Save Dialog
  const triggerPrintPDF = () => {
    window.print();
  };
useEffect(() => {
  if (!selectedSubjectForAction || !teacherProfile?.schedules) {
    setSelectedClassForAction('');
    return;
  }
  
  const slots = teacherProfile.schedules[selectedSubjectForAction] || [];
  if (Array.isArray(slots) && slots.length > 0) {
    const uniqueClasses = [...new Set(slots.map((s) => s.className).filter(Boolean))];
    if (uniqueClasses.length > 0) {
      setSelectedClassForAction(uniqueClasses[0]);
    } else {
      setSelectedClassForAction('');
    }
  } else {
    setSelectedClassForAction('');
  }
}, [selectedSubjectForAction, teacherProfile?.schedules]);
 // 1. Define fetchClassLogs at the component level
  const fetchClassLogs = async () => {
    if (!selectedClassLog || !teacherProfile?.school_id) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('lesson_logs')
        .select('*')
        .eq('school_id', teacherProfile.school_id)
        .eq('classLevel', selectedClassLog.className)
        .eq('subject', selectedClassLog.subject)
        .order('logged_at', { ascending: false });

      if (error) throw error;
      setLogsList(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      toast.error('Failed to load lesson logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchClassLogs();
  }, [selectedClassLog, teacherProfile?.school_id]);

  const handleSaveLessonLog = async () => {
  setIsSavingLog(true);
  try {
    const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
    if (!activeSchoolId || !selectedClassLog) return;

    let error;

    if (editingLogId) {
      // Update existing record in place
      const res = await supabase
        .from('lesson_logs')
        .update({ lesson_content: lessonText })
        .eq('id', editingLogId);
      error = res.error;
    } else {
      // Insert new record
      const res = await supabase
        .from('lesson_logs')
        .insert([
          {
            school_id: activeSchoolId,
            teacher_id: teacherProfile?.id || teacherProfile?.teacher_id || null,
            teacher_name: teacherProfile?.name || teacherProfile?.full_name || '',
            subject: selectedClassLog.subject,
            classLevel: selectedClassLog.className,
            lesson_content: lessonText,
            status: 'SUBMITTED',
            logged_at: new Date().toISOString(),
            academic_year: typeof getCurrentAcademicYear === 'function' ? getCurrentAcademicYear() : null,
            trades_series: selectedClassLog.trades_series || selectedClassLog.tradeSeries || null
          }
        ]);
      error = res.error;
    }

    if (error) throw error;

    toast.success('Lesson log saved successfully!');
    setLessonText('');
    setEditingLogId(null); 
    fetchClassLogs();
  } catch (err) {
    console.error('Error saving lesson log:', err);
    toast.error('Failed to save log.');
  } finally {
    setIsSavingLog(false);
  }
};
useEffect(() => {
    const fetchTeacherAndSchool = async () => {
      const savedSchoolId = localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
      const teacherId = localStorage.getItem('active_teacher_id') || localStorage.getItem('teacher_id');

      if (savedSchoolId && teacherId) {
        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('school_id', savedSchoolId)
          .maybeSingle();

        if (teacherData && !error) {
          setTeacherProfile(teacherData);
          setIsMarkEntryAuthorized(!teacherData.is_marks_locked);
        }
      }

     const currentSchoolId = savedSchoolId || teacherProfile?.school_id;
if (currentSchoolId) {
  const { data: schoolData } = await supabase
    .from('school_details')
    .select('*')
    .eq('school_id', currentSchoolId)
    .maybeSingle();

  if (schoolData) {
    setSchoolDetails(schoolData);
  }
}
    };

    fetchTeacherAndSchool();
  }, [teacherProfile?.school_id]);
  // Attendance & Marks State
  
  // Attendance & Marks State
  // Clean student list initialized for the assigned class with zero/empty initial marks
  const [classStudents, setClassStudents] = useState([]);

  // Attendance records map: studentId -> status
  const [attendanceRecords, setAttendanceRecords] = useState({});
  // Marks records map initialized to zero/empty for a fresh assignment
  const [marksRecords, setMarksRecords] = useState({});
  
  // Admin integration state: tracks submission status so Master Admin can view completion status
  const [submissionStatus, setSubmissionStatus] = useState({
    attendanceSubmitted: false,
    marksSubmitted: false,
    lastUpdated: null
  });
// Auto-set initial assigned Class and Subject from teacher profile
  useEffect(() => {
    if (teacherProfile?.classes && teacherProfile.classes.length > 0) {
      if (!selectedClassForAction) {
        setSelectedClassForAction(teacherProfile.classes[0]);
      }
    }
    if (teacherProfile?.subjects && teacherProfile.subjects.length > 0) {
      if (!selectedSubjectForAction) {
        // Sort subjects alphabetically for smooth selection
        const sortedSubjects = [...teacherProfile.subjects].sort((a, b) => a.localeCompare(b));
        setSelectedSubjectForAction(sortedSubjects[0]);
      }
    }
  }, [teacherProfile]);
  const getActiveSeqKeys = (term) => {
  if (term === 'Term 2') return { key1: 'seq3_mark', key2: 'seq4_mark', label1: 'SEQ 3', label2: 'SEQ 4' };
  if (term === 'Term 3') return { key1: 'seq5_mark', key2: 'seq6_mark', label1: 'SEQ 5', label2: 'SEQ 6' };
  return { key1: 'seq1_mark', key2: 'seq2_mark', label1: 'SEQ 1', label2: 'SEQ 2' };
};

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const savedSchoolId = localStorage.getItem('active_school_id') || localStorage.getItem('activeSchoolId');
    if (savedSchoolId) {
      setTeacherProfile(prev => ({ ...prev, school_id: savedSchoolId }));
    }

    // Dynamic Online Quotes API with Fallback
    fetch('https://api.quotable.io/random?tags=education|wisdom|success|learning')
      .then(res => res.json())
      .then(data => {
        if (data?.content) {
          setCurrentQuote(`"${data.content}" — ${data.author || 'Unknown'}`);
        }
      })
      .catch(() => {
        const randomFallback = quotesList[Math.floor(Math.random() * quotesList.length)];
        setCurrentQuote(randomFallback);
      });

    return () => clearInterval(timer);
  }, []);

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

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkChange = (studentId, field, rawValue) => {
    const numValue = parseFloat(rawValue);
    const clampedValue = isNaN(numValue) ? '' : Math.max(0, Math.min(20, numValue));

    setMarksRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: clampedValue
      }
    }));
  };
  // Trigger precise student fetch whenever teacher selectors change, matching master mark sheet logic
useEffect(() => {
    const fetchClassStudents = async () => {
      const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
      
      if (!activeSchoolId || !selectedClassForAction) {
        setClassStudents([]);
        return;
      }

      const cacheKey = `nsuh_students_${activeSchoolId}_${selectedClassForAction.trim()}_${selectedTrade}`;
      
      // 1. Instantly load from local device storage first (Instant UI response without waiting for network)
      const cachedStudents = localStorage.getItem(cacheKey);
      if (cachedStudents) {
        try {
          setClassStudents(JSON.parse(cachedStudents));
        } catch (e) {
          console.warn('Failed to parse cached students:', e);
        }
      }

      setIsLoadingStudents(true);

      try {
        let studentQuery = supabase
          .from('students')
          .select('*')
          .eq('school_id', activeSchoolId)
          .eq('classLevel', selectedClassForAction.trim());

        if (selectedTrade && selectedTrade !== 'ALL' && selectedTrade !== 'N/A') {
          studentQuery = studentQuery.eq('trades_series', selectedTrade);
        }

        const { data, error } = await studentQuery.order('fullName', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setClassStudents(data);
          // Save fresh network data back to local storage for offline use
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Network issue detected, using cached student list:', err.message || err);
        // If network fails (Failed to fetch), keep the local cached data intact!
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchClassStudents();
  }, [selectedClassForAction, selectedTrade, selectedSubjectForAction, teacherProfile?.school_id]);

 
// Simple, rock-solid data fetcher that never gets stuck on class switch
  useEffect(() => {
    let isCancelled = false;

    const fetchDashboardData = async () => {
      const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;

      if (!activeSchoolId || !selectedClassForAction || !selectedSubjectForAction || !selectedTerm) {
        setClassStudents([]);
        setMarksRecords({});
        return;
      }

      setIsLoadingStudents(true);

      try {
        const cleanClass = selectedClassForAction.trim();
        const lowerClass = cleanClass.toLowerCase();
        const isSixthFormOrTech = lowerClass.includes('sixth') || lowerClass.includes('l6') || lowerClass.includes('u6') || lowerClass.includes('tech') || lowerClass.includes('form 6');

        // 1. Fetch Students
        let studentQuery = supabase
          .from('students')
          .select('*')
          .eq('school_id', activeSchoolId)
          .eq('classLevel', cleanClass);

        // ONLY filter by trade/series if it's a Sixth Form / Specialized class
        if (isSixthFormOrTech && selectedTrade && selectedTrade !== 'ALL' && selectedTrade !== 'N/A') {
          studentQuery = studentQuery.eq('trades_series', selectedTrade);
        }

        const { data: students, error: studErr } = await studentQuery.order('fullName', { ascending: true });
        if (studErr) throw studErr;

        if (isCancelled) return;
        const fetchedStudents = students || [];
        setClassStudents(fetchedStudents);

        // 2. Fetch Marks for those students
        const studentIds = fetchedStudents.map(s => s.id);
        if (studentIds.length === 0) {
          setMarksRecords({});
          return;
        }

        const normalizedTerm = selectedTerm.split(' ')[0] + ' ' + selectedTerm.split(' ')[1];

        const { data: marks, error: markErr } = await supabase
          .from('marks')
          .select('*')
          .eq('school_id', activeSchoolId)
          .eq('academic_year', getCurrentAcademicYear())
          .ilike('term', `${normalizedTerm.trim()}%`)
          .in('student_id', studentIds);

        if (markErr) console.warn("Notice loading marks:", markErr.message);

        if (isCancelled) return;

        const loadedMarks = {};
        (marks || []).forEach(item => {
          if (!selectedSubjectForAction || item.subject_name?.trim().toLowerCase() === selectedSubjectForAction.trim().toLowerCase()) {
            loadedMarks[item.student_id] = {
              seq1_mark: item.seq1_mark ?? '',
              seq2_mark: item.seq2_mark ?? '',
              seq3_mark: item.seq3_mark ?? '',
              seq4_mark: item.seq4_mark ?? '',
              seq5_mark: item.seq5_mark ?? '',
              seq6_mark: item.seq6_mark ?? ''
            };
          }
        });

        setMarksRecords(loadedMarks);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (!isCancelled) setIsLoadingStudents(false);
      }
    };

    fetchDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [selectedClassForAction, selectedSubjectForAction, selectedTerm, selectedTrade, teacherProfile]);

if (!isMounted) {
    return null;
  }

// Helper to get sequence labels based on selected term
  const getSequenceLabels = (term) => {
    switch (term) {
      case 'Term 2':
        return { seq1Label: '3rd Sequence', seq2Label: '4th Sequence' };
      case 'Term 3':
        return { seq1Label: '5th Sequence', seq2Label: '6th Sequence' };
      default:
        return { seq1Label: '1st Sequence', seq2Label: '2nd Sequence' };
    }
  };
  const submitAttendance = async () => {
    const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
    const teacherId = localStorage.getItem('teacher_id') || teacherProfile?.id;

    if (!activeSchoolId || !selectedClassForAction) {
      toast.error('Missing school or class context');
      return;
    }

    if (classStudents.length === 0) {
      toast.error('No students found for this class');
      return;
    }

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    const currentDayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const recordsToInsert = classStudents.map((student) => ({
      school_id: activeSchoolId,
      teacher_id: teacherId,
      student_id: student.id,
      class_name: selectedClassForAction,
      subject: selectedSubjectForAction,
      status: attendanceRecords[student.id] || 'Present',
      date: currentDateStr,
      day_of_week: currentDayStr,
      time_recorded: currentTimeStr
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(recordsToInsert, { onConflict: 'school_id,student_id,date,subject' });

    if (!error) {
      toast.success(`Attendance submitted for ${currentDayStr}, ${currentDateStr}!`);
      setSubmissionStatus((prev) => ({
        ...prev,
        attendanceSubmitted: true,
        lastUpdated: `${currentDayStr} at ${currentTimeStr}`
      }));
    } else {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to submit attendance');
    }
  };
 const submitMarks = async () => {
  console.log("Submit marks clicked!");
  const activeSchoolId = localStorage.getItem('active_school_id') || teacherProfile?.school_id;
  const teacherId = localStorage.getItem('teacher_id') || teacherProfile?.id;

  if (!activeSchoolId) {
    toast.error('Active school ID is missing');
    return;
  }

  if (!selectedClassForAction || !selectedSubjectForAction) {
    toast.error('Please select a class and subject first');
    return;
  }

  const now = new Date();
  const currentDayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTimestr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const resolvedSubjectName = selectedSubjectForAction;

  const uniqueStudents = Array.from(
    new Map((classStudents || []).map((s) => [s.id, s])).values()
  );

  const recordsToInsert = uniqueStudents.map((student) => {
    const studentEntry = marksRecords[student.id] || {};
    
    const s1 = studentEntry.seq1_mark !== '' && studentEntry.seq1_mark !== undefined ? parseFloat(studentEntry.seq1_mark) : null;
    const s2 = studentEntry.seq2_mark !== '' && studentEntry.seq2_mark !== undefined ? parseFloat(studentEntry.seq2_mark) : null;
    const s3 = studentEntry.seq3_mark !== '' && studentEntry.seq3_mark !== undefined ? parseFloat(studentEntry.seq3_mark) : null;
    const s4 = studentEntry.seq4_mark !== '' && studentEntry.seq4_mark !== undefined ? parseFloat(studentEntry.seq4_mark) : null;
    const s5 = studentEntry.seq5_mark !== '' && studentEntry.seq5_mark !== undefined ? parseFloat(studentEntry.seq5_mark) : null;
    const s6 = studentEntry.seq6_mark !== '' && studentEntry.seq6_mark !== undefined ? parseFloat(studentEntry.seq6_mark) : null;

    const record = {
      school_id: activeSchoolId,
      teacher_id: teacherId,
      student_id: student.id,
      unique_code: student.unique_code || student.matricule || null,
      classLevel: selectedClassForAction,
      section: student.section || null,
      subject_name: resolvedSubjectName,
      term: selectedTerm,
      academic_year: getCurrentAcademicYear(),
    };

    if (s1 !== null) record.seq1_mark = s1;
    if (s2 !== null) record.seq2_mark = s2;
    if (s3 !== null) record.seq3_mark = s3;
    if (s4 !== null) record.seq4_mark = s4;
    if (s5 !== null) record.seq5_mark = s5;
    if (s6 !== null) record.seq6_mark = s6;

    return record;
  });

  console.log("Sending upsert request to Supabase with records:", recordsToInsert);

  const response = await supabase
    .from('marks')
    .upsert(recordsToInsert, { onConflict: 'school_id,student_id,subject_name,term,academic_year' });

  console.log("Supabase raw response received:", response);

  const { error } = response;

  if (!error) {
    console.log("Marks saved successfully!");
    const successMsg = `Marks successfully submitted for ${selectedClassForAction} - ${selectedSubjectForAction} (${selectedTerm}). Report cards will reflect these values. Please check the marks carefully for any mistakes.`;
    
    setSuccessBanner(successMsg);
    
    toast.success('Marks saved successfully!');
    setSubmissionStatus((prev) => ({
      ...prev,
      marksSubmitted: true,
      lastUpdated: `${currentDayStr} at ${currentTimestr}`
    }));
  }
};

  const downloadTimetable = () => {
    toast.success('Timetable downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans">
    <header className="bg-[#111827] border-b border-gray-800 px-6 py-4 shadow-lg">
  <div className="flex items-center justify-between gap-4 w-full">
    
    {/* Left: Back button, Logo & Left-aligned Welcome info */}
    <div className="flex items-center gap-3.5 shrink-0">
      {navigationHistory.length > 1 && (
        <button
          onClick={handleGoBack}
          className="bg-gray-800 hover:bg-gray-700 text-amber-100 border border-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          ← Back
        </button>
      )}

      {/* School Logo */}
      <div className="w-10 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
        {schoolDetails?.logo_url ? (
          <img src={schoolDetails.logo_url} alt="School Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-amber-100">LOGO</span>
        )}
      </div>

      {/* Left-Aligned Teacher Greeting */}
      <div className="hidden sm:block text-left border-l border-gray-700 pl-3">
        <p className="text-[11px] text-slate-400">
          Welcome, <strong className="text-white">{teacherProfile?.name || teacherProfile?.full_name || 'Teacher'}</strong>
        </p>
        <p className="text-[10px] text-amber-100/80 font-mono">
          {currentAcademicYear ? `AY: ${currentAcademicYear}` : 'Active Portal'}
        </p>
      </div>
    </div>

    {/* Center: School Title (Standard International Header Focus) */}
    <div className="flex-1 text-center px-2">
      <h1 className="text-sm sm:text-base font-bold text-amber-100 tracking-tight leading-tight truncate">
        {schoolDetails?.name || schoolName || teacherProfile?.school_name || 'Assigned School'}
      </h1>
      <p className="text-[10px] text-slate-400 sm:hidden">
        Welcome, {teacherProfile?.name || teacherProfile?.full_name || 'Teacher'}
      </p>
    </div>

    {/* Right: Active Session & Status Badge */}
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
        teacherProfile?.isAuthorized !== false 
          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50' 
          : 'bg-rose-950/60 text-rose-400 border-rose-700/50'
      }`}>
        {teacherProfile?.isAuthorized !== false ? 'Active Session' : 'Restricted'}
      </span>
      <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap hidden md:inline">
        {submissionStatus?.marksSubmitted ? 'Uploaded' : 'Pending Entry'}
      </span>
    </div>

  </div>
</header>

      {/* Motivational Quote Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-blue-900/30 to-[#111827] border-b border-gray-800 px-6 py-3 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-xs italic text-amber-200/90 font-serif">
          &ldquo;{currentQuote.quote}&rdquo; — <span className="font-semibold text-white">{currentQuote.author}</span>
        </p>
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">NsuhRecords Daily Inspiration</span>
      </div>

      <nav className="bg-[#111827]/60 border-b border-gray-800 px-6 flex space-x-6 overflow-x-auto">
      {[
          { id: 'overview', label: 'My Overview & Timetable' },
          { id: 'attendance', label: 'Mark Attendance' },
          { id: 'grades', label: 'Fill Student Marks' },
          { id: 'progression', label: 'Lesson Logs & Progression' },
          { id: 'notes_tests', label: 'Lesson Notes & Test Bank' },
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

      <main className="p-6 max-w-7xl mx-auto space-y-8">
      
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Teacher Credentials & ID Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {teacherProfile?.photo ? (
                <img src={teacherProfile.photo} alt="Teacher Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-amber-400">
                  {teacherProfile?.full_name?.charAt(0) || 'T'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{teacherProfile?.name || 'Teacher Profile'}</h2>
              <p className="text-xs text-slate-400">{teacherProfile?.email || 'No email provided'}</p>
              <p className="text-xs text-slate-400">{teacherProfile?.contact || 'No phone provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-700 w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Teacher ID</span>
              <span className="text-xs font-mono font-bold text-amber-400">{teacherProfile?.teacher_id || 'ID Pending'}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(teacherProfile?.teacher_id || '')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded transition-colors"
            >
              Copy ID
            </button>
          </div>
        </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Subjects Assigned</h3>
                <p className="text-2xl font-black mt-2 text-amber-400">{teacherProfile.subjects.length}</p>
               <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-1">
  {teacherProfile.subjects && teacherProfile.subjects.length > 0 ? (
    teacherProfile.subjects.map((sub, i) => (
      <span key={i} className="bg-amber-900/40 text-amber-300 px-3 py-1 rounded text-xs border border-amber-700/50">
        {sub}
      </span>
    ))
  ) : (
    <p className="text-xs text-gray-400 italic">No subjects assigned yet by administrator.</p>
  )}
</div>
              </div>
              
              <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Section</h3>
                <p className="text-2xl font-black mt-2 text-white">{teacherProfile.section}</p>
              </div>
            </div>

            {/* My Personal Timetable */}
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  My Class Schedule & Timetable
                </h3>
                <button 
                  onClick={downloadTimetable}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow transition-colors"
                >
                  Download Timetable
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-amber-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">Subject</th>
                      <th className="p-3 border border-gray-700">Class Form</th>
                      <th className="p-3 border border-gray-700">Day</th>
                      <th className="p-3 border border-gray-700">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {teacherProfile.schedules && Object.keys(teacherProfile.schedules).length > 0 ? (
  Object.entries(teacherProfile.schedules).map(([sub, rows]) =>
    rows.map((row, rIdx) => (
      <tr key={`${sub}-${rIdx}`} className="hover:bg-gray-800/40">
        <td className="p-3 border border-gray-700 font-bold text-white">{sub}</td>
        <td className="p-3 border border-gray-700 text-amber-300 font-semibold">{row.className}</td>
        <td className="p-3 border border-gray-700">{row.day}</td>
        <td className="p-3 border border-gray-700 font-mono text-emerald-400">{row.startTime} - {row.endTime}</td>
      </tr>
    ))
  )
) : (
  <tr>
    <td colSpan="4" className="p-6 text-center text-gray-500 italic">
      No class schedule assigned yet by administrator for this school ID.
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* LESSON NOTES & TEST BANK TAB */}
      {activeTab === 'notes_tests' && (
        <div className="space-y-6">
          {/* Action Toolbar: Local Device Save, Supabase Sync, and Exports */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-emerald-900 text-white shadow-md">
            <div className="flex items-center gap-2">
              <button
                onClick={saveDocumentToDevice}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
              >
                💾 Save to Phone
              </button>
              <button
                onClick={syncDraftToSupabase}
                disabled={isSyncingToSupabase}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSyncingToSupabase ? 'Syncing...' : '☁️ Sync to Cloud'}
              </button>
              {lastSavedTime && (
                <span className="text-[11px] text-emerald-200 font-mono italic ml-2">
                  {lastSavedTime}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToWord}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-600 transition-colors shadow-sm"
              >
                📄 Export .DOC
              </button>
              <button
                onClick={exportToText}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-700 hover:bg-slate-600 transition-colors shadow-sm"
              >
                📝 Export .TXT
              </button>
              <button
                onClick={triggerPrintPDF}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm"
              >
                🖨️ Print / PDF
              </button>
            </div>
          </div>
          {/* Document Header & Subject Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Type</label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs rounded-lg p-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="note">📚 Lesson Note / Coverage Plan</option>
                <option value="test">📝 Test / Exam / Quiz Paper</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
              <select
                value={selectedSubjectForAction}
                onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs rounded-lg p-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {teacherProfile?.subjects?.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Class</label>
              <select
                value={selectedClassForAction}
                onChange={(e) => setSelectedClassForAction(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs rounded-lg p-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {assignedClassesForSubject?.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title / Topic</label>
              <input
                type="text"
                placeholder="e.g. Chapter 3: Quadratic Equations & Applications..."
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full bg-slate-800 text-white text-sm rounded-lg p-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          {/* Dynamic Subject Quick-Insert Tools (STEM Formulas & Accents) */}
          {selectedSubjectForAction && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  ⚡ {selectedSubjectForAction} Quick Tools
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  Click any item to insert directly into document content
                </span>
              </div>

              {/* STEM Math & Physics Formulas */}
              {['math', 'physics', 'chemistry', 'mechanical'].includes(getSubjectToolConfig(selectedSubjectForAction).category) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(getSubjectToolConfig(selectedSubjectForAction).category === 'math' ? [
                    '√x', 'x²', 'xⁿ', '∫', '∑', 'π', 'θ', '±', '≠', '≤', '≥', '∞', 'f(x)', 'lim'
                  ] : getSubjectToolConfig(selectedSubjectForAction).category === 'physics' ? [
                    'F = ma', 'V = IR', 'E = mc²', 'v = u + at', 's = ut + ½at²', 'P = VI', 'λ', 'Ω', 'μ', 'ρ'
                  ] : [
                    'H₂O', 'CO₂', 'H₂SO₄', 'NaCl', 'O₂', 'N₂', 'pH', 'mol/L', 'ΔH', '⇌'
                  ]).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDocContent(prev => prev + ' ' + item)}
                      className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-slate-800 text-amber-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}

              {/* French Special Character Accents */}
              {getSubjectToolConfig(selectedSubjectForAction).showAccents && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                  {['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'î', 'ï', 'ô', 'ç', 'œ', '«', '»'].map((char, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDocContent(prev => prev + char)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-emerald-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Main A4 Document Text Editor Area */}
          <div className="p-4 sm:p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                ✍️ Document Editor Canvas
              </span>
              <button
                type="button"
                onClick={() => setShowCanvas(!showCanvas)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-700 hover:bg-indigo-600 text-white transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                🎨 {showCanvas ? 'Hide Canvas' : 'Attach Diagram'}
              </button>
            </div>

            <textarea
              rows={12}
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Type lesson note body, questions, exam instructions, or pasted text here..."
              className="w-full p-3 sm:p-4 text-xs sm:text-sm font-sans bg-slate-950 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed resize-y min-h-[250px] sm:min-h-[350px]"
            />
          </div>
          {/* Interactive Diagram Canvas Component */}
          {showCanvas && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  🎨 Interactive Diagram / Canvas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-2.5 py-1 text-xs rounded bg-red-900/40 text-red-300 hover:bg-red-800/60 border border-red-800/50 transition-colors"
                  >
                    🗑️ Clear Canvas
                  </button>
                  <button
                    type="button"
                    onClick={saveCanvasDrawing}
                    className="px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-colors"
                  >
                    💾 Attach Drawing
                  </button>
                </div>
              </div>

              <div className="border border-slate-700 rounded-lg bg-white overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={250}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[200px] sm:h-[250px] cursor-crosshair block"
                />
              </div>
            </div>
          )}

          {/* Local Saved Documents History */}
          {savedLocalDocs.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                📁 Saved Local Drafts on Device ({savedLocalDocs.length})
              </h4>
              <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {savedLocalDocs.map((doc) => (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <p className="font-semibold text-amber-400 truncate">{doc.title || 'Untitled Document'}</p>
                      <p className="text-[10px] text-slate-400">
                        {doc.subject} • {doc.className} • {doc.type === 'note' ? 'Lesson Note' : 'Test/Exam'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadLocalDocument(doc)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors whitespace-nowrap active:scale-95"
                    >
                      📖 Open Draft
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

{/* LESSON LOGS & PROGRESSION TAB */}
      {activeTab === 'progression' && (
        <div className="space-y-6">
          {/* Targeted 3-Hour Mobile Reminder Notice */}
          <div className="bg-[#2D5A27]/20 border-2 border-[#2D5A27] p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Active Timetable Reminder System Enabled
                </h4>
                <p className="text-xs text-gray-200 mt-0.5">
                  Reminders trigger every 3 hours post-lesson for <strong className="text-white">{teacherProfile?.name || 'Teacher'}</strong>. 
                  Unfilled slots lock permanently as <span className="text-red-400 font-bold uppercase">Absent</span> after 24 hours.
                </p>
              </div>
            </div>
          </div>
          {/* Header Card */}
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📄</span> Lesson Logs & Progression
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Record daily covered topics. Missed slots lock after 24 hours and are marked ABSENT.
              </p>
            </div>
          </div>

          {/* Active Class & Subject Selection Bar */}
      <div className="bg-[#1f2937] border border-gray-700 p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Select Class & Subject Sheet</h3>
        <div className="flex flex-wrap gap-2">
          {teacherProfile?.schedules && Object.keys(teacherProfile.schedules).length > 0 ? (
            Object.entries(teacherProfile.schedules).map(([sub, rows]) => {
              // Deduplicate classes so each subject/class combination appears as a single button
              const uniqueClassRows = Array.from(
                new Map(rows.map((item) => [item.className, item])).values()
              );

              return uniqueClassRows.map((row, rIdx) => {
                const isSelected = selectedClassLog?.className === row.className && selectedClassLog?.subject === sub;
                return (
                  <button
                    key={`${sub}-${row.className}-${rIdx}`}
                    onClick={() => setSelectedClassLog({ className: row.className, subject: sub, schedule: row })}
                    className={`text-xs font-bold px-3 py-2 rounded-lg transition-all border shadow-sm flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 scale-105 ring-2 ring-amber-300'
                        : 'bg-[#2D5A27] hover:bg-[#1E3E1A] text-white border-emerald-600'
                    }`}
                  >
                    <span>{row.className}</span>
                    <span className={isSelected ? 'text-black/80 font-extrabold' : 'text-emerald-200'}>({sub})</span>
                  </button>
                );
              });
            })
          ) : (
            <p className="text-xs text-gray-400 italic">No assigned classes found to generate log sheets.</p>
          )}
        </div>
      </div>

          {/* Continuous Progression Sheet Feed Placeholder */}
          {/* Continuous Progression Sheet Feed Container */}
          <div className="bg-[#FDFBF7] border-2 border-[#2D5A27] rounded-xl p-5 text-gray-900 shadow-xl space-y-6">
            
            {selectedClassLog ? (
              <>
                {/* Active Class Title Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#2D5A27] pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-black text-[#2D5A27] uppercase tracking-wide">
                      {selectedClassLog.className} — {selectedClassLog.subject}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Scheduled Slot: <span className="font-bold text-[#2D5A27]">{selectedClassLog.schedule?.day || 'Today'} ({selectedClassLog.schedule?.startTime} - {selectedClassLog.schedule?.endTime})</span>
                    </p>
                  </div>
                  <span className="bg-[#2D5A27] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start md:self-auto">
                    Active Logging Period
                  </span>
                </div>

                {/* Daily Topic Entry Form */}
              <div className="bg-white border border-emerald-800/30 p-4 rounded-lg shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-[#2D5A27] uppercase tracking-wider">
                    Today's Lesson Taught & Remarks
                  </label>
                 <textarea
  rows={4}
  value={lessonText}
  onChange={(e) => setLessonText(e.target.value)}
  onPaste={(e) => {
    // Intercept image pastes (Ctrl+V)
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const previewUrl = URL.createObjectURL(file);
          if (typeof setAttachedImages === 'function') {
            setAttachedImages((prev) => [...prev, { file, previewUrl }]);
          }
        }
      }
    }
  }}
  placeholder="Enter chapter title, copy/paste paragraphs, STEM formulas ($E=mc^2$), or press Ctrl+V to paste a whiteboard picture..."
  className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D5A27] font-mono leading-relaxed resize-y min-h-[120px]"
  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
/>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveLessonLog}
                      disabled={isSavingLog}
                      className="bg-[#2D5A27] hover:bg-[#1E3E1A] text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <span>💾</span> {isSavingLog ? 'Saving...' : 'Save Lesson Entry'}
                    </button>
                  </div>
                </div>

               {/* Continuous Historical Log Flow */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300 pb-1">
                Continuous Progression Record History
              </h4>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white text-xs">
                {/* Table Header (12-Column Grid Alignment) */}
                <div className="grid grid-cols-12 bg-[#1E3E1A] text-white font-bold p-2.5 text-center text-xs">
                  <span className="col-span-2">Date & Time</span>
                  <span className="col-span-5">Lesson Content Covered</span>
                  <span className="col-span-3">Supervisor Remarks</span>
                  <span className="col-span-2">Status / Action</span>
                </div>

                {isLoadingLogs ? (
                  <div className="p-4 text-center text-gray-500 italic">Loading progression history...</div>
                ) : logsList && logsList.length > 0 ? (
                  logsList.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="grid grid-cols-12 p-2.5 border-b border-gray-200 items-center hover:bg-emerald-50/40 transition-colors text-xs"
                    >
                      {/* Date & Time (col-span-2) */}
                      <span className="col-span-2 text-center text-[11px] font-semibold text-gray-600">
                        {new Date(log.logged_at || log.created_at || Date.now()).toLocaleDateString()}<br />
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.logged_at || log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>

                      {/* Lesson Content Covered (col-span-5) - Preserves line breaks, STEM formulas & long text */}
                      <span className="col-span-5 px-2 font-medium whitespace-pre-wrap leading-relaxed text-gray-800">
                        {log.lesson_content}
                      </span>

                      {/* Supervisor Remarks from Supabase (col-span-3) */}
                      <span className="col-span-3 px-2 text-[11px]">
                        {log.supervisor_remark ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 text-emerald-900 font-medium">
                            <span className="font-bold text-[10px] text-emerald-700 block uppercase">💬 Remark:</span>
                            "{log.supervisor_remark}"
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">No remark yet</span>
                        )}
                      </span>

    {/* Status Badge & Compact Teacher Edit Button (col-span-2) */}
<div className="col-span-2 text-center flex flex-col items-center justify-center gap-1">
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
    log.status === 'ABSENT'
      ? 'bg-rose-100 text-rose-700 border border-rose-300'
      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
  }`}>
    {log.status || 'SUBMITTED'}
  </span>

  {checkIsLogLocked(log.created_at || log.logged_at) ? (
    <span className="text-[9px] text-gray-400 font-semibold flex items-center gap-0.5">
      🔒 Locked
    </span>
  ) : (
    <button
      type="button"
     onClick={() => {
  setLessonText(log.lesson_content || log.lesson_covered || log.content || '');
  setEditingLogId(log.id); // Track which log is being updated
  window.scrollTo({ top: 0, behavior: 'smooth' });
}}
      className="text-[9px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded transition-all shadow-sm"
    >
      ✏️ Edit
    </button>
  )}
</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 italic">
                    No prior logs submitted for this class yet. Entries logged above will flow here continuously.
                  </div>
                )}
              </div>
            </div>
              </>
            ) : (
              <div className="py-8 text-center space-y-2">
                <span className="text-3xl">👈</span>
                <p className="text-xs font-bold text-[#2D5A27] uppercase tracking-wider">
                  Select a Class & Subject Sheet Above
                </p>
                <p className="text-xs text-gray-600">
                  Click any green class badge at the top to open its active daily log form and past progression history.
                </p>
              </div>
            )}

          </div>

        </div>
      )}
        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-slate-800/90 border border-slate-700 p-8 rounded-xl max-w-4xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Class Attendance — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Select Subject</label>
                <select 
                  value={selectedSubjectForAction}
                  onChange={(e) => setSelectedSubjectForAction(e.target.value)}
                  className="w-full bg-[#1f2937] bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-amber-300 font-bold"
                >
                  {teacherProfile.subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Select Class / Form</label>
                <select 
                  value={selectedClassForAction}
                  onChange={(e) => setSelectedClassForAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
                >
                 {assignedClassesForSubject && assignedClassesForSubject.length > 0 ? (
  assignedClassesForSubject.map((cls, i) => (
    <option key={i} value={cls}>{cls}</option>
  ))
) : (
  <option value="">No Classes Assigned</option>
)}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-300">Student Roll Call for {selectedClassForAction}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300 border border-gray-700">
                  <thead className="bg-[#1f2937] text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border border-gray-700">ID</th>
                      <th className="p-3 border border-gray-700">Student Name</th>
                      <th className="p-3 border border-gray-700 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {classStudents.map((stu, index) => {
                      const currentStatus = attendanceRecords[stu.id] || 'Present';
                      return (
                        <tr key={stu.id} className="hover:bg-gray-800/40">
                          <td className="p-3 border border-gray-700 font-mono text-amber-400">{index + 1}</td>
                          <td className="p-3 border border-gray-700 font-semibold text-white">{stu.fullName}</td>
                          <td className="p-3 border border-gray-700 text-center">
                            <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
                              {['Present', 'Absent', 'Late'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleAttendanceChange(stu.id, st)}
                                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                                    currentStatus === st
                                      ? st === 'Present' ? 'bg-emerald-600 text-white' : st === 'Absent' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                      : 'bg-[#1f2937] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={submitAttendance}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg"
            >
              Submit Attendance Record
            </button>
          </div>
        )}

        {/* GRADES & MARKS TAB */}
        {activeTab === 'grades' && (
        <div className="bg-[#111827] rounded-xl border border-gray-800 p-4 sm:p-6 w-full max-w-full overflow-hidden shadow-lg space-y-6">
          
          {/* Header & Sync Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Fill Student Marks
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Marks entered are automatically sent to Student Report cards and School Administrators for checking.Make sure marks are properly filled.
              </p>
            </div>

            {/* Batch Info Badge */}
            <div className="flex items-center gap-2 bg-[#1f2937] px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-amber-300 font-medium">
              <span>{selectedSubjectForAction || 'No Subject Assigned'}</span>
              <span>•</span>
              <span>{selectedClassForAction || 'No Class Assigned'}</span>
            </div>
          </div>

         {/* Subject & Class Selectors */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  {/* 1. Term Selector */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      Select Term
    </label>
    <select
      value={selectedTerm}
      onChange={(e) => setSelectedTerm(e.target.value)}
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold focus:outline-none"
    >
      <option value="Term 1">Term 1 (Seq 1 & 2)</option>
      <option value="Term 2">Term 2 (Seq 3 & 4)</option>
      <option value="Term 3">Term 3 (Seq 5 & 6)</option>
    </select>
  </div>

  {/* 2. Subject Selector */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      Select Subject
    </label>
    <select
      value={selectedSubjectForAction}
      onChange={(e) => {
        setClassStudents([]);
         setSelectedSubjectForAction(e.target.value);
       }}
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold focus:outline-none"
    >
      {teacherProfile?.subjects && teacherProfile.subjects.length > 0 ? (
        teacherProfile.subjects.map((sub, i) => (
          <option key={i} value={sub}>{sub}</option>
        ))
      ) : (
        <option value="">No Subjects Assigned</option>
      )}
    </select>
  </div>

  {/* 3. Class / Form Selector */}
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      Select Class / Form
    </label>
    <select
      value={selectedClassForAction}
      onChange={(e) => {
       setClassStudents([]);
       setSelectedClassForAction(e.target.value);
        }}
      className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-sm text-amber-300 font-bold focus:outline-none"
    >
      {assignedClassesForSubject && assignedClassesForSubject.length > 0 ? (
        assignedClassesForSubject.map((cls, i) => (
          <option key={i} value={cls}>{cls}</option>
        ))
      ) : (
        <option value="">No Classes Assigned</option>
      )}
    </select>
  </div>

 {/* 4. Trade / Series Selector */}
<div>
  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
    Select Trade / Series
  </label>
  {(() => {
    const isLowerClass = Array.isArray(assignedTradesForClass) && assignedTradesForClass.length === 1 && assignedTradesForClass[0] === 'N/A';
    return (
      <select
        value={isLowerClass ? 'ALL' : selectedTrade}
        onChange={(e) => setSelectedTrade(e.target.value)}
        disabled={isLowerClass}
        className={`w-full border border-gray-700 rounded-lg p-3 text-sm font-bold focus:outline-none transition-all ${
          isLowerClass
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-800'
            : 'bg-[#1f2937] text-amber-300'
        }`}
      >
        {isLowerClass ? (
          <option value="ALL">N/A - General Stream</option>
        ) : (
          <>
            <option value="ALL">All Trades / Series</option>
            {Array.isArray(assignedTradesForClass) && assignedTradesForClass.map((t, idx) => {
              const codeVal = typeof t === 'string' ? t : t.code;
              const displayVal = typeof t === 'string' ? t : (t.name ? `${t.code} - ${t.name}` : t.code);
              return (
                <option key={idx} value={codeVal}>
                  {displayVal}
                </option>
              );
            })}
          </>
        )}
      </select>
    );
  })()}
</div>
</div>

          {/* Empty State: Unassigned Teacher */}
          {(!selectedClassForAction || !selectedSubjectForAction) ? (
            <div className="text-center py-10 px-4 bg-[#1a2234] rounded-lg border border-dashed border-gray-700">
              <p className="text-amber-400 text-sm font-semibold">No Active Class or Subject Assigned</p>
              <p className="text-gray-400 text-xs mt-1">
                Once the school administrator assigns your subjects and classes, they will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Forest Green Header Table with Dynamic Sequence Mapping */}
  {(() => {
    const activeKeys = getActiveSeqKeys ? getActiveSeqKeys(selectedTerm) : {
      key1: selectedTerm === 'Term 2' ? 'seq3' : selectedTerm === 'Term 3' ? 'seq5' : 'seq1',
      key2: selectedTerm === 'Term 2' ? 'seq4' : selectedTerm === 'Term 3' ? 'seq6' : 'seq2',
      label1: selectedTerm === 'Term 2' ? 'SEQ 3' : selectedTerm === 'Term 3' ? 'SEQ 5' : 'SEQ 1',
      label2: selectedTerm === 'Term 2' ? 'SEQ 4' : selectedTerm === 'Term 3' ? 'SEQ 6' : 'SEQ 2',
    };
    const { key1, key2, label1, label2 } = activeKeys;
const calculateSeqAverage = (seqKey) => {
  const keyName = seqKey.endsWith('_mark') ? seqKey : `${seqKey}_mark`;
  const marks = classStudents
    .map(s => parseFloat(marksRecords[s.id]?.[keyName]))
    .filter(m => !isNaN(m));
  if (marks.length === 0) return '-';
  const avg = marks.reduce((acc, curr) => acc + curr, 0) / marks.length;
  return avg.toFixed(1);
};

  const calculatePassPercentage = (seqKey) => {
  const keyName = seqKey.endsWith('_mark') ? seqKey : `${seqKey}_mark`;
  const marks = classStudents
    .map(s => parseFloat(marksRecords[s.id]?.[keyName]))
    .filter(m => !isNaN(m));
  if (marks.length === 0) return '-';
  const passed = marks.filter(m => m >= 10).length;
  return ((passed / marks.length) * 100).toFixed(0);
};

  const getDynamicTermScore = (studentId, k1, k2) => {
    const sMarks = marksRecords[studentId] || {};
    const key1Name = k1.endsWith('_mark') ? k1 : `${k1}_mark`;
    const key2Name = k2.endsWith('_mark') ? k2 : `${k2}_mark`;

    const val1 = parseFloat(sMarks[key1Name]);
    const val2 = parseFloat(sMarks[key2Name]);

    const has1 = !isNaN(val1);
    const has2 = !isNaN(val2);

    if (has1 && has2) return ((val1 + val2) / 2).toFixed(2);
    if (has1) return val1.toFixed(2);
    if (has2) return val2.toFixed(2);
    return '-';
  };

const getRankOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const getDynamicRankMap = (k1, k2) => {
  if (!Array.isArray(classStudents) || classStudents.length === 0) return {};

  const scores = classStudents.map(student => {
    const ts = getDynamicTermScore(student.id, k1, k2);
    return {
      id: student.id,
      score: ts !== '-' ? parseFloat(ts) : -1
    };
  });

  scores.sort((a, b) => b.score - a.score);

  const rankMap = {};
  let currentRank = 1;

  scores.forEach((item, index) => {
    if (item.score === -1) {
      rankMap[item.id] = '-';
    } else {
      if (index > 0 && item.score < scores[index - 1].score) {
        currentRank = index + 1;
      }
      rankMap[item.id] = `${currentRank}${getRankOrdinal(currentRank)}`;
    }
  });

  return rankMap;
};
    return (
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[#0f5231] bg-[#0f5231] shadow-xl mt-4">
      {isMarkEntryAuthorized ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg mb-4 text-xs font-bold flex items-center justify-between">
          <span>📢 NOTICE: Your account is AUTHORIZED for student marks entry and submission.</span>
          <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-300">AUTHORIZED</span>
        </div>
      ) : (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg mb-4 text-xs font-bold flex items-center justify-between">
          <span>🔒 NOTICE: Marks entry for your account is currently FROZEN by Admin.</span>
          <span className="bg-rose-500/20 px-2 py-0.5 rounded text-[10px] text-rose-300">FROZEN</span>
        </div>
      )}
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            {/* Top Header Row */}
            <tr className="bg-[#134e35] text-white">
  <th rowSpan="2" className="p-3 border-r border-emerald-900/40 w-12 text-center font-bold align-middle">
    Nº
  </th>
  <th rowSpan="2" className="p-3 border-r border-emerald-900/40 font-bold text-center align-middle">
    unique_code
  </th>
  <th rowSpan="2" className="p-3 border-r border-emerald-900/40 font-bold align-middle">
    Student Name
  </th>
  <th rowSpan="2" className="p-3 border-r border-emerald-900/40 font-bold text-center align-middle">
    Trade / Series
  </th>
  <th colSpan="2" className="p-3 border-b border-emerald-900/40 text-center font-bold bg-[#134e35]">
    <div className="text-base font-extrabold">{selectedSubjectForAction || 'Subject'}</div>
  </th>
  <th rowSpan="2" className="p-3 border-l border-emerald-900/40 text-center font-bold align-middle bg-[#0f3d29]">
    Term Score
  </th>
  <th rowSpan="2" className="p-3 border-l border-emerald-900/40 text-center font-bold align-middle bg-[#0f3d29]">
    Rank
  </th>
</tr>
            {/* Sequence Sub-Header Row */}
            <tr className="bg-[#134e35] text-white text-xs font-bold uppercase tracking-wider">
              <th className="p-2 border-t border-r border-emerald-900/40 text-center w-28">{label1}</th>
              <th className="p-2 border-t border-emerald-900/40 text-center w-28">{label2}</th>
            </tr>
          </thead>
          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 bg-[#fefcf8] text-slate-900 font-sans">
            {classStudents && classStudents.length > 0 ? (
              classStudents.map((student, idx) => {
                const studentMarks = marksRecords[student.id] || {};
                return (
                  <tr key={student.id || idx} className="hover:bg-amber-50/60 transition-colors">
  <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">
    {idx + 1}
  </td>
 <td className="p-3 border-r border-slate-200 text-center">
    <span className="px-2.5 py-1 rounded-md border border-slate-300 bg-white font-mono text-xs text-slate-700">
      {student.unique_code || student.matricule || student.id || '-'}
    </span>
  </td>
  <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
    {student.full_name || student.fullName || student.name}
  </td>
  <td className="p-3 border-r border-slate-200 text-center text-xs font-semibold text-slate-600">
    {student.trades_series || student.trade || student.series || student.specialty || '-'}
  </td>
  <td className="p-2 border-r border-slate-200 text-center">
    <input
      type="number"
      step="0.25"
      min="0"
      max="20"
      disabled={!isMarkEntryAuthorized}
      value={studentMarks[key1] ?? ''}
      onChange={(e) => handleMarkChange(student.id, key1, e.target.value)}
      className="w-full text-center font-extrabold bg-transparent text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded px-1"
      placeholder="-"
    />
  </td>
  <td className="p-2 border-r border-slate-200 text-center">
    <input
      type="number"
      step="0.25"
      min="0"
      max="20"
      disabled={!isMarkEntryAuthorized}
      value={studentMarks[key2] ?? ''}
      onChange={(e) => handleMarkChange(student.id, key2, e.target.value)}
      className="w-full text-center font-extrabold bg-transparent text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded px-1"
      placeholder="-"
    />
  </td>
  {(() => {
            const termScoreVal = getDynamicTermScore(student.id, key1, key2);
            const rankMap = getDynamicRankMap(key1, key2);
            const rankVal = rankMap[student.id] || '-';

            return (
              <>
                <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-700 bg-slate-50">
                  {termScoreVal}
                </td>
                <td className="p-3 text-center font-bold text-emerald-700 bg-slate-50">
                  {rankVal}
                </td>
              </>
            );
          })()}
</tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500 italic bg-white">
                  No students enrolled in {selectedClassForAction || 'this class'}.
                </td>
              </tr>
            )}
      </tbody>
         {classStudents && classStudents.length > 0 && (
  <tfoot className="bg-[#0b192c] text-white font-medium text-xs">
    {/* Subject Average Row */}
    <tr className="border-t border-emerald-900/40">
      <td colSpan="4" className="p-2.5 text-right pr-4 font-bold text-gray-300">
        Subject Average (/20):
      </td>
      <td className="p-2 text-center text-amber-400 font-bold border-r border-emerald-900/40">
        {calculateSeqAverage(key1)}
      </td>
      <td className="p-2 text-center text-amber-400 font-bold border-r border-emerald-900/40">
        {calculateSeqAverage(key2)}
      </td>
     <td className="p-2 text-center text-amber-400 font-bold border-r border-emerald-900/40">
  {(() => {
    if (!Array.isArray(classStudents) || classStudents.length === 0) return '-';
    const scores = classStudents
      .map(s => parseFloat(getDynamicTermScore(s.id, key1, key2)))
      .filter(s => !isNaN(s));
    if (scores.length === 0) return '-';
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })()}
</td>
  <td className="p-2 text-center text-gray-400">-</td>
    </tr>

    {/* Percentage Passed Row */}
    <tr className="border-t border-emerald-900/40">
      <td colSpan="4" className="p-2.5 text-right pr-4 font-bold text-gray-300">
        Passed (% ≥ 10/20):
      </td>
      <td className="p-2 text-center text-emerald-400 font-bold border-r border-emerald-900/40">
        {calculatePassPercentage(key1)}%
      </td>
      <td className="p-2 text-center text-emerald-400 font-bold border-r border-emerald-900/40">
        {calculatePassPercentage(`${key2}_mark`)}%
      </td>
      <td className="p-2 text-center text-emerald-400 font-bold border-r border-emerald-900/40">
  {(() => {
    if (!Array.isArray(classStudents) || classStudents.length === 0) return '-';
    const scores = classStudents
      .map(s => parseFloat(getDynamicTermScore(s.id, key1, key2)))
      .filter(s => !isNaN(s));
    if (scores.length === 0) return '-';
    const passed = scores.filter(s => s >= 10).length;
    return `${((passed / scores.length) * 100).toFixed(0)}%`;
  })()}
</td>
  <td className="p-2 text-center text-gray-400">-</td>
    </tr>
  </tfoot>
)}
</table>
      </div>
    );
  })()}
              {/* MOBILE VIEW: Large Touch-Friendly Cards */}
  {(() => {
    const activeKeys = getActiveSeqKeys ? getActiveSeqKeys(selectedTerm) : {
      key1: selectedTerm === 'Term 2' ? 'seq3' : selectedTerm === 'Term 3' ? 'seq5' : 'seq1',
      key2: selectedTerm === 'Term 2' ? 'seq4' : selectedTerm === 'Term 3' ? 'seq6' : 'seq2',
      label1: selectedTerm === 'Term 2' ? 'SEQ 3' : selectedTerm === 'Term 3' ? 'SEQ 5' : 'SEQ 1',
      label2: selectedTerm === 'Term 2' ? 'SEQ 4' : selectedTerm === 'Term 3' ? 'SEQ 6' : 'SEQ 2',
    };
    const { key1, key2, label1, label2 } = activeKeys;

    return (
      <div className="block md:hidden space-y-4 mt-4">
  {classStudents && classStudents.length > 0 ? (
    classStudents.map((student, idx) => {
      const studentMarks = marksRecords[student.id] || {};
      return (
        <div key={student.id || idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          {/* Card Header: Number, Name, Dynamic Trade/Series, Rank, Unique Code */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
              <span className="font-bold text-xs text-slate-100">{student.full_name || student.fullName || student.name}</span>
              
              {/* Dynamic Trade / Series Badge */}
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-semibold text-emerald-300">
                <span className="text-emerald-500 font-bold">Trade/Series: </span>
                {student.trade_series || student.series || student.trade || student.speciality || student.specialty || student.option || '-'}
              </span>

              {/* Rank Badge */}
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-[10px] font-bold text-amber-400">
                {studentMarks['rank'] ? `Rank: ${studentMarks['rank']}` : 'Rank: -'}
              </span>
            </div>

            {/* Unique Code Badge */}
            <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 font-mono text-[10px] text-slate-300">
              {student.unique_code || student.matricule || student.id || '-'}
            </span>
          </div>

          {/* Sequence Mark Inputs (2-Column Grid) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">{label1}</label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="20"
                value={studentMarks[key1] ?? ''}
                onChange={(e) => handleMarkChange(student.id, key1, e.target.value)}
                className="w-full text-center font-extrabold text-xs bg-slate-900 border border-slate-700 rounded p-1 text-white focus:outline-none focus:border-emerald-500"
                placeholder="-"
              />
            </div>

            <div className="bg-slate-800/60 p-2 rounded border border-slate-700/50">
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">{label2}</label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="20"
                value={studentMarks[key2] ?? ''}
                onChange={(e) => handleMarkChange(student.id, key2, e.target.value)}
                className="w-full text-center font-extrabold text-xs bg-slate-900 border border-slate-700 rounded p-1 text-white focus:outline-none focus:border-emerald-500"
                placeholder="-"
              />
            </div>
          </div>
        </div>
      );
    })
  ) : (
    <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-900 rounded-lg border border-slate-800">
      No students enrolled in {selectedClassForAction || 'this class'}.
    </div>
  )}
</div>
    );
  })()}
{successBanner && (
  <div className="mb-4 p-4 bg-[#064e3b] border-2 border-[#10b981] rounded-xl shadow-2xl text-emerald-100 flex items-start space-x-3">
    <div className="text-2xl">✅</div>
    <div className="flex-1">
      <h4 className="font-bold text-base text-white mb-1">Submission Successful</h4>
      <p className="text-sm leading-relaxed text-emerald-200">{successBanner}</p>
    </div>
    <button 
      onClick={() => setSuccessBanner(null)} 
      className="text-emerald-300 hover:text-white font-bold text-lg px-2"
    >
      &times;
    </button>
  </div>
)}
              {/* Save Action Button */}
              <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={submitMarks}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg transition-all active:scale-95 text-sm"
                >
                  Upload & Submit Scores
                </button>
              </div>
            </>
          )}
        </div>
      )}
        

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl max-w-2xl mx-auto shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-gray-800 pb-3">Teacher Professional Credentials & ID</h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                <input type="text" value={teacherProfile.name} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Teacher ID</label>
                <div className="flex gap-2">
                  <input type="text" value={teacherProfile.teacher_id || ''} disabled className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg p-3 font-mono text-amber-300 font-bold" />
                  <button 
                    onClick={() => {
                     navigator.clipboard.writeText(teacherProfile.teacher_id || ''); 
                      alert('Teacher ID copied!');
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded-lg font-bold text-xs"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
                  <input type="text" value={teacherProfile.email} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Phone</label>
                  <input type="text" value={teacherProfile.phone} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Place of Residence</label>
                <input type="text" value={teacherProfile.residence} disabled className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-3 text-gray-300" />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-800 mt-12">
        App conceived by Norbert Che Nsuh - 682491189
      </footer>
    </div>
  );
}