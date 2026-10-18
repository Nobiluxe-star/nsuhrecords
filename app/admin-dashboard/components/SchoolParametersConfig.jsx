'use client';

import { useState, useEffect } from 'react';

export default function SchoolParametersConfig({ activeSchool, deleteBanner, setDeleteBanner, getCurrentAcademicYear, supabase }) {
  // --- Form State ---
  const [schoolMotto, setSchoolMotto] = useState('');
  const [schoolRegion, setSchoolRegion] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [schoolContact, setSchoolContact] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [academicYearStartDate, setAcademicYearStartDate] = useState('');
  const [academicYearEndDate, setAcademicYearEndDate] = useState('');
  const [schoolLocation, setSchoolLocation] = useState('');
  const [schoolRules, setSchoolRules] = useState('');
  const [rulesFileUrl, setRulesFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Supabase Hydration ---
  useEffect(() => {
    let isMounted = true;

    async function loadSchoolDetailsFromSupabase() {
      const targetSchoolId = activeSchool?.school_id || activeSchool?.id;
      const targetName = activeSchool?.name || activeSchool?.institution_name;

      if (!targetSchoolId && !targetName) return;

      setIsLoading(true);

      try {
        let detailsData = null;

        if (targetSchoolId && supabase) {
          const { data, error } = await supabase
            .from('school_details')
            .select('*')
            .eq('school_id', targetSchoolId)
            .maybeSingle();

          if (!error && data) detailsData = data;
        }

        if (!detailsData && targetName && supabase) {
          const { data, error } = await supabase
            .from('school_details')
            .select('*')
            .ilike('name', `%${targetName}%`)
            .maybeSingle();

          if (!error && data) detailsData = data;
        }

        if (isMounted && detailsData) {
          const logo = detailsData.logo_url && detailsData.logo_url !== 'NULL' ? detailsData.logo_url : '';
          
          setSchoolMotto(detailsData.motto && detailsData.motto !== 'EMPTY' ? detailsData.motto : '');
          setSchoolRegion(detailsData.region && detailsData.region !== 'EMPTY' ? detailsData.region : '');
          setSchoolLogo(logo);
          setSchoolContact(detailsData.contact_line && detailsData.contact_line !== 'EMPTY' ? detailsData.contact_line : '');
          setSchoolEmail(detailsData.official_email && detailsData.official_email !== 'EMPTY' ? detailsData.official_email : '');
          setSchoolLocation(detailsData.address_location || detailsData.address || detailsData.location || '');
          setSchoolRules(detailsData.rules_and_regulations && detailsData.rules_and_regulations !== 'EMPTY' ? detailsData.rules_and_regulations : '');
          setRulesFileUrl(detailsData.rules_file_url && detailsData.rules_file_url !== 'EMPTY' ? detailsData.rules_file_url : '');
          setAcademicYearStartDate(detailsData.academic_year_start_date || '');
          setAcademicYearEndDate(detailsData.academic_year_end_date || '');

          if (typeof window !== 'undefined' && logo) {
            localStorage.setItem('active_school_logo', logo);
            window.dispatchEvent(new Event('school-logo-updated'));
          }
        }
      } catch (err) {
        console.error('Error fetching school details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSchoolDetailsFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [activeSchool, supabase]);

  // --- Handlers ---
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogo(reader.result);
        if (typeof window !== 'undefined') {
          localStorage.setItem('active_school_logo', reader.result);
          window.dispatchEvent(new Event('school-logo-updated'));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRulesFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRulesFileUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- Save Handler ---
 const handleSaveSchoolDetails = async (e) => {
  if (e) e.preventDefault();

  // Fallback to a default ID or name for testing as a public/guest user
  const targetSchoolId = activeSchool?.school_id || activeSchool?.id || 'demo-school-id';
  const targetName = activeSchool?.name || activeSchool?.institution_name || 'Demo School';

  if (!supabase) {
    if (typeof setDeleteBanner === 'function') {
      setDeleteBanner({ type: 'error', message: 'Database connection client unavailable.' });
    }
    return;
  }

  try {
    const payload = {
      school_id: targetSchoolId,
      name: targetName,
      logo_url: schoolLogo || '',
      motto: schoolMotto || '',
      region: schoolRegion || '',
      contact_line: schoolContact || '',
      official_email: schoolEmail || '',
      rules_and_regulations: schoolRules || '',
      rules_file_url: rulesFileUrl || '',
      academic_year_start_date: academicYearStartDate || null,
      academic_year_end_date: academicYearEndDate || null,
      address_location: schoolLocation || '',
      updated_at: new Date().toISOString()
    };

    let { error } = await supabase
      .from('school_details')
      .upsert(payload, { onConflict: 'school_id' });

    if (error) {
      if (typeof setDeleteBanner === 'function') {
        const customMessage = error.code === '42501' || error.message?.includes('row-level security')
          ? 'You do not have authorization to perform this action. Please log in or check permissions.'
          : 'Unable to save school details. Please try again or contact your administrator.';

        setDeleteBanner({ type: 'error', message: customMessage });
      }
    } else {
      if (typeof setDeleteBanner === 'function') {
        setDeleteBanner({ type: 'success', message: 'School parameters updated successfully!' });
        setTimeout(() => setDeleteBanner(null), 4000);
      }
    }
  } catch (err) {
    if (typeof setDeleteBanner === 'function') {
      setDeleteBanner({ type: 'error', message: 'Network error. Please try saving again.' });
    }
  }
};
  return (
    <div className="bg-[#0b1329] border border-gray-800 p-4 sm:p-8 rounded-2xl w-full max-w-7xl mx-auto shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h2 className="text-lg font-bold text-white">School Parameters & Configuration</h2>
        {isLoading && <span className="text-xs text-amber-400 animate-pulse font-medium">Fetching details...</span>}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Official Name</label>
          <input
            type="text"
            value={activeSchool?.name || activeSchool?.institution_name || ''}
            disabled
            className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Motto</label>
            <input
              type="text"
              value={schoolMotto}
              onChange={(e) => setSchoolMotto(e.target.value)}
              placeholder="e.g. Discipline, Hard Work, Success"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Region (MINSEC Delegation)</label>
            <input
              type="text"
              value={schoolRegion}
              onChange={(e) => setSchoolRegion(e.target.value)}
              placeholder="e.g. NORTH WEST REGION"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Official Logo</label>
          <div className="flex items-center space-x-4">
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt="School Logo Preview"
                className="h-16 w-16 object-cover rounded-lg border border-gray-700 bg-[#1f2937]"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-gray-900 hover:file:bg-amber-400 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Administrator Contact Line</label>
          <input
            type="text"
            value={schoolContact}
            onChange={(e) => setSchoolContact(e.target.value)}
            className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Official Email</label>
          <input
            type="email"
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            placeholder="e.g. admin@school.cm"
            className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Academic Year</label>
          <input
            type="text"
            value={activeSchool?.academic_year || (typeof getCurrentAcademicYear === 'function' ? getCurrentAcademicYear() : '2026/2027')}
            disabled
            readOnly
            className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Academic Year Start Date</label>
            <input
              type="date"
              value={academicYearStartDate}
              onChange={(e) => setAcademicYearStartDate(e.target.value)}
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Academic Year End Date</label>
            <input
              type="date"
              value={academicYearEndDate}
              onChange={(e) => setAcademicYearEndDate(e.target.value)}
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Address / Location</label>
          <input
            type="text"
            value={schoolLocation}
            onChange={(e) => setSchoolLocation(e.target.value)}
            className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">School Rules & Regulations</label>
          <textarea
            rows={6}
            value={schoolRules}
            onChange={(e) => setSchoolRules(e.target.value)}
            placeholder="Type, paste, or format internal school rules, policies, or code of conduct..."
            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:outline-none"
          />
        </div>

        <div className="bg-[#1f2937] p-3 rounded-lg border border-gray-700 mt-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Upload Official Rules Document (PDF / WORD — MAX 0.5MB)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleRulesFileUpload}
            className="block w-full text-xs text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
          {rulesFileUrl && (
            <p className="mt-2 text-xs text-green-400 font-medium truncate">
              Attached: {rulesFileUrl}
            </p>
          )}
        </div>
      </div>

      {deleteBanner && (
        <div className={`mb-4 p-4 rounded-xl flex items-center justify-between text-sm font-medium animate-fade-in ${
          deleteBanner.type === 'error' || deleteBanner.isError
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{typeof deleteBanner === 'string' ? deleteBanner : deleteBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteBanner && setDeleteBanner(null)}
            className="opacity-70 hover:opacity-100 text-xs uppercase tracking-wider font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSaveSchoolDetails}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg text-center"
      >
        Save Changes
      </button>
    </div>
  );
}