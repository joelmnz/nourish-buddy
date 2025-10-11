export function formatTime24hTo12h(time24h: string): string {
  const parts = time24h.split(':');
  if (parts.length !== 2) throw new Error('Invalid 24-hour time format');
  
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatTime12hTo24h(time12h: string): string {
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error('Invalid 12-hour time format');
  }
  
  const hoursStr = match[1]!;
  const minutesStr = match[2]!;
  const period = match[3]!;
  
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

export function subtractDays(date: string, days: number): string {
  return addDays(date, -days);
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

export function isValidTime24h(time: string): boolean {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  
  const hoursStr = match[1];
  const minutesStr = match[2];
  if (!hoursStr || !minutesStr) return false;
  
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}
