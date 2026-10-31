const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

// Days are stored as local YYYY-MM-DD so a purchase never shifts date with the time zone.
export function toDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return toDay(new Date(year, month - 1, date + amount));
}

export function toMonth(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, amount: number): string {
  const [year, index] = month.split('-').map(Number);
  return toMonth(toDay(new Date(year, index - 1 + amount, 1)));
}

export function formatMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return `${MONTHS[index - 1]} ${year}`;
}

export function formatDay(day: string): string {
  const [, month, date] = day.split('-').map(Number);
  return `${MONTHS[month - 1].slice(0, 3)} ${date}`;
}

export function formatRelativeDay(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return formatDay(day);
}
