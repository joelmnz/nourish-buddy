/**
 * Get today's date in YYYY-MM-DD format using the browser's local timezone.
 * This avoids issues with toISOString() which uses UTC and can give the wrong date
 * for users in timezones ahead of or behind UTC.
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
