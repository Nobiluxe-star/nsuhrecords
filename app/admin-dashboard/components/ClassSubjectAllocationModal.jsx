'use client';

import React, { useMemo, useState } from 'react';

export default function ClassSubjectAllocationModal({
  isOpen,
  onClose,
  teachers = [],
  schoolName = 'School Subject Allocation Sheet'
}) {
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Group all teacher assignments by Class -> Subject (+ Series) -> Assigned Teacher(s)
  const groupedByClass = useMemo(() => {
    const classMap = {};

    const registerAllocation = (rawClass, rawSubject, teacherName, seriesName = '') => {
      const cleanClass = String(rawClass || '').trim();
      const cleanSub = String(rawSubject || '').trim();
      if (!cleanClass || !cleanSub) return;

      if (!classMap[cleanClass]) {
        classMap[cleanClass] = {};
      }

      const cleanSeries = String(seriesName || '').trim();
      const subKey = `${cleanSub.toLowerCase()}__${cleanSeries.toLowerCase()}`;

      if (!classMap[cleanClass][subKey]) {
        classMap[cleanClass][subKey] = {
          subject: cleanSub,
          series: cleanSeries,
          teachers: new Set()
        };
      }

      if (teacherName) {
        classMap[cleanClass][subKey].teachers.add(teacherName);
      }
    };

    (teachers || []).forEach((t) => {
      const tName = t.name || t.fullName || t.full_name || 'Unnamed Teacher';

      // 1. Read from teacher schedules / timetable
      const schedules = t.schedules || t.schedule || t.timetable || {};
      if (schedules && typeof schedules === 'object' && !Array.isArray(schedules)) {
        Object.entries(schedules).forEach(([subjectKey, slots]) => {
          if (Array.isArray(slots)) {
            slots.forEach((slot) => {
              const cls = slot.className || slot.classLevel || slot.class || slot.class_name || '';
              const ser = slot.series || slot.trades_series || slot.option || '';
              registerAllocation(cls, subjectKey, tName, ser);
            });
          }
        });
      }

      // 2. Read from teacher assignments array
      const assignments = t.assignments || t.class_assignments || t.assigned_classes || [];
      if (Array.isArray(assignments)) {
        assignments.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            const cls = item.class || item.class_level || item.classLevel || item.className || '';
            const sub = item.subject || item.subject_name || item.name || '';
            const ser = item.series || item.trades_series || item.option || '';
            registerAllocation(cls, sub, tName, ser);
          }
        });
      }
    });

    return Object.keys(classMap)
      .sort((a, b) => a.localeCompare(b))
      .map((className) => {
        const subjects = Object.values(classMap[className])
          .map((entry) => ({
            ...entry,
            teachersList: Array.from(entry.teachers)
          }))
          .sort((a, b) => a.subject.localeCompare(b.subject));

        return { className, subjects };
      });
  }, [teachers]);

  const filteredClasses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return groupedByClass
      .filter((c) => selectedClassFilter === 'ALL' || c.className === selectedClassFilter)
      .map((c) => {
        if (!q) return c;
        const matchingSubjects = c.subjects.filter(
          (s) =>
            s.subject.toLowerCase().includes(q) ||
            s.series.toLowerCase().includes(q) ||
            s.teachersList.some((tn) => tn.toLowerCase().includes(q)) ||
            c.className.toLowerCase().includes(q)
        );
        return { ...c, subjects: matchingSubjects };
      })
      .filter((c) => c.subjects.length > 0);
  }, [groupedByClass, selectedClassFilter, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center overflow-y-auto p-3 sm:p-6 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .allocation-print-sheet,
          .allocation-print-sheet * {
            visibility: visible;
          }
          .allocation-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP TOOLBAR (HIDDEN WHEN PRINTING) */}
      <div className="no-print w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white sticky top-2 z-10 shadow-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-emerald-400">
            📋 Class-by-Class Assigned Subjects &amp; Teachers
          </h2>
          <p className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredClasses.length}</strong> classes with allocated subjects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-emerald-500 focus:outline-none max-w-[190px]"
          >
            <option value="ALL">All Classes ({groupedByClass.length})</option>
            {groupedByClass.map((c) => (
              <option key={c.className} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search class, subject, or teacher..."
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow"
          >
            🖨️ Print Sheet
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>

      {/* WHITE BACKGROUND SUMMARY SHEET */}
      <div className="allocation-print-sheet w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 p-5 sm:p-8 space-y-6 print:shadow-none print:border-none print:rounded-none print:p-4">
        <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
              {schoolName} — Assigned Subjects by Class
            </h1>
            <p className="text-xs text-slate-600">
              Complete summary of subjects allocated per class and their assigned teachers
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 border border-slate-300 px-3 py-1 rounded-lg text-slate-800 self-start">
            Total Classes: {filteredClasses.length}
          </span>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm italic">
            No assigned subjects found matching your filter.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredClasses.map((clsBlock) => (
              <div
                key={clsBlock.className}
                className="border border-slate-300 rounded-xl overflow-hidden break-inside-avoid"
              >
                {/* Class Header Bar */}
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase">
                    {clsBlock.className}
                  </h3>
                  <span className="text-xs text-slate-300">
                    Allocated Subjects: <strong className="text-white">{clsBlock.subjects.length}</strong>
                  </span>
                </div>

                {/* Orderly Table of Subjects & Teachers */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-3 w-12 text-center">#</th>
                      <th className="py-2 px-3">Subject Allocated</th>
                      <th className="py-2 px-3 w-36">Series / Option</th>
                      <th className="py-2 px-3">Assigned Teacher(s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {clsBlock.subjects.map((sub, idx) => {
                      const isMultipleTeachers = sub.teachersList.length > 1;

                      return (
                        <tr
                          key={`${clsBlock.className}_${sub.subject}_${idx}`}
                          className={isMultipleTeachers ? 'bg-amber-50/70' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {sub.subject}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {sub.series || '—'}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{sub.teachersList.join(', ')}</span>
                              {isMultipleTeachers && (
                                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                                  {sub.teachersList.length} Teachers
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}