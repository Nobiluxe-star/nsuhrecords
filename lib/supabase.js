import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sets the active tenant school ID context in PostgreSQL for RLS policies
 * @param {string} schoolId - The active school_id for the session
 */
export const setSchoolContext = async (schoolId) => {
  if (!schoolId) return;
  const { error } = await supabase.rpc('set_school_context', { school_id_param: schoolId });
  if (error) {
    console.error('Failed to set school session context:', error);
  }
};