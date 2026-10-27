import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import {
  fetchMockMarks,
  saveMockMark,
  subscribeToMockMarks,
  calculateGradeFrom100,
  isPassingGrade
} from './mockExamService';

export default function GeneralMock({
  schoolId,
  userId,
  schoolDetails = {},
  studentsList = [],
  subjectsList = [],
  onClose
}) {
  const [examType, setExamType] = useState('MOCK'); // 'PRE_MOCK' or 'MOCK'
  const [examLevel, setExamLevel] = useState('O_LEVEL'); // 'O_LEVEL' or 'A_LEVEL'
  const [viewMode, setViewMode] = useState('compiled'); // 'compiled' or 'grid'
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  // Single source of truth for academic year
  const currentAcademicYear = getCurrentAcademicYear();
  const sectionName = 'General Education';

  // Target examination classes aligned directly with GENERAL_CLASSES_CATALOG
  const targetClasses = useMemo(() => {
    return examLevel === 'O_LEVEL'
      ? ['Form 5A (F5A)', 'Form 5B (F5B)', 'Form 5', 'F5']
      : ['Upper Sixth Arts (U6A)', 'Upper Sixth Science (U6S)', 'Upper Sixth', 'U6'];
  }, [examLevel]);

  // Filter student directory for candidates enrolled in selected target classes
  const candidates = useMemo(() => {
    if (!studentsList || studentsList.length === 0) return [];

    return studentsList.filter(s => {
      const studentClass = (s.classLevel || s.class_name || s.class || '').toString().trim();
      return targetClasses.some(tc => studentClass.toLowerCase().includes(tc.toLowerCase()) || tc.toLowerCase().includes(studentClass.toLowerCase()));
    });
  }, [studentsList, targetClasses]);

  // Filter subjects allocated to the active exam level (Form 5 vs Upper Sixth)
  const activeSubjects = useMemo(() => {
    if (!subjectsList || subjectsList.length === 0) return [];

    return subjectsList.filter(subj => {
      const subjLevel = (subj.classLevel || subj.level || subj.section || subj.class_name || '').toString().toLowerCase();
      if (examLevel === 'O_LEVEL') {
        return subjLevel.includes('form 5') || subjLevel.includes('f5') || subjLevel.includes('o_level') || subjLevel === '';
      } else {
        return subjLevel.includes('upper sixth') || subjLevel.includes('u6') || subjLevel.includes('a_level') || subjLevel === '';
      }
    });
  }, [subjectsList, examLevel]);

  // Load examination marks from Supabase / IndexedDB cache
  useEffect(() => {
    let isMounted = true;
    async function loadMarks() {
      setLoading(true);
      const records = await fetchMockMarks({
        schoolId,
        section: sectionName,
        classLevels: targetClasses,
        examType
      });

      if (isMounted) {
        const map = {};
        records.forEach(r => {
          map[`${r.student_id}_${r.subject_name}`] = r;
        });
        setMarksData(map);
        setLoading(false);
      }
    }

    if (schoolId) loadMarks();

    return () => {
      isMounted = false;
    };
  }, [schoolId, targetClasses, examType]);

  // Realtime subscription for live updates across screens
  useEffect(() => {
    if (!schoolId) return;

    const unsubscribe = subscribeToMockMarks({
      schoolId,
      section: sectionName,
      examType,
      onUpdate: (updatedRecord) => {
        setMarksData(prev => ({
          ...prev,
          [`${updatedRecord.student_id}_${updatedRecord.subject_name}`]: updatedRecord
        }));
      }
    });

    return () => unsubscribe();
  }, [schoolId, examType]);

  // Live mark entry handler (0-100 scale) with silent auto-save
  const handleScoreChange = (student, subjectName, rawValue) => {
    const numericVal = rawValue === '' ? '' : Math.min(100, Math.max(0, Number(rawValue) || 0));
    const isALevel = examLevel === 'A_LEVEL';
    const grade = calculateGradeFrom100(numericVal, 'General Education', isALevel);

    const key = `${student.id}_${subjectName}`;
    setMarksData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        student_id: student.id,
        subject_name: subjectName,
        mark_100: numericVal,
        letter_grade: grade
      }
    }));
  };

  const handleScoreBlur = async (student, subjectName, rawValue) => {
    if (rawValue === '' || rawValue === undefined) return;
    const numericVal = Math.min(100, Math.max(0, Number(rawValue) || 0));
    const isALevel = examLevel === 'A_LEVEL';
    const grade = calculateGradeFrom100(numericVal, 'General Education', isALevel);

    await saveMockMark({
      schoolId,
      studentId: student.id,
      matricule: student.matricule || '',
      section: sectionName,
      classLevel: student.classLevel || student.class_name || targetClasses[0],
      tradesSeries: student.trades_series || null,
      subjectName,
      examType,
      mark100: numericVal,
      letterGrade: grade,
      userId
    });
  };

  // Compute student pass status & ordered passed subjects
  const studentPerformance = useMemo(() => {
    const isALevel = examLevel === 'A_LEVEL';

    return candidates.map(student => {
      const studentMarks = Object.keys(marksData)
        .filter(k => k.startsWith(`${student.id}_`))
        .map(k => marksData[k]);

      // Filter passed subjects and sort from highest mark to lowest mark
      const passedSubjects = studentMarks
        .filter(m => isPassingGrade(m.letter_grade, 'General Education', isALevel))
        .sort((a, b) => (Number(b.mark_100) || 0) - (Number(a.mark_100) || 0));

      const numPassed = passedSubjects.length;
      const isPassed = isALevel ? numPassed >= 2 : numPassed >= 4;

      return {
        ...student,
        name: student.full_name || student.name || 'Candidate',
        studentClass: student.classLevel || student.class_name || targetClasses[0],
        passedSubjects,
        numPassed,
        isPassed
      };
    });
  }, [candidates, marksData, examLevel, targetClasses]);

  // Overall General Statistics
  const totalSat = studentPerformance.length;
  const totalPassed = studentPerformance.filter(s => s.isPassed).length;
  const passPercentage = totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(2) : '0.00';

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl shadow-2xl">
      {/* Top Controls & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-emerald-400">🎓 General Education Mock Dashboard</h2>
          <p className="text-xs text-slate-400">
            School: <strong className="text-white">{schoolDetails.school_name || 'Active Tenant'}</strong> | Academic Year: <strong className="text-white">{currentAcademicYear}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('compiled')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'compiled' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Compiled MINSEC
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Live Mark Sheet
            </button>
          </div>

          {/* Pre-Mock / Mock Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setExamType('PRE_MOCK')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examType === 'PRE_MOCK' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Pre-Mock
            </button>
            <button
              onClick={() => setExamType('MOCK')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examType === 'MOCK' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Mock
            </button>
          </div>

          {/* Level Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setExamLevel('O_LEVEL')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examLevel === 'O_LEVEL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Form 5 (O-Level)
            </button>
            <button
              onClick={() => setExamLevel('A_LEVEL')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examLevel === 'A_LEVEL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Upper Sixth (A-Level)
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading candidate records...</div>
      ) : viewMode === 'compiled' ? (
        /* 1. COMPILED MINSEC BROAD SHEET VIEW */
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-300 text-xs border-b border-slate-700">
                <th className="p-3">N°</th>
                <th className="p-3">Candidate Name</th>
                <th className="p-3">Class / Series</th>
                <th className="p-3">Passed Subjects & Grades (Highest to Lowest)</th>
                <th className="p-3 text-center">Total Passed</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentPerformance.length > 0 ? (
                studentPerformance.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-semibold text-white">{student.name}</td>
                    <td className="p-3 text-slate-400">{student.studentClass}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {student.passedSubjects.length > 0 ? (
                          student.passedSubjects.map(sub => (
                            <span key={sub.subject_name} className="px-2 py-0.5 text-xs bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                              {sub.subject_name} ({sub.letter_grade})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Nil</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-center">{student.numPassed} Papers</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded ${student.isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {student.isPassed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No examination candidates found for {examLevel === 'O_LEVEL' ? 'Form 5 (O-Level)' : 'Upper Sixth (A-Level)'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* 2. LIVE SUBJECT MARK SHEET GRID VIEW */
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-300 text-xs border-b border-slate-700">
                <th className="p-3 border border-slate-700">N°</th>
                <th className="p-3 border border-slate-700 min-w-[180px]">Candidate Name</th>
                {(activeSubjects.length > 0 ? activeSubjects : subjectsList).map(subj => (
                  <th key={subj.id || subj.name || subj.code} className="p-2 border border-slate-700 text-center min-w-[80px]">
                    {subj.code || subj.name || subj.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.length > 0 ? (
                candidates.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 border border-slate-700 text-slate-500">{idx + 1}</td>
                    <td className="p-3 border border-slate-700 font-semibold text-white">
                      {student.full_name || student.name}
                    </td>
                    {(activeSubjects.length > 0 ? activeSubjects : subjectsList).map(subj => {
                      const subjName = subj.name || subj.title || subj.code;
                      const record = marksData[`${student.id}_${subjName}`];
                      const val = record ? record.mark_100 : '';
                      return (
                        <td key={subj.id || subjName} className="p-1 border border-slate-700 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={val}
                            onChange={(e) => handleScoreChange(student, subjName, e.target.value)}
                            onBlur={(e) => handleScoreBlur(student, subjName, e.target.value)}
                            placeholder="-"
                            className="w-16 bg-slate-950 border border-slate-700 rounded text-center py-1 font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={(activeSubjects.length > 0 ? activeSubjects.length : subjectsList.length) + 2} className="p-8 text-center text-slate-500 text-xs">
                    No candidates found to enter scores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* General Statistics Summary Footer */}
      <div className="mt-6 p-4 bg-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4 border border-slate-700">
        <div className="flex gap-6 text-sm">
          <div><span className="text-slate-400">Total Sat:</span> <strong className="text-white">{totalSat}</strong></div>
          <div><span className="text-slate-400">Total Passed:</span> <strong className="text-emerald-400">{totalPassed}</strong></div>
          <div><span className="text-slate-400">Overall Pass Rate:</span> <strong className="text-blue-400">{passPercentage}%</strong></div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg transition"
        >
          📄 Download MINSEC Broad Sheet PDF
        </button>
      </div>
    </div>
  );
}