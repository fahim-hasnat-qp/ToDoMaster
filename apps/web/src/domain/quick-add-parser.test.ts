import { describe, expect, it } from 'vitest';
import { Priority } from '@todomaster/shared';
import { parseQuickAdd } from './quick-add-parser';
import { toLocalDay } from './task-queries';

// Fixed reference "now": Sunday, July 5, 2026.
const NOW = new Date(2026, 6, 5, 9, 0, 0);

describe('parseQuickAdd', () => {
  it('parses the canonical example: title + relative date + time', () => {
    const result = parseQuickAdd('Doctor tomorrow 5pm', NOW);
    expect(result.title).toBe('Doctor');
    expect(result.dueDate).toBe(toLocalDay(new Date(2026, 6, 6)));
    expect(result.dueTime).toBe('17:00');
  });

  it('parses "today" and "yesterday"', () => {
    expect(parseQuickAdd('Standup today', NOW).dueDate).toBe(toLocalDay(NOW));
    expect(parseQuickAdd('Retro yesterday', NOW).dueDate).toBe(
      toLocalDay(new Date(2026, 6, 4)),
    );
  });

  it('parses "in N days"', () => {
    const result = parseQuickAdd('Follow up in 3 days', NOW);
    expect(result.title).toBe('Follow up');
    expect(result.dueDate).toBe(toLocalDay(new Date(2026, 6, 8)));
  });

  it('parses "next <weekday>"', () => {
    const result = parseQuickAdd('Team sync next monday', NOW);
    expect(result.title).toBe('Team sync');
    expect(result.dueDate).toBe(toLocalDay(new Date(2026, 6, 6))); // Monday after Sun Jul 5
  });

  it('parses a bare weekday as the upcoming occurrence', () => {
    const result = parseQuickAdd('Report friday', NOW);
    expect(result.dueDate).toBe(toLocalDay(new Date(2026, 6, 10))); // next Friday
  });

  it('parses 24h time and minutes', () => {
    expect(parseQuickAdd('Call today 17:30', NOW).dueTime).toBe('17:30');
    expect(parseQuickAdd('Call today 9:05am', NOW).dueTime).toBe('09:05');
  });

  it('drops a time with no accompanying date', () => {
    const result = parseQuickAdd('Call at 5pm', NOW);
    expect(result.dueDate).toBeNull();
    expect(result.dueTime).toBeNull();
    expect(result.title).toBe('Call');
  });

  it('parses symbolic priority markers !1/!2/!3', () => {
    expect(parseQuickAdd('Fix bug !1', NOW).priority).toBe(Priority.HIGH);
    expect(parseQuickAdd('Fix bug !2', NOW).priority).toBe(Priority.MEDIUM);
    expect(parseQuickAdd('Fix bug !3', NOW).priority).toBe(Priority.LOW);
    expect(parseQuickAdd('Fix bug !1', NOW).title).toBe('Fix bug');
  });

  it('parses the word "urgent" as high priority', () => {
    const result = parseQuickAdd('urgent server down', NOW);
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.title).toBe('server down');
  });

  it('extracts #tag tokens', () => {
    const result = parseQuickAdd('Plan trip #vacation #family', NOW);
    expect(result.tagNames).toEqual(['vacation', 'family']);
    expect(result.title).toBe('Plan trip');
  });

  it('extracts an @list token', () => {
    const result = parseQuickAdd('Buy milk @shopping', NOW);
    expect(result.listName).toBe('shopping');
    expect(result.title).toBe('Buy milk');
  });

  it('combines date, time, priority, tag, and list in one input', () => {
    const result = parseQuickAdd('Doctor tomorrow 5pm !1 #health @personal', NOW);
    expect(result.title).toBe('Doctor');
    expect(result.dueDate).toBe(toLocalDay(new Date(2026, 6, 6)));
    expect(result.dueTime).toBe('17:00');
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.tagNames).toEqual(['health']);
    expect(result.listName).toBe('personal');
  });

  it('falls back to the full input as the title when nothing matches', () => {
    const result = parseQuickAdd('Just a plain task', NOW);
    expect(result.title).toBe('Just a plain task');
    expect(result.dueDate).toBeNull();
    expect(result.dueTime).toBeNull();
    expect(result.priority).toBe(Priority.NONE);
    expect(result.tagNames).toEqual([]);
    expect(result.listName).toBeNull();
  });

  it('collapses leftover whitespace after stripping tokens', () => {
    const result = parseQuickAdd('  Doctor   tomorrow   ', NOW);
    expect(result.title).toBe('Doctor');
  });
});
