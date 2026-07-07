import { addDays, format, nextDay, type Day } from 'date-fns';
import { Priority } from '@todomaster/shared';
import { toLocalDay } from './task-queries';

/**
 * Heuristic natural-language parser for Quick Add, e.g. "Doctor tomorrow 5pm".
 *
 * This is the LOCAL implementation of the AI seam described in ARCHITECTURE.md
 * §9 (`AiPlanner`-style interface). It's a pure function — no I/O, no framework —
 * so it's trivially testable and swappable for an LLM-backed parser later without
 * touching any call site: same input/output shape, different implementation.
 *
 * Matched tokens are stripped from the input; whatever remains (trimmed, collapsed
 * whitespace) becomes the title. Order of extraction matters: priority/tag/list
 * markers are unambiguous (symbol-prefixed) and removed first, then date/time
 * phrases (which can span multiple words) are matched and removed.
 */

export interface QuickAddResult {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  tagNames: string[];
  listName: string | null;
}

const WEEKDAY_NAMES: Record<string, Day> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const PRIORITY_WORDS: Record<string, Priority> = {
  urgent: Priority.HIGH,
  'high priority': Priority.HIGH,
  'medium priority': Priority.MEDIUM,
  'low priority': Priority.LOW,
};

/** Removes a regex match from `text` and returns the remainder + matched groups. */
function extract(
  text: string,
  pattern: RegExp,
): { rest: string; match: RegExpMatchArray | null } {
  const match = text.match(pattern);
  if (!match) return { rest: text, match: null };
  const rest = text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length);
  return { rest, match };
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Parses "5pm", "5:30pm", "17:00", "at 5" into "HH:mm", or null if no match. */
function parseTime(text: string): { rest: string; time: string | null } {
  // "5:30pm" / "5:30 pm" / "17:30"
  const withMinutes = extract(text, /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (withMinutes.match) {
    const [, hStr, mStr, period] = withMinutes.match;
    const time = to24h(Number(hStr), Number(mStr), period);
    if (time) return { rest: collapseWhitespace(withMinutes.rest), time };
  }

  // "5pm" / "5 pm" / "at 5" (bare hour, am/pm optional if "at" present)
  const bareHour = extract(text, /\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i);
  if (bareHour.match) {
    const [, hStr, period] = bareHour.match;
    const time = to24h(Number(hStr), 0, period);
    if (time) return { rest: collapseWhitespace(bareHour.rest), time };
  }

  return { rest: text, time: null };
}

function to24h(hour: number, minute: number, period?: string): string | null {
  if (hour > 23 || minute > 59) return null;
  let h = hour;
  if (period) {
    const p = period.toLowerCase();
    if (p === 'pm' && h < 12) h += 12;
    if (p === 'am' && h === 12) h = 0;
  }
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Parses relative/named date phrases into an ISO "YYYY-MM-DD", or null. */
function parseDate(text: string, now: Date): { rest: string; date: string | null } {
  const lower = text.toLowerCase();

  if (/\btoday\b/.test(lower)) {
    return { rest: collapseWhitespace(extract(text, /\btoday\b/i).rest), date: toLocalDay(now) };
  }
  if (/\btomorrow\b/.test(lower)) {
    return {
      rest: collapseWhitespace(extract(text, /\btomorrow\b/i).rest),
      date: toLocalDay(addDays(now, 1)),
    };
  }
  if (/\byesterday\b/.test(lower)) {
    return {
      rest: collapseWhitespace(extract(text, /\byesterday\b/i).rest),
      date: toLocalDay(addDays(now, -1)),
    };
  }

  const inNDays = extract(text, /\bin\s+(\d+)\s+days?\b/i);
  if (inNDays.match) {
    const days = Number(inNDays.match[1]);
    return { rest: collapseWhitespace(inNDays.rest), date: toLocalDay(addDays(now, days)) };
  }

  const nextWeekday = extract(text, /\bnext\s+(\w+)\b/i);
  if (nextWeekday.match) {
    const day = WEEKDAY_NAMES[nextWeekday.match[1]?.toLowerCase() ?? ''];
    if (day !== undefined) {
      return {
        rest: collapseWhitespace(nextWeekday.rest),
        date: toLocalDay(nextDay(now, day)),
      };
    }
  }

  // Bare weekday name ("Friday") = the upcoming occurrence.
  const weekdayNames = Object.keys(WEEKDAY_NAMES).join('|');
  const bareWeekday = extract(text, new RegExp(`\\b(${weekdayNames})\\b`, 'i'));
  if (bareWeekday.match) {
    const day = WEEKDAY_NAMES[bareWeekday.match[1]?.toLowerCase() ?? ''];
    if (day !== undefined) {
      return {
        rest: collapseWhitespace(bareWeekday.rest),
        date: toLocalDay(nextDay(now, day)),
      };
    }
  }

  return { rest: text, date: null };
}

function parsePriority(text: string): { rest: string; priority: Priority } {
  const symbolic = extract(text, /(?:^|\s)!([1-3])\b/);
  if (symbolic.match) {
    const level = Number(symbolic.match[1]);
    const priority = level === 1 ? Priority.HIGH : level === 2 ? Priority.MEDIUM : Priority.LOW;
    return { rest: collapseWhitespace(symbolic.rest), priority };
  }

  for (const [phrase, priority] of Object.entries(PRIORITY_WORDS)) {
    const found = extract(text, new RegExp(`\\b${phrase}\\b`, 'i'));
    if (found.match) return { rest: collapseWhitespace(found.rest), priority };
  }

  return { rest: text, priority: Priority.NONE };
}

/** Extracts every #tag token (order preserved, case as typed). */
function parseTags(text: string): { rest: string; tagNames: string[] } {
  const tagNames: string[] = [];
  const rest = text.replace(/#(\w+)/g, (_, name: string) => {
    tagNames.push(name);
    return '';
  });
  return { rest: collapseWhitespace(rest), tagNames };
}

/** Extracts the first @list token, if any. */
function parseList(text: string): { rest: string; listName: string | null } {
  const found = extract(text, /@(\w+)/);
  return { rest: collapseWhitespace(found.rest), listName: found.match?.[1] ?? null };
}

/**
 * Parses free-text Quick Add input into structured task fields.
 * @param now Injected clock so date phrases are deterministic in tests.
 */
export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddResult {
  let rest = input;

  const tags = parseTags(rest);
  rest = tags.rest;

  const list = parseList(rest);
  rest = list.rest;

  const priority = parsePriority(rest);
  rest = priority.rest;

  const time = parseTime(rest);
  rest = time.rest;

  const date = parseDate(rest, now);
  rest = date.rest;

  return {
    title: collapseWhitespace(rest),
    dueDate: date.date,
    // A time only means something alongside a date; drop an orphaned time match.
    dueTime: date.date ? time.time : null,
    priority: priority.priority,
    tagNames: tags.tagNames,
    listName: list.listName,
  };
}

/** Human-readable summary of what will be created, for a live preview UI. */
export function formatQuickAddPreview(result: QuickAddResult): string[] {
  const parts: string[] = [];
  if (result.dueDate) {
    parts.push(result.dueTime ? `${result.dueDate} ${result.dueTime}` : result.dueDate);
  }
  if (result.priority !== Priority.NONE) parts.push(`priority: ${result.priority}`);
  if (result.listName) parts.push(`list: ${result.listName}`);
  parts.push(...result.tagNames.map((t) => `#${t}`));
  return parts;
}

// Re-exported for the UI to format the resolved date consistently.
export { format as formatDate };
