import { format, isThisYear, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

/** Human-friendly due label, e.g. "Today", "Tomorrow", "Mar 5", "Mar 5, 2027". */
export function formatDue(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null;
  const date = parseISO(dueDate);
  let day: string;
  if (isToday(date)) day = 'Today';
  else if (isTomorrow(date)) day = 'Tomorrow';
  else if (isYesterday(date)) day = 'Yesterday';
  else day = format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
  return dueTime ? `${day} · ${to12h(dueTime)}` : day;
}

/** "17:00" -> "5:00 PM". */
function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hh = h ?? 0;
  const period = hh >= 12 ? 'PM' : 'AM';
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}
