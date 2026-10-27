import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';

/**
 * Service to manage database operations and real-time listeners for Pre-Mock and Mock examinations.
 * Uses the `mockmarks` table with full multi-tenant isolation via `school_id`.
 * Supports General Education, Technical Commercial (STT), and Technical Industrial (IND).
 */

// 1. Fetch marks for specific exam scope
export async function fetchMockMarks({ schoolId, section, classLevels, examType }) {
  if (!schoolId || !section || !classLevels || classLevels.length === 0) return [];

  const currentYear = getCurrentAcademicYear();

  const { data, error } = await supabase
    .from('mockmarks')
    .select('*')
    .eq('school_id', schoolId)
    .eq('section', section)
    .eq('exam_type', examType)
    .eq('academic_year', currentYear)
    .in('classLevel', classLevels);

  if (error) {
    console.error('Error fetching mock marks:', error.message);
    return [];
  }

  return data || [];
}

// 2. Live upsert mark record
export async function saveMockMark({
  schoolId,
  studentId,
  matricule,
  section,
  classLevel,
  tradesSeries = null,
  subjectName,
  examType,
  mark100,
  letterGrade,
  userId
}) {
  if (!schoolId || !studentId || !subjectName || !examType) return null;

  const currentYear = getCurrentAcademicYear();

  const payload = {
    school_id: schoolId,
    student_id: studentId,
    matricule,
    section,
    classLevel,
    trades_series: tradesSeries,
    subject_name: subjectName,
    exam_type: examType,
    academic_year: currentYear,
    mark_100: Number(mark100) || 0,
    letter_grade: letterGrade,
    updated_by: userId,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('mockmarks')
    .upsert(payload, {
      onConflict: 'school_id,student_id,subject_name,exam_type,academic_year'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving mock mark:', error.message);
    return null;
  }

  return data;
}

// 3. Realtime listener for live updates across connected clients
export function subscribeToMockMarks({ schoolId, section, examType, onUpdate }) {
  if (!schoolId) return () => {};

  const channelName = `mockmarks_realtime_${schoolId}_${examType}`;

  const subscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, and DELETE
        schema: 'public',
        table: 'mockmarks',
        filter: `school_id=eq.${schoolId}`
      },
      (payload) => {
        if (payload.new && payload.new.section === section && payload.new.exam_type === examType) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  // Return unsubscribe cleanup function
  return () => {
    supabase.removeChannel(subscription);
  };
}

/**
 * 4. Comprehensive Helper to compute letter grades across all 3 Cameroonian Sections:
 * - General Education O-Level (Forms 1–5): A, B, C (Passes) | D, E, U (Fails)
 * - General Education A-Level (Lower/Upper Sixth): A, B, C, D, E (Passes) | O (Subsidiary) | F (Fail)
 * - Technical Commercial (STT) & Technical Industrial (IND):
 *     16-20 (80-100%): A | 14-15.99 (70-79%): B | 12-13.99 (60-69%): C | 10-11.99 (50-59%): D | 8-9.99 (40-49%): E | <8 (<40%): F
 *
 * @param {number|string} score - Score out of 100
 * @param {string} section - 'General Education', 'Technical Commercial', or 'Technical Industrial'
 * @param {boolean} isALevel - True if class is Upper Sixth or Lower Sixth
 */
export function calculateGradeFrom100(score, section = 'General Education', isALevel = false) {
  const mark = Number(score);
  if (isNaN(mark) || score === null || score === undefined) {
    return isALevel ? 'F' : 'U';
  }

  // TECHNICAL SECTIONS: Commercial (STT) & Industrial (IND)
  if (section === 'Technical Commercial' || section === 'Technical Industrial' || section === 'STT' || section === 'IND') {
    if (mark >= 80) return 'A'; // 16-20/20
    if (mark >= 70) return 'B'; // 14-15.99/20
    if (mark >= 60) return 'C'; // 12-13.99/20
    if (mark >= 50) return 'D'; // 10-11.99/20 (Baseline Pass)
    if (mark >= 40) return 'E'; // 8-9.99/20
    return 'F';                 // Below 8/20
  }

  // GENERAL EDUCATION: A-Level
  if (isALevel) {
    if (mark >= 80) return 'A';
    if (mark >= 70) return 'B';
    if (mark >= 60) return 'C';
    if (mark >= 50) return 'D';
    if (mark >= 40) return 'E';
    if (mark >= 30) return 'O'; // Subsidiary Pass
    return 'F';                 // Fail
  }

  // GENERAL EDUCATION: O-Level
  if (mark >= 80) return 'A';
  if (mark >= 70) return 'B';
  if (mark >= 50) return 'C'; // Baseline Pass
  if (mark >= 40) return 'D';
  if (mark >= 30) return 'E';
  return 'U';                 // Fail / Unclassified
}

/**
 * 5. Helper to verify if a letter grade is considered a PASS per section/level
 */
export function isPassingGrade(grade, section = 'General Education', isALevel = false) {
  if (!grade) return false;
  const g = String(grade).toUpperCase();

  if (section === 'Technical Commercial' || section === 'Technical Industrial' || section === 'STT' || section === 'IND') {
    return ['A', 'B', 'C', 'D'].includes(g); // >= 10/20 (50/100)
  }

  if (isALevel) {
    return ['A', 'B', 'C', 'D', 'E'].includes(g); // Subsidiary 'O' and 'F' excluded from full passes
  }

  return ['A', 'B', 'C'].includes(g); // O-Level passes are A, B, C only
}