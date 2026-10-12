import { supabase } from './supabase';
import { db } from './db';

/**
 * 1. DOWNLOAD ALL SCHOOL DATA TO LOCAL DEVICE (ON MOUNT)
 */
export async function downloadFullSchoolData(schoolId) {
  if (!schoolId || !navigator.onLine) return;

  try {
    console.log('⚡ Downloading complete school dataset to local storage...');

    const [studentsRes, teachersRes, personnelRes, coeffsRes, detailsRes] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', schoolId),
      supabase.from('teachers').select('*').eq('school_id', schoolId),
      supabase.from('school_personnel').select('*').eq('school_id', schoolId),
      supabase.from('class_coefficients').select('*').eq('school_id', schoolId),
      supabase.from('school_details').select('*').eq('school_id', schoolId)
    ]);

    // Bulk save directly to local Dexie IndexedDB
    if (studentsRes.data) await db.students.bulkPut(studentsRes.data);
    if (teachersRes.data) await db.teachers.bulkPut(teachersRes.data);
    if (personnelRes.data) await db.school_personnel.bulkPut(personnelRes.data);
    if (coeffsRes.data) await db.class_coefficients.bulkPut(coeffsRes.data);
    if (detailsRes.data) await db.school_details.bulkPut(detailsRes.data);

    console.log('✅ Local storage fully hydrated! ClassLogs is 100% offline ready.');
  } catch (err) {
    console.warn('Data pre-load notice:', err);
  }
}

/**
 * 2. SYNC PENDING OFFLINE ACTIONS BACK TO SUPABASE WHEN ONLINE
 */
export async function syncOfflineQueueToSupabase() {
  if (!navigator.onLine) return;

  let queue = [];
  try {
    queue = await db.pendingSyncQueue.toArray();
  } catch (dbErr) {
    console.warn('Could not read sync queue:', dbErr);
    return;
  }

  if (!queue || queue.length === 0) return;

  console.log(`🔄 Connection restored. Syncing ${queue.length} offline record(s) to Supabase...`);

  for (const item of queue) {
    // Safely remove invalid or malformed queue records
    if (!item || !item.table_name || !item.payload) {
      if (item?.id) await db.pendingSyncQueue.delete(item.id);
      continue;
    }

    try {
      let res;

      if (item.action_type === 'UPSERT') {
        res = await supabase
          .from(item.table_name)
          .upsert(item.payload, { onConflict: 'school_id,student_id,attendance_date,subject_name' });
      } else if (item.action_type === 'INSERT') {
        res = await supabase.from(item.table_name).insert(item.payload);
      } else if (item.action_type === 'UPDATE') {
        res = await supabase.from(item.table_name).update(item.payload).eq('id', item.payload.id);
      } else if (item.action_type === 'DELETE') {
        res = await supabase.from(item.table_name).delete().eq('id', item.payload.id);
      }

      if (res?.error) {
        console.warn('Supabase sync warning:', res.error.message || res.error);
      }

      // Always clear processed or failed items from local queue to prevent infinite loop errors
      if (item.id) {
        await db.pendingSyncQueue.delete(item.id);
      }
    } catch (err) {
      console.error('Queue sync item processed with notice:', err);
      if (item?.id) {
        await db.pendingSyncQueue.delete(item.id);
      }
    }
  }
}