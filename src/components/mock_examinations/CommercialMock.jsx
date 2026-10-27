import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import { COMMERCIAL_TRADE_SERIES } from '../../../app/admin-dashboard/page';
import {
  fetchMockMarks,
  saveMockMark,
  subscribeToMockMarks,
  calculateGradeFrom100,
  isPassingGrade
} from './mockExamService';

export default function CommercialMock({
  schoolId,
  userId,
  schoolDetails = {},
  studentsList = [],
  subjectsList = [],
  onClose
}) {
  const [examType, setExamType] = useState('MOCK'); // 'PRE_MOCK' or 'MOCK'
  const [examLevel, setExamLevel] = useState('Upper Sixth Commercial (BaCom)'); // CAPCom, ProCom, or BaCom
  const [selectedTrade, setSelectedTrade] = useState('ALL');
  const [viewMode, setViewMode] = useState('compiled'); // 'compiled' or 'grid'
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);

  // Single source of truth for academic year & section
  const currentAcademicYear = getCurrentAcademicYear();
  const sectionName = 'Technical Commercial (STT)';

  const targetClasses = useMemo(() => [examLevel], [examLevel]);

  // Filter student directory for Commercial exam candidates
  const candidates = useMemo(() => {
    return studentsList.filter(s => {
      const studentLevel = s.classLevel || s.class_name || '';
      const matchClass = studentLevel.includes(examLevel) || examLevel.includes(studentLevel);
      const matchTrade = selectedTrade === 'ALL' || s.trades_series === selectedTrade;
      return matchClass && matchTrade;
    });
  }, [studentsList, examLevel, selectedTrade]);

  // Load examination records from Supabase `mockmarks` table
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

  // Realtime subscription for live sync
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

  // Live score input handler (0-100 scale) with silent auto-save
  const handleScoreChange = (student, subjectName, rawValue) => {
    const numericVal = rawValue === '' ? '' : Math.min(100, Math.max(0, Number(rawValue) || 0));
    const grade = calculateGradeFrom100(numericVal, 'Technical Commercial');

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
    const grade = calculateGradeFrom100(numericVal, 'Technical Commercial');

    await saveMockMark({
      schoolId,
      studentId: student.id,
      matricule: student.matricule || '',
      section: sectionName,
      classLevel: student.classLevel || student.class_name || examLevel,
      tradesSeries: student.trades_series || null,
      subjectName,
      examType,
      mark100: numericVal,
      letterGrade: grade,
      userId
    });
  };

  // Performance calculations per candidate (highest to lowest passed modules)
  const studentPerformance = useMemo(() => {
    return candidates.map(student => {
      const studentMarks = Object.keys(marksData)
        .filter(k => k.startsWith(`${student.id}_`))
        .map(k => marksData[k]);

      const passedSubjects = studentMarks
        .filter(m => isPassingGrade(m.letter_grade, 'Technical Commercial'))
        .sort((a, b) => (Number(b.mark_100) || 0) - (Number(a.mark_100) || 0));

      const totalScore = studentMarks.reduce((acc, m) => acc + (Number(m.mark_100) || 0), 0);
      const avgScore = studentMarks.length > 0 ? (totalScore / studentMarks.length).toFixed(2) : '0.00';
      const isPassed = Number(avgScore) >= 50;

      return {
        ...student,
        name: student.full_name || student.name || 'Candidate',
        passedSubjects,
        avgScore,
        numPassed: passedSubjects.length,
        isPassed
      };
    });
  }, [candidates, marksData]);

  // General Statistics
  const totalSat = studentPerformance.length;
  const totalPassed = studentPerformance.filter(s => s.isPassed).length;
  const passPercentage = totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(2) : '0.00';

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl shadow-2xl">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-amber-400">💼 Technical Commercial (STT) Mock Dashboard</h2>
          <p className="text-xs text-slate-400">
            School: <strong className="text-white">{schoolDetails.school_name || 'Active Tenant'}</strong> | Academic Year: <strong className="text-white">{currentAcademicYear}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('compiled')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'compiled' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              Compiled MINSEC
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              Live Mark Sheet
            </button>
          </div>

          {/* Pre-Mock / Mock Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setExamType('PRE_MOCK')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examType === 'PRE_MOCK' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              Pre-Mock
            </button>
            <button
              onClick={() => setExamType('MOCK')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${examType === 'MOCK' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              Mock
            </button>
          </div>

          {/* Exam Level Filter */}
          <select
            value={examLevel}
            onChange={(e) => setExamLevel(e.target.value)}
            className="bg-slate-800 text-xs text-white border border-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
          >
            <option value="Fourth Year Commercial (CAPCom)">CAP Commercial (CAPCom)</option>
            <option value="Lower Sixth Commercial (ProCom)">Probatoire Commercial (ProCom)</option>
            <option value="Upper Sixth Commercial (BaCom)">Baccalauréat Commercial (BaCom)</option>
          </select>

          {/* Trade Specialty Filter */}
          <select
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
            className="bg-slate-800 text-xs text-white border border-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Commercial Specialties</option>
            {COMMERCIAL_TRADE_SERIES.map(trade => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>

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

      {/* Main Table Content */}
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
                <th className="p-3">Specialty</th>
                <th className="p-3">Passed Modules & Grades (Highest to Lowest)</th>
                <th className="p-3 text-center">Modules Passed</th>
                <th className="p-3 text-center">Overall Average (/100)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentPerformance.length > 0 ? (
                studentPerformance.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-semibold text-white">{student.name}</td>
                    <td className="p-3 text-slate-400">{student.trades_series || 'N/A'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {student.passedSubjects.length > 0 ? (
                          student.passedSubjects.map(sub => (
                            <span key={sub.subject_name} className="px-2 py-0.5 text-xs bg-amber-950 text-amber-300 rounded border border-amber-800">
                              {sub.subject_name} ({sub.letter_grade})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Nil</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold">{student.numPassed} Modules</td>
                    <td className="p-3 text-center font-bold text-amber-300">{student.avgScore}%</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded ${student.isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {student.isPassed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No candidates found for {examLevel} under specialty filter "{selectedTrade}".
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
                <th className="p-3 border border-slate-700 min-w-[120px]">Specialty</th>
                {subjectsList.map(subj => (
                  <th key={subj.id || subj.name} className="p-2 border border-slate-700 text-center min-w-[80px]">
                    {subj.code || subj.name}
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
                    <td className="p-3 border border-slate-700 text-slate-400 text-xs">
                      {student.trades_series || 'N/A'}
                    </td>
                    {subjectsList.map(subj => {
                      const subjName = subj.name || subj.title;
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
                            className="w-16 bg-slate-950 border border-slate-700 rounded text-center py-1 font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={subjectsList.length + 3} className="p-8 text-center text-slate-500 text-xs">
                    No candidates found to enter scores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-6 p-4 bg-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4 border border-slate-700">
        <div className="flex gap-6 text-sm">
          <div><span className="text-slate-400">Total Sat:</span> <strong className="text-white">{totalSat}</strong></div>
          <div><span className="text-slate-400">Total Passed:</span> <strong className="text-emerald-400">{totalPassed}</strong></div>
          <div><span className="text-slate-400">Overall Pass Rate:</span> <strong className="text-amber-400">{passPercentage}%</strong></div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-lg transition"
        >
          📄 Download Commercial Broad Sheet PDF
        </button>
      </div>
    </div>
  );
}