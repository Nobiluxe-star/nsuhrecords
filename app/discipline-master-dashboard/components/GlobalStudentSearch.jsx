'use client';

import React, { useState } from 'react';
import { Search, X, User, ShieldAlert, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { db as supabase } from '../../../lib/db';

export default function GlobalStudentSearch({ schoolId, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', schoolId)
          .or(`full_name.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%,unique_id.ilike.%${searchTerm}%`)
          .limit(10);

        if (data) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } else {
        // Search cached local rosters when offline
        const cachedResults = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(`students_${schoolId}`)) {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const matches = list.filter(st => 
              (st.full_name || st.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (st.student_id || st.unique_id || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            cachedResults.push(...matches);
          }
        }
        setSearchResults(cachedResults.slice(0, 10));
      }
    } catch (err) {
      console.warn('Search query error, checking offline store:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="bg-[#2D5A27] text-amber-100 p-4 flex justify-between items-center border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-amber-300" />
            <h3 className="text-sm font-black tracking-wide uppercase">Global School Student Lookup</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition bg-emerald-800/50 p-1.5 rounded-lg text-xs font-bold"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by Student Full Name, Matricule, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#2D5A27] focus:outline-none shadow-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#2D5A27] hover:bg-emerald-800 text-amber-100 font-bold px-5 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </form>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {isSearching ? (
            <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <RefreshCw size={16} className="animate-spin text-[#2D5A27]" />
              <span>Scanning school-wide student database...</span>
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
              No student found matching "<span className="font-bold text-slate-600">{searchTerm}</span>" across any department.
            </div>
          ) : !hasSearched ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Enter a student name or unique ID above to search across General Education, Commercial, and Industrial departments.
            </div>
          ) : (
            searchResults.map((st) => (
              <div 
                key={st.id || st.student_id} 
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#2D5A27] transition shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2D5A27] flex items-center justify-center font-black text-sm border border-emerald-200">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{st.full_name || st.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Class: <span className="font-bold text-slate-800">{st.classLevel || st.class_name || 'N/A'}</span> • ID: <span className="font-mono font-bold text-[#2D5A27]">{st.student_id || st.unique_id || 'ID Pending'}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                      Section: {st.section || 'General Education'} {st.trade_series ? `(${st.trade_series})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <button
                    onClick={() => {
                      alert(`Selected student: ${st.full_name || st.name}. You can register a misconduct incident in the Misconduct Registry tab.`);
                      onClose();
                    }}
                    className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm"
                  >
                    <ShieldAlert size={12} />
                    <span>Log Misconduct</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}