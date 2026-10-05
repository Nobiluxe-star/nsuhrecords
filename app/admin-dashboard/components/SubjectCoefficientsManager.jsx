'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import AcademicConfigModal from './AcademicConfigModal';
import { useAcademicConfigs } from '../context/AcademicConfigsContext';

import { 
  ALL_SUBJECTS_LIST, 
  GENERAL_CLASSES_CATALOG, 
  TECHNICAL_COMMERCIAL_CATALOG, 
  TECHNICAL_INDUSTRIAL_CATALOG,
  GENERAL_SERIES_CATALOG,
  COMMERCIAL_TRADE_SERIES,
  INDUSTRIAL_TRADE_SERIES 
} from '../page'; 

// Standardized Cameroonian Lower General Education Defaults
const GENERAL_LOWER_DEFAULT_SUBJECTS = [
  { name: 'English Language', category: 'General Core Subjects', coefficient: 5 },
  { name: 'Mathematics', category: 'General Core Subjects', coefficient: 4 },
  { name: 'French Language', category: 'General Core Subjects', coefficient: 3 },
  { name: 'Biology', category: 'General Core Subjects', coefficient: 3 },
  { name: 'Chemistry', category: 'General Core Subjects', coefficient: 3 },
  { name: 'Physics', category: 'General Core Subjects', coefficient: 3 },
  { name: 'Literature in English', category: 'General Core Subjects', coefficient: 2 },
  { name: 'Computer Science / ICT', category: 'General Core Subjects', coefficient: 2 },
  { name: 'History', category: 'General Core Subjects', coefficient: 2 },
  { name: 'Citizenship Education', category: 'General Core Subjects', coefficient: 2 },
  { name: 'Sports & Physical Education', category: 'General Core Subjects', coefficient: 2 },
  { name: 'School Orientation', category: 'General Core Subjects', coefficient: 1 }
];

export default function SubjectCoefficientsManager({ activeSchool }) {
  // Selection States
  const [selectedSection, setSelectedSection] = useState('General Education');
  const [selectedClass, setSelectedClass] = useState('Form 1A (F1A)');
  const [selectedTradeSeries, setSelectedTradeSeries] = useState('N/A');

  // Active Subject List State
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  
  // Custom Subject Modal State (Upgraded to multi-row batch state)
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customRows, setCustomRows] = useState([
    { name: '', category: 'General Core Subjects' }
  ]);
