'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// Make sure these match the EXACT file names in your components folder
import GeneralStudentReportCard from './GeneralStudentReportCard';
import TechnicalCommercialReportCard from './TechnicalCommercialReportCard';
import TechnicalIndustrialReportCard from './TechnicalIndustrialReportCard';
export const dynamic = 'force-dynamic';

function StudentDashboardRouter() {
  const searchParams = useSearchParams();
  const [studentData, setStudentData] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  useEffect(() => {
    async function initDashboard() {
      setIsLoading(true);

      const schoolId = searchParams.get('school_id');
      const studentRowId = searchParams.get('row_id');
      const studentCode =
        searchParams.get('unique_code') ||
        searchParams.get('id') ||
        searchParams.get('code') ||
        searchParams.get('student_id');
      const urlSchoolName = searchParams.get('school_name');

      if (!schoolId && !urlSchoolName && !studentCode) {
        setIsUnauthenticated(true);
        setIsLoading(false);
        return;
      }

      setIsUnauthenticated(false);

      if (schoolId) {
        try {
          await supabase.rpc('set_active_school', { school_id: schoolId });
        } catch (e) {
          // Fallback if RLS session function is not present
        }
      }

      // 1. Fetch School Details
      let schoolQuery = supabase.from('school_details').select('*');
      if (schoolId) {
        schoolQuery = schoolQuery.eq('school_id', schoolId);
      } else if (urlSchoolName) {
        schoolQuery = schoolQuery.ilike('name', urlSchoolName);
      }

      const { data: schoolRes } = await schoolQuery.maybeSingle();
      if (schoolRes) setSchoolData(schoolRes);

      // 2. Fetch Student Details
      let profile = null;
      if (studentRowId) {
        const { data } = await supabase.from('students').select('*').eq('id', studentRowId).maybeSingle();
        profile = data;
      }

      if (!profile && studentCode) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .or(`unique_code.eq."${studentCode}",code.eq."${studentCode}",student_id.eq."${studentCode}"`)
          .maybeSingle();
        profile = data;
      }

      if (profile) {
        setStudentData(profile);
      }

      setIsLoading(false);
    }

    initDashboard();
  }, [searchParams]);

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-300 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600">No student parameters found. Please log in through the portal with your Unique ID.</p>
          <a href="/" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition">Return to Login</a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading Student Record...</p>
      </div>
    );
  }

  // Determine section type from student database fields
  const sectionType = (
    studentData?.section ||
    studentData?.academic_section ||
    studentData?.education_type ||
    'General'
  ).toLowerCase();

  // Route to proper component based on program classification
  if (sectionType.includes('commercial') || sectionType.includes('tech_com')) {
    return <TechnicalCommercialReportCard student={studentData} school={schoolData} searchParams={searchParams} />;
  }

  if (sectionType.includes('industrial') || sectionType.includes('tech_ind')) {
    return <TechnicalIndustrialReportCard student={studentData} school={schoolData} searchParams={searchParams} />;
  }

  // Default fallback: General Education Report Card
  return <GeneralStudentReportCard student={studentData} school={schoolData} searchParams={searchParams} />;
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm font-medium">Loading Student Portal...</div>}>
      <StudentDashboardRouter />
    </Suspense>
  );
}