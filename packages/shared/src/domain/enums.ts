/**
 * Core domain enums shared by web + api.
 * Numeric priority is intentional: it sorts naturally and stores compactly.
 */

export const Priority = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_VALUES: readonly Priority[] = [
  Priority.NONE,
  Priority.LOW,
  Priority.MEDIUM,
  Priority.HIGH,
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NONE]: 'None',
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
};

export const RecurrenceFreq = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type RecurrenceFreq = (typeof RecurrenceFreq)[keyof typeof RecurrenceFreq];

/** ISO weekday: 1=Mon … 7=Sun (matches date-fns / ISO-8601). */
export const Weekday = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export const ReminderType = {
  DUE: 'DUE',
  CUSTOM: 'CUSTOM',
} as const;
export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];

export const AttachmentKind = {
  IMAGE: 'IMAGE',
  VOICE: 'VOICE',
  PDF: 'PDF',
} as const;
export type AttachmentKind = (typeof AttachmentKind)[keyof typeof AttachmentKind];

export const AuthProvider = {
  EMAIL: 'EMAIL',
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
  GUEST: 'GUEST',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const ActivityType = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_UNCOMPLETED: 'TASK_UNCOMPLETED',
  TASK_DELETED: 'TASK_DELETED',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

/** Smart lists are computed, not stored. Ids are stable route slugs. */
export const SmartListId = {
  TODAY: 'today',
  UPCOMING: 'upcoming',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
  ALL: 'all',
  HIGH_PRIORITY: 'priority',
  NO_DATE: 'no-date',
} as const;
export type SmartListId = (typeof SmartListId)[keyof typeof SmartListId];
