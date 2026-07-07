import { z } from 'zod';
import { RecurrenceFreq, Weekday } from './enums.js';

/**
 * Structured recurrence rule — an RFC-5545-inspired subset.
 * Kept small on purpose; the expansion engine lives in the domain layer.
 *
 * Examples:
 *   Daily:        { freq: DAILY, interval: 1 }
 *   Every 3 days: { freq: DAILY, interval: 3 }
 *   Weekdays:     { freq: WEEKLY, interval: 1, byWeekday: [1,2,3,4,5] }
 *   Every Mon/Wed:{ freq: WEEKLY, interval: 1, byWeekday: [1,3] }
 *   Monthly:      { freq: MONTHLY, interval: 1 }
 */
export const recurrenceRuleSchema = z.object({
  freq: z.nativeEnum(RecurrenceFreq),
  /** Repeat every `interval` units of `freq`. Must be >= 1. */
  interval: z.number().int().min(1).default(1),
  /** For WEEKLY: which ISO weekdays. Empty/undefined = same weekday as anchor. */
  byWeekday: z.array(z.nativeEnum(Weekday)).optional(),
  /** Optional end conditions (mutually exclusive in practice). */
  until: z.string().datetime().optional(),
  count: z.number().int().min(1).optional(),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
