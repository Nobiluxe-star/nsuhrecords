/**
 * Single source of truth for academic year calculation in Cameroon secondary schools.
 * Rules: The academic year flips on September 1st of every year.
 * Example: 
 * - Aug 31, 2026 -> 2025/2026
 * - Sep 01, 2026 -> 2026/2027
 */
export function getCurrentAcademicYear(customDate = new Date()) {
  const date = new Date(customDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = January, 8 = September
  const day = date.getDate();

  if (month < 8 || (month === 8 && day < 1)) {
    return `${year - 1}/${year}`;
  }

  return `${year}/${year + 1}`;
}