const { masterSubjects } = useAcademicConfigs();
  // Academic Config Modal State & Custom Dynamic Catalogs
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClasses, setCustomClasses] = useState({ general: [], commercial: [], industrial: [] });
  const [customTrades, setCustomTrades] = useState({ commercial: [], industrial: [] });
  const [customSections, setCustomSections] = useState([]);

  // Dropdown & Search State
  const [subjectSearch, setSubjectSearch] = useState('');
  const [selectedDropdownSubject, setSelectedDropdownSubject] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Resolve Active School ID with Fallbacks
  const resolveSchoolId = async () => {
    if (activeSchool?.id) {
      localStorage.setItem('active_school_id', activeSchool.id);
      return activeSchool.id;
    }

    const cachedId = localStorage.getItem('active_school_id');
    if (cachedId) return cachedId;

    try {
      let query = supabase.from('school_details').select('id');
      if (activeSchool?.name) {
        query = query.eq('school_name', activeSchool.name);
      }
      const { data, error } = await query.limit(1);

      if (!error && data && data.length > 0 && data[0].id) {
        const resolvedId = data[0].id;
        localStorage.setItem('active_school_id', resolvedId);
        return resolvedId;
      }
    } catch (err) {
      console.warn('Unable to query school_details table:', err.message);
    }

    return null;
  };

  // Detect Sixth Form
  const isSixthForm = useMemo(() => {
    if (!selectedClass) return false;
    const cls = selectedClass.toLowerCase();
    return cls.includes('lower sixth') || cls.includes('upper sixth') || cls.includes('l6') || cls.includes('u6');
  }, [selectedClass]);

  // Detect Sixth Form Stream
  const sixthFormStream = useMemo(() => {
    if (!isSixthForm) return null;
    const cls = selectedClass.toLowerCase();
    if (cls.includes('arts') || cls.includes('art') || cls.includes('a')) return 'ARTS';
    if (cls.includes('science') || cls.includes('sci') || cls.includes('s')) return 'SCIENCE';
    return 'BOTH';
  }, [selectedClass, isSixthForm]);

  // Determine if Series/Trade selection is required
  const isSeriesRequired = useMemo(() => {
    if (selectedSection !== 'General Education') return true;
    return isSixthForm;
  }, [selectedSection, isSixthForm]);

  // Switch available classes when section changes (prioritizing custom classes at the top)
  const availableClasses = useMemo(() => {
    if (selectedSection?.includes('Commercial')) {
      return [...customClasses.commercial, ...(TECHNICAL_COMMERCIAL_CATALOG || [])];
    }
    if (selectedSection?.includes('Industrial')) {
      return [...customClasses.industrial, ...(TECHNICAL_INDUSTRIAL_CATALOG || [])];
    }
    return [...customClasses.general, ...(GENERAL_CLASSES_CATALOG || [])];
  }, [selectedSection, customClasses]);

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
      handleClassChange(availableClasses[0]);
    }
  }, [selectedSection, availableClasses]);

  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
    const clsLower = newClass.toLowerCase();
    const isNewSixthForm = clsLower.includes('lower sixth') || clsLower.includes('upper sixth') || clsLower.includes('l6') || clsLower.includes('u6');

    if (selectedSection === 'General Education' && !isNewSixthForm) {
      setSelectedTradeSeries('N/A');
    } else {
      setSelectedTradeSeries('');
    }
  };

  const availableUnassignedSubjects = useMemo(() => {
    const assignedNames = new Set(assignedSubjects.map(s => s.name.toLowerCase()));
    const unassigned = (masterSubjects || []).filter(s => !assignedNames.has(s.name.toLowerCase()));
    
    if (!subjectSearch.trim()) return unassigned;
    return unassigned.filter(s => 
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
      s.category?.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [assignedSubjects, subjectSearch, masterSubjects]);

  // Load existing assigned subjects
  useEffect(() => {
    fetchClassSubjects();
  }, [selectedClass, selectedTradeSeries, selectedSection, activeSchool?.id]);

  const fetchClassSubjects = async () => {
    if (!selectedClass) return;

    if (isSeriesRequired && !selectedTradeSeries) {
      setAssignedSubjects([]);
      return;
    }

    setLoading(true);
    const targetSeries = isSeriesRequired ? selectedTradeSeries : 'N/A';
    const cacheKey = `class_coeffs_${selectedSection}_${selectedClass}_${targetSeries}`;

    try {
      const schoolId = await resolveSchoolId();

      if (!navigator.onLine) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          setAssignedSubjects(JSON.parse(cachedData));
          return;
        }
      }

      if (!schoolId) {
        setStatusMessage({
          type: 'error',
          text: 'Multitenancy Error: Active School ID could not be identified. Operations halted.'
        });
        return;
      }

      const { data, error } = await supabase
        .from('class_coefficients')
        .select('*')
        .eq('school_id', schoolId)
        .eq('section', selectedSection)
        .eq('classLevel', selectedClass)
        .eq('trades_series', targetSeries);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0];
        let fetchedSubjects = [];

        if (Array.isArray(row.subject_coefficients)) {
          fetchedSubjects = row.subject_coefficients;
        } else if (Array.isArray(row.subjects)) {
          fetchedSubjects = row.subjects;
        }

        setAssignedSubjects(fetchedSubjects);
        localStorage.setItem(cacheKey, JSON.stringify(fetchedSubjects));
      } else {
        let defaultSubjects = [];

        if (selectedSection === 'General Education' && !isSixthForm) {
          defaultSubjects = [...GENERAL_LOWER_DEFAULT_SUBJECTS];
        } else if (selectedTradeSeries && GENERAL_SERIES_CATALOG?.series) {
          const artsSeries = GENERAL_SERIES_CATALOG.series.ARTS?.find(s => s.code === selectedTradeSeries);
          const sciSeries = GENERAL_SERIES_CATALOG.series.SCIENCE?.find(s => s.code === selectedTradeSeries);
          const found = artsSeries || sciSeries;

          if (found) {
            defaultSubjects = found.subjects.map(name => ({
              name,
              category: 'Core Specialty',
              coefficient: 3
            }));
          }
        }

        setAssignedSubjects(defaultSubjects);
        localStorage.setItem(cacheKey, JSON.stringify(defaultSubjects));
      }
    } catch (err) {
      console.error('Error loading subjects:', err.message);
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setAssignedSubjects(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromDropdown = (e) => {
    const subjectName = e.target.value;
    if (!subjectName) return;

  const fullSubject = masterSubjects.find(s => s.name === subjectName);
    const newEntry = {
      name: subjectName,
      category: fullSubject?.category || 'General Core Subjects',
      coefficient: 1
    };

    setAssignedSubjects([...assignedSubjects, newEntry]);
    setSelectedDropdownSubject('');
  };

  // Batch Custom Subjects Handlers with Permanent Supabase Persistence & Multitenancy
  const handleAddCustomRow = () => {
    setCustomRows(prev => [...prev, { name: '', category: 'General Core Subjects' }]);
  };

  const handleRemoveCustomRow = (index) => {
    setCustomRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBatchAddCustomSubjects = async () => {
    const validNewEntries = [];
    for (const row of customRows) {
      const trimmedName = row.name.trim();
      if (!trimmedName) continue;
      validNewEntries.push({
        name: trimmedName,
        category: row.category,
        coefficient: 1
      });
    }

    if (validNewEntries.length === 0) {
      alert('Please enter at least one valid subject name.');
      return;
    }

    try {
      const schoolId = await resolveSchoolId();
      if (!schoolId) {
        alert('Multitenancy Error: Active School ID could not be identified. Cannot save globally.');
        return;
      }

      // Persist permanently to single source of truth table with strict school_id, category, and section
      const payloads = validNewEntries.map(sub => ({
        school_id: schoolId,
        config_type: 'subject',
        section: selectedSection, 
        category: sub.category,    // Captures the chosen category (General Core, Commercial, etc.)
        name: sub.name,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('school_academic_configs').insert(payloads);
      if (error) throw error;

      // Append to active class assigned list as well for immediate usability
      const existingNames = new Set(assignedSubjects.map(s => s.name.toLowerCase().trim()));
      const filteredToAdd = validNewEntries.filter(s => !existingNames.has(s.name.toLowerCase().trim()));

      if (filteredToAdd.length > 0) {
        setAssignedSubjects(prev => [...prev, ...filteredToAdd]);
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully saved ${validNewEntries.length} custom subject(s) permanently to your school database!`
      });

      setCustomRows([{ name: '', category: 'General Core Subjects' }]);
      setShowCustomModal(false);
    } catch (err) {
      console.error('Error saving custom subjects globally:', err);
      alert('Failed to save custom subjects to database: ' + err.message);
    }
  };

  // Handle saving new configurations from AcademicConfigModal
  const handleSaveAcademicConfig = (newConfig) => {
    const { type, section, name } = newConfig;

    if (type === 'classLevel') {
      const key = section.toLowerCase().includes('commercial') ? 'commercial' : section.toLowerCase().includes('industrial') ? 'industrial' : 'general';
      setCustomClasses(prev => ({
        ...prev,
        [key]: [name, ...(prev[key] || [])]
      }));
      setSelectedClass(name);
    } else if (type === 'tradeSeries') {
      const key = section.toLowerCase().includes('industrial') ? 'industrial' : 'commercial';
      setCustomTrades(prev => ({
        ...prev,
        [key]: [name, ...(prev[key] || [])]
      }));
      setSelectedTradeSeries(name);
    } else if (type === 'section') {
      setCustomSections(prev => [name, ...prev]);
      setSelectedSection(name);
    }

    setStatusMessage({
      type: 'success',
      text: `Successfully added "${name}" and prioritized it at the top of your dropdowns!`
    });
  };

  const handleCoefficientChange = (index, value) => {
    const updated = [...assignedSubjects];
    updated[index].coefficient = Math.max(1, Number(value) || 1);
    setAssignedSubjects(updated);
  };

  const handleRemoveSubject = (index) => {
    setAssignedSubjects(prev => prev.filter((_, i) => i !== index));
  };

  // Save Configuration to Supabase with Mandatory School ID
  const handleSave = async () => {
    setStatusMessage({ type: '', text: '' });

    if (isSeriesRequired && (!selectedTradeSeries || selectedTradeSeries === 'N/A')) {
      setStatusMessage({ 
        type: 'error', 
        text: `Please select a valid Series / Trade Specialty for ${selectedClass} before saving.` 
      });
      return;
    }

    if (assignedSubjects.length === 0) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Please add at least one subject to this class configuration before saving.' 
      });
      return;
    }

    setLoading(true);
    const finalSeries = isSeriesRequired ? selectedTradeSeries : 'N/A';
    const cacheKey = `class_coeffs_${selectedSection}_${selectedClass}_${finalSeries}`;

    try {
      const schoolId = await resolveSchoolId();

      if (!schoolId) {
        throw new Error('Multitenancy Violation: Cannot save without an active School ID. Please select a valid school.');
      }

      localStorage.setItem(cacheKey, JSON.stringify(assignedSubjects));

      if (!navigator.onLine) {
        setStatusMessage({ 
          type: 'success', 
          text: 'Saved locally (Offline Mode). Changes will sync when online.' 
        });
        setLoading(false);
        return;
      }

      await supabase
        .from('class_coefficients')
        .delete()
        .eq('school_id', schoolId)
        .eq('section', selectedSection)
        .eq('classLevel', selectedClass)
        .eq('trades_series', finalSeries);

      const payload = {
        school_id: schoolId,
        academic_year: getCurrentAcademicYear(),
        section: selectedSection,
        classLevel: selectedClass,
        trades_series: finalSeries,
        subject_coefficients: assignedSubjects,
        is_included: true,
      };

      const { error } = await supabase.from('class_coefficients').insert([payload]);
      if (error) throw error;

      setStatusMessage({ type: 'success', text: 'Class subjects & coefficients saved successfully!' });
    } catch (err) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-wide">Class & Subject Coefficients</h2>
            <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30">
              {assignedSubjects.length} Active Subjects
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Selected subjects directly calculate student report cards. Ensure coefficients match academic regulations.
          </p>
        </div>

        <div className="flex items-center gap-3">
         <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-md"
          >
            ⚙️ Class Setup Configurations
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs rounded-lg shadow-lg hover:shadow-amber-500/20 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Validate'}
          </button>
        </div>
      </div>

      {statusMessage.text && (
        <div className={`p-3 rounded-lg mb-4 text-xs font-semibold ${
          statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-950/60 rounded-xl border border-gray-800/80 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setSelectedTradeSeries(e.target.value === 'General Education' ? 'N/A' : '');
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {customSections.map(sec => (
              <option key={sec} value={sec}>{sec} (Custom)</option>
            ))}
            <option value="General Education">General Education</option>
            <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
            <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Class Level</label>
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">
            Series / Specialty {isSeriesRequired && <span className="text-red-400">*</span>}
          </label>
          <select
            value={selectedTradeSeries}
            onChange={(e) => setSelectedTradeSeries(e.target.value)}
            disabled={!isSeriesRequired}
            className={`w-full bg-gray-800 border rounded-lg p-2.5 text-xs text-white focus:outline-none ${
              isSeriesRequired && !selectedTradeSeries ? 'border-amber-500/80 text-amber-300' : 'border-gray-700'
            } ${!isSeriesRequired ? 'opacity-50 cursor-not-allowed' : 'focus:border-amber-500'}`}
          >
            {!isSeriesRequired ? (
              <option value="N/A">N/A (General Lower Class)</option>
            ) : (
              <option value="">-- Select Required Series --</option>
            )}

            {selectedSection === 'General Education' && isSixthForm && (
              <>
                {(sixthFormStream === 'ARTS' || sixthFormStream === 'BOTH' || !sixthFormStream) && (
                  <optgroup label="Arts Series">
                    {GENERAL_SERIES_CATALOG?.ARTS?.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </optgroup>
                )}
                {(sixthFormStream === 'SCIENCE' || sixthFormStream === 'BOTH' || !sixthFormStream) && (
                  <optgroup label="Science Series">
                    {GENERAL_SERIES_CATALOG?.SCIENCE?.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </optgroup>
                )}
              </>
            )}

            {selectedSection?.includes('Commercial') && (
              <>
                {customTrades.commercial.map(trade => (
                  <option key={trade} value={trade}>{trade} (Custom)</option>
                ))}
                {COMMERCIAL_TRADE_SERIES?.map(trade => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </>
            )}

            {selectedSection?.includes('Industrial') && (
              <>
                {customTrades.industrial.map(trade => (
                  <option key={trade} value={trade}>{trade} (Custom)</option>
                ))}
                {INDUSTRIAL_TRADE_SERIES?.map(trade => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Searchable Add Subject Bar */}
      <div className="mb-4 bg-gray-800/40 p-3 rounded-lg border border-gray-800 flex flex-col md:flex-row items-center gap-3">
        <span className="text-xs font-semibold text-amber-400 whitespace-nowrap">+ Add Subject to Class:</span>
        
        <input
          type="text"
          placeholder="Filter subject catalog..."
          value={subjectSearch}
          onChange={(e) => setSubjectSearch(e.target.value)}
          disabled={isSeriesRequired && !selectedTradeSeries}
          className="w-full md:w-1/3 bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />

        <select
          value={selectedDropdownSubject}
          onChange={handleAddFromDropdown}
          disabled={isSeriesRequired && !selectedTradeSeries}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
        >
          <option value="">
            {isSeriesRequired && !selectedTradeSeries 
              ? '-- Select a Series above first --' 
              : `-- Select subject from list (${availableUnassignedSubjects.length} available) --`}
          </option>
          {availableUnassignedSubjects.map(sub => (
            <option key={sub.name} value={sub.name}>{sub.name} ({sub.category})</option>
          ))}
        </select>
      </div>

      {/* Active Subjects Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-800/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
              <th className="p-3">#</th>
              <th className="p-3">Subject Name</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-center">Coefficient</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-200">
            {assignedSubjects.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500 italic">
                  {isSeriesRequired && !selectedTradeSeries 
                    ? 'Please select a Series/Trade from the dropdown above to view or configure subjects.'
                    : 'No active subjects assigned to this class. Select a subject from the dropdown above to add one.'}
                </td>
              </tr>
            ) : (
              assignedSubjects.map((sub, idx) => (
                <tr key={`${sub.name}-${idx}`} className="hover:bg-gray-800/30 transition">
                  <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                  <td className="p-3 font-semibold text-white">{sub.name}</td>
                  <td className="p-3 text-gray-400">{sub.category}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sub.coefficient}
                      onChange={(e) => handleCoefficientChange(idx, e.target.value)}
                      className="w-16 bg-gray-950 border border-gray-700 text-amber-400 text-center font-bold p-1.5 rounded focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition"
                      title="Remove subject"
                    >
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Multi-Row Batch Custom Subjects */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-base font-bold text-white mb-1">Add Multiple Custom Subjects</h3>
            <p className="text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mb-4">
              <strong>Notice:</strong> Manually added custom subjects will be saved permanently to your school database and become globally available across teacher schedules and mark sheets.
            </p>

            {/* Scrollable Rows Container */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 mb-4">
              {customRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-950 p-3 rounded-lg border border-gray-800">
                  <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Subject Name (e.g. Special Motor Mechanics)"
                      value={row.name}
                      onChange={(e) => {
                        const updated = [...customRows];
                        updated[idx].name = e.target.value;
                        setCustomRows(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded text-xs focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const updated = [...customRows];
                        updated[idx].category = e.target.value;
                        setCustomRows(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="General Core Subjects">General Core Subjects</option>
                      <option value="Commercial Subjects">Commercial Subjects</option>
                      <option value="Industrial Subjects">Industrial Subjects</option>
                      <option value="Technical Specialty">Technical Specialty</option>
                      <option value="Practical / Vocational">Practical / Vocational</option>
                    </select>
                  </div>
                  {customRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomRow(idx)}
                      className="text-red-400 hover:text-red-300 p-2 text-xs font-bold"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Row Button */}
            <button
              type="button"
              onClick={handleAddCustomRow}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-amber-400 font-semibold text-xs rounded-lg border border-dashed border-gray-700 mb-6 transition"
            >
              + Add Another Subject Row
            </button>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomRows([{ name: '', category: 'General Core Subjects' }]);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchAddCustomSubjects}
                className="px-5 py-2 bg-amber-500 text-gray-950 font-bold text-xs rounded-lg hover:bg-amber-600 shadow-md"
              >
                Save All Custom Subjects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Config Modal for Classes, Trades, & Sections */}
      <AcademicConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaveConfig={handleSaveAcademicConfig}
        activeSchoolId={activeSchool?.id}
      />
    </div>
  );
}