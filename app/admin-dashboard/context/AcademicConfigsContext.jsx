'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { fetchSchoolAcademicConfigs } from '../lib/academicConfigsStore';

import { 
  GENERAL_CLASSES_CATALOG, 
  TECHNICAL_COMMERCIAL_CATALOG, 
  TECHNICAL_INDUSTRIAL_CATALOG, 
  ALL_SUBJECTS_LIST,
  COMMERCIAL_TRADE_SERIES,
  INDUSTRIAL_TRADE_SERIES,
  GENERAL_SERIES_CATALOG
} from '../page';

const AcademicConfigsContext = createContext(null);

// Universal helper to deduplicate array values safely by name or code
const dedupeList = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    if (!item) return false;
    const nameStr = typeof item === 'string' ? item : (item.name || item.code || item.subject_name || '');
    const clean = String(nameStr).trim();
    if (!clean || seen.has(clean.toLowerCase())) return false;
    seen.add(clean.toLowerCase());
    return true;
  });
};

export function AcademicConfigsProvider({ children }) {
  const [configs, setConfigs] = useState({
    classesGen: [],
    classesComm: [],
    classesInd: [],
    subjects: [],
    trades: { commercial: [], industrial: [] },
    sections: []
  });
  const [loading, setLoading] = useState(true);

  const loadConfigs = async () => {
    setLoading(true);
    const data = await fetchSchoolAcademicConfigs();
    setConfigs(data || {});
    setLoading(false);
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // --- MERGED MASTER CATALOGS (Custom Supabase Entries + Project Defaults from page.jsx) ---
  const masterClassesGen = dedupeList([
    ...(configs.classesGen || []),
    ...(GENERAL_CLASSES_CATALOG || [])
  ]);

  const masterClassesComm = dedupeList([
    ...(configs.classesComm || []),
    ...(TECHNICAL_COMMERCIAL_CATALOG || [])
  ]);

  const masterClassesInd = dedupeList([
    ...(configs.classesInd || []),
    ...(TECHNICAL_INDUSTRIAL_CATALOG || [])
  ]);

  const masterSubjects = dedupeList([
    ...(configs.subjects || []),
    ...(ALL_SUBJECTS_LIST || [])
  ]);

  // Clean Merged Trades & Series
  const masterTradesComm = dedupeList([
    ...(configs.trades?.commercial || []),
    ...(COMMERCIAL_TRADE_SERIES || [])
  ]);

  const masterTradesInd = dedupeList([
    ...(configs.trades?.industrial || []),
    ...(INDUSTRIAL_TRADE_SERIES || [])
  ]);

  const masterGeneralSeries = GENERAL_SERIES_CATALOG || { ARTS: [], SCIENCE: [] };

  // Standard Sections
  const masterSections = dedupeList([
    ...(configs.sections || []),
    'General Education', 
    'Technical Commercial (STT)', 
    'Technical Industrial (IND)'
  ]);

  // --- CENTRALIZED APP-WIDE DROPDOWN HELPER FUNCTIONS ---

  // 1. Get Class Levels based strictly on SECTION
  const getClassLevelsBySection = (sectionName = '') => {
    const sec = String(sectionName).toLowerCase();
    if (sec.includes('commercial')) return masterClassesComm;
    if (sec.includes('industrial')) return masterClassesInd;
    if (sec.includes('both') || sec.includes('all')) {
      return dedupeList([...masterClassesGen, ...masterClassesComm, ...masterClassesInd]);
    }
    return masterClassesGen;
  };

  // 2. Get Trades or Series based on SECTION & CLASS LEVEL
  const getSeriesOrTrades = (sectionName = '', className = '') => {
    const sec = String(sectionName).toLowerCase();
    const cls = String(className).toLowerCase();

    // Commercial Trades/Series
    if (sec.includes('commercial')) return masterTradesComm;

    // Industrial Trades/Series
    if (sec.includes('industrial')) return masterTradesInd;

    // General Education Sixth Form Series
    if (cls.includes('sixth') || cls.includes('form 6') || cls.includes('l6') || cls.includes('u6')) {
      return [
        ...(masterGeneralSeries.ARTS || []),
        ...(masterGeneralSeries.SCIENCE || [])
      ];
    }

    return [];
  };

  // 3. Filter Subjects strictly by CATEGORY or SECTION
  const getSubjectsByCategoryOrSection = (categoryOrSection = '') => {
    const val = String(categoryOrSection).toLowerCase();
    if (!val || val.includes('all') || val.includes('both')) return masterSubjects;

    return masterSubjects.filter((subj) => {
      const cat = String(subj.category || '').toLowerCase();
      return cat.includes(val) || val.includes(cat);
    });
  };

  return (
    <AcademicConfigsContext.Provider 
      value={{ 
        masterClassesGen, 
        masterClassesComm, 
        masterClassesInd, 
        masterSubjects, 
        masterTradesComm,
        masterTradesInd,
        masterSections, 
        getClassLevelsBySection,
        getSeriesOrTrades,
        getSubjectsByCategoryOrSection,
        refreshConfigs: loadConfigs,
        loading 
      }}
    >
      {children}
    </AcademicConfigsContext.Provider>
  );
}

export function useAcademicConfigs() {
  return useContext(AcademicConfigsContext);
}
