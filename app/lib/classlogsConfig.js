export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://classlogs.cc';

/**
 * Generates custom parameter routing URLs for school onboarding and direct access.
 * e.g. https://classlogs.cc/school-name or https://classlogs.cc/signup?school_id=...
 */
export const getClasslogsUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${APP_BASE_URL}${cleanPath}`;
};

/**
 * Generates direct self-onboarding registration links for new administrators and staff.
 */
export const buildSchoolOnboardingLink = (schoolSlugOrId, role = 'admin') => {
  if (!schoolSlugOrId) return `${APP_BASE_URL}/newadminregister`;
  const params = new URLSearchParams({ school: schoolSlugOrId, role });
  return `${APP_BASE_URL}/signup?${params.toString()}`;
};