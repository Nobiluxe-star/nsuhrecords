import { supabase } from './supabase';

/**
 * Fetch mark lock status for a specific teacher with strict School ID isolation
 */
export async function getTeacherLockStatus(teacherId, schoolId) {
  if (!teacherId || !schoolId) return false;

  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('is_marks_locked')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching teacher lock status:', error.message);
      return false;
    }

    return data?.is_marks_locked ?? false;
  } catch (err) {
    console.error('Error fetching teacher lock status:', err?.message || String(err));
    return false;
  }
}

/**
 * Toggle mark lock status for a specific teacher scoped strictly by School ID
 */
export async function toggleTeacherLockStatus(teacherId, schoolId, isLocked) {
  if (!teacherId || !schoolId) return false;

  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_marks_locked: isLocked })
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error updating teacher lock status:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error toggling teacher lock status:', err?.message || String(err));
    return false;
  }
}

/**
 * Bulk update lock status for ALL teachers belonging to a specific school_id
 */
export async function toggleAllTeachersLockStatus(schoolId, isLocked) {
  if (!schoolId) return false;

  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_marks_locked: isLocked })
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error updating all teachers lock status:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error toggling all teachers lock status:', err?.message || String(err));
    return false;
  }
}

export const getMarkLockStatus = getTeacherLockStatus;
export const toggleMarkLockStatus = toggleTeacherLockStatus;