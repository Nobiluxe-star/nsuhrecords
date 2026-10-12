import Dexie from 'dexie';

// Initialize ClassLogs IndexedDB instance
export const db = new Dexie('ClassLogsDB');

// Version 1 Schema - Mirrors Supabase PostgreSQL tables
db.version(1).stores({
  // Primary Student Registry (Mirrors Supabase 'students' table)
  students: 'id, school_id, unique_code, section, classLevel, trades_series, fullName, gender, guardian_phone, created_at',

  // Marks & Assessments (Mirrors Supabase 'marks' table)
  marks: '++id, student_id, school_id, subject_id, sequence, mark_value, term, academic_year, synced',

  // Class Coefficients & Subject Configs (Mirrors Supabase 'class_coefficients' table)
  class_coefficients: 'id, section, school_id, classLevel, subject_coefficients,trades_series, academic_year',

  // Teachers Catalog & Assignments (Mirrors Supabase 'teachers' table)
  teachers: 'teacher_id, school_id, name, contact, subjects, email',

  // Other Personnel (Bursar, Principal, Discipline Master)
  school_personnel: 'unique_id, school_id, full_name, phone, role',

  // School Information & Configuration
  school_details: 'school_id, school_name, region, contact_line, official_email',

  // Financial & Fee Records
  school_fees: '++id, student_id, school_id, amount_paid, fee_type, created_at, synced',

  // Master Lesson Logs / Progression Sheets
  lesson_logs: 'id, teacher_id, school_id, subject, classLevel, date_logged, synced',

  // Universal Offline Action Queue (Stores all pending offline POST/PUT/DELETE requests)
  pendingSyncQueue: '++id, action_type, table_name, payload, timestamp'
});