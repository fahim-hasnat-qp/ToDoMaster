import { z } from 'zod';
import { syncMetaSchema } from './common.js';
import { Priority, ReminderType } from '../domain/enums.js';
import { recurrenceRuleSchema } from '../domain/recurrence.js';

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  done: z.boolean().default(false),
  order: z.number().default(0),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const reminderSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(ReminderType).default(ReminderType.DUE),
  /** Absolute time to fire. ISO string. */
  remindAt: z.string().datetime(),
  /** For DUE reminders: minutes before due (e.g. 0, 10, 60). */
  offsetMinutes: z.number().int().optional(),
});
export type Reminder = z.infer<typeof reminderSchema>;

/**
 * The central entity. Dates are split into `dueDate` (calendar day, ISO date)
 * and `dueTime` ("HH:mm") so "no time / all day" is representable without hacks.
 */
export const taskSchema = syncMetaSchema.extend({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).default(''),
  notes: z.string().max(50_000).default(''),

  listId: z.string().uuid().nullable().default(null),
  priority: z
    .nativeEnum(Priority)
    .default(Priority.NONE) as z.ZodType<Priority>,

  /** Calendar day, ISO date "YYYY-MM-DD". null = no due date. */
  dueDate: z.string().date().nullable().default(null),
  /** "HH:mm" 24h. null = all-day. */
  dueTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .default(null),

  completed: z.boolean().default(false),
  completedAt: z.string().datetime().nullable().default(null),
  archived: z.boolean().default(false),

  recurrence: recurrenceRuleSchema.nullable().default(null),
  /** Occurrences completed so far in this series; drives `recurrence.count` limits. */
  recurrenceCount: z.number().int().nonnegative().default(0),

  /** Subtask relationship: a task whose parentTaskId is set is a subtask. */
  parentTaskId: z.string().uuid().nullable().default(null),

  /** Manual sort order within a list/parent. */
  order: z.number().default(0),

  tagIds: z.array(z.string().uuid()).default([]),
  checklist: z.array(checklistItemSchema).default([]),
  reminders: z.array(reminderSchema).default([]),
});
export type Task = z.infer<typeof taskSchema>;

/** Input for creating a task — server/local layer fills sync metadata + defaults. */
export const createTaskSchema = taskSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    version: true,
    completedAt: true,
  })
  .partial()
  .required({ title: true });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Partial update — any subset of mutable fields. Unlike create, updates may set
 * `completedAt` directly (the completion use-case stamps it alongside `completed`).
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  completedAt: z.string().datetime().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
