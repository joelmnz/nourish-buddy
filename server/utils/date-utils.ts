/**
 * Get today's date in YYYY-MM-DD format using the server's local timezone.
 * This avoids issues with toISOString() which uses UTC and can give the wrong date
 * for servers in timezones ahead of or behind UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
