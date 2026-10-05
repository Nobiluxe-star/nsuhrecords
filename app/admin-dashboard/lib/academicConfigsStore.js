import { supabase } from '../../../lib/supabase';

/**
 * Centralized Single Source of Truth loader for all school configurations.
 * Guarantees that Registration, Teacher Assignments, Mark Sheets, and Attendance share identical lists.
 */
export async function fetchSchoolAcademicConfigs() {
  const schoolId = 
    (typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null) || 
    (typeof window !== 'undefined' ? localStorage.getItem('activeSchoolId') : null) || 
    (typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null);

  const cacheKey = `cached_academic_configs_${schoolId || 'default'}`;

  try {
    if (!schoolId) {
      throw new Error('No active school ID found in session.');
    }

    // Ensure RLS school scope is set if applicable
    try {
      await supabase.rpc('set_active_school', { school_id: schoolId });
    } catch (e) {
      // Non-blocking fallback if RPC is not defined
    }

    // Fetch live from Supabase, maintaining exact sequential order
    const { data, error } = await supabase
      .from('school_academic_configs')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (data) {
      // Safe LocalStorage Caching with Auto-Pruning
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (storageErr) {
          if (storageErr.name === 'QuotaExceededError' || storageErr.code === 22) {
            console.warn('LocalStorage quota exceeded. Pruning stale config caches...');
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('cached_academic_configs_')) {
                localStorage.removeItem(key);
              }
            });
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (retryErr) {
              console.warn('Failed to cache configurations:', retryErr);
            }
          }
        }
      }
      return parseConfigsToCatalogs(data);
    }
  } catch (err) {
    console.warn('Network offline or fetch failed. Loading from localStorage cache:', err);
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return parseConfigsToCatalogs(JSON.parse(cached));
        } catch (e) {
          console.error('Failed to parse cached configs:', e);
        }
      }
    }
  }

  return {
    classesGen: [],
    classesComm: [],
    classesInd: [],
    subjects: [],
    trades: { commercial: [], industrial: [] },
    sections: []
  };
}

export function parseConfigsToCatalogs(rows = []) {
  const classesGen = [];
  const classesComm = [];
  const classesInd = [];
  const subjects = [];
  const trades = { commercial: [], industrial: [] };
  const sections = [];

  rows.forEach((row) => {
    const cleanName = (row.name || row.trade_series || '').trim();
    if (!cleanName) return;

    const rawConfigType = row.config_type || '';
    const section = (row.section || '').toLowerCase();

    // 1. Class Levels
    if (rawConfigType === 'classLevel' || rawConfigType === 'class_level' || rawConfigType === 'classlevel') {
      if (section.includes('commercial')) {
        classesComm.push(cleanName);
      } else if (section.includes('industrial')) {
        classesInd.push(cleanName);
      } else {
        classesGen.push(cleanName);
      }
    } 
    // 2. Subjects (Preserves Category and Coefficient)
    else if (rawConfigType === 'subject') {
      const category = (row.category === 'General Education' || !row.category) 
        ? 'General Core Subjects' 
        : row.category;

      subjects.push({
        id: row.id,
        name: cleanName,
        category: category,
        coefficient: Number(row.coefficient || row.coeff || row.coef || 1)
      });
    } 
    // 3. Trade Series
    else if (rawConfigType === 'tradeSeries' || rawConfigType === 'trade_series' || rawConfigType === 'tradeseries') {
      if (section.includes('industrial')) {
        trades.industrial.push(cleanName);
      } else {
        trades.commercial.push(cleanName);
      }
    } 
    // 4. Sections
    else if (rawConfigType === 'section') {
      sections.push(cleanName);
    }
  });

  return { classesGen, classesComm, classesInd, subjects, trades, sections };
}