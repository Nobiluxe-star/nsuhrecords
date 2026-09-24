'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
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
  
  // Custom Subject Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectCategory, setCustomSubjectCategory] = useState('General Core Subjects');

  // Dropdown & Search State
  const [subjectSearch, setSubjectSearch] = useState('');
  const [selectedDropdownSubject, setSelectedDropdownSubject] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Resolve Active School ID with Fallbacks
  const resolveSchoolId = async () => {
    // 1. Direct Context Check
    if (activeSchool?.id) {
      localStorage.setItem('active_school_id', activeSchool.id);
      return activeSchool.id;
    }

    // 2. Offline / Local Storage Fallback
    const cachedId = localStorage.getItem('active_school_id');
    if (cachedId) return cachedId;

    // 3. Database Fallback (Fetch from school_details)
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

  // Switch available classes when section changes
  const availableClasses = useMemo(() => {
    if (selectedSection?.includes('Commercial')) return TECHNICAL_COMMERCIAL_CATALOG || [];
    if (selectedSection?.includes('Industrial')) return TECHNICAL_INDUSTRIAL_CATALOG || [];
    return GENERAL_CLASSES_CATALOG || [];
  }, [selectedSection]);

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
    const unassigned = (ALL_SUBJECTS_LIST || []).filter(s => !assignedNames.has(s.name.toLowerCase()));
    
    if (!subjectSearch.trim()) return unassigned;
    return unassigned.filter(s => 
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
      s.category?.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [assignedSubjects, subjectSearch]);

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

      // Offline First Strategy
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

    const fullSubject = ALL_SUBJECTS_LIST.find(s => s.name === subjectName);
    const newEntry = {
      name: subjectName,
      category: fullSubject?.category || 'General Core Subjects',
      coefficient: 1
    };

    setAssignedSubjects([...assignedSubjects, newEntry]);
    setSelectedDropdownSubject('');
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectName.trim()) return;

    if (assignedSubjects.some(s => s.name.toLowerCase() === customSubjectName.trim().toLowerCase())) {
      alert('This subject is already added!');
      return;
    }

    const newEntry = {
      name: customSubjectName.trim(),
      category: customSubjectCategory,
      coefficient: 1
    };

    setAssignedSubjects([...assignedSubjects, newEntry]);
    setCustomSubjectName('');
    setShowCustomModal(false);
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

      // Mandatory Multitenant Guard
      if (!schoolId) {
        throw new Error('Multitenancy Violation: Cannot save without an active School ID. Please select a valid school.');
      }

      // Always Cache Locally for Offline Usability
      localStorage.setItem(cacheKey, JSON.stringify(assignedSubjects));

      if (!navigator.onLine) {
        setStatusMessage({ 
          type: 'success', 
          text: 'Saved locally (Offline Mode). Changes will sync when online.' 
        });
        setLoading(false);
        return;
      }

      // Clear existing records for specified school, class & series
      await supabase
        .from('class_coefficients')
        .delete()
        .eq('school_id', schoolId)
        .eq('section', selectedSection)
        .eq('classLevel', selectedClass)
        .eq('trades_series', finalSeries);

      // Save payload with mandatory school_id
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
            onClick={() => setShowCustomModal(true)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition"
          >
            + Add Custom Subject
          </button>

          <button
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
              COMMERCIAL_TRADE_SERIES?.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))
            )}

            {selectedSection?.includes('Industrial') && (
              INDUSTRIAL_TRADE_SERIES?.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))
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

      {/* Modal for Custom Subject */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Add Custom Subject</h3>
            
            <p className="text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mb-4">
              <strong>Notice:</strong> Manually added custom subjects must also be assigned in the Teacher Schedule module so subject teachers can input marks.
            </p>

            <label className="block text-xs font-semibold text-gray-400 mb-1">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Special Motor Mechanics"
              value={customSubjectName}
              onChange={(e) => setCustomSubjectName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 text-white p-2.5 rounded-lg text-xs mb-4 focus:outline-none focus:border-amber-500"
            />

            <label className="block text-xs font-semibold text-gray-400 mb-1">Subject Category</label>
            <select
              value={customSubjectCategory}
              onChange={(e) => setCustomSubjectCategory(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 text-white p-2.5 rounded-lg text-xs mb-6 focus:outline-none focus:border-amber-500"
            >
              <option value="General Core Subjects">General Core Subjects</option>
              <option value="Technical Specialty">Technical Specialty</option>
              <option value="Practical / Vocational">Practical / Vocational</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomSubject}
                className="px-4 py-2 bg-amber-500 text-gray-950 font-bold text-xs rounded-lg hover:bg-amber-600"
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}