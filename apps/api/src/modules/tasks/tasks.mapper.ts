import type { Task as PrismaTask, TaskTag } from '@prisma/client';

type TaskWithTags = PrismaTask & { taskTags: TaskTag[] };

/**
 * Maps a Prisma Task row (+ its join-table tags) to the shared Task shape the
 * client expects — the API's one boundary-crossing point between the relational
 * model (TaskTag join table) and the client's flat `tagIds: string[]`.
 */
export function toSharedTask(row: TaskWithTags): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    listId: row.listId,
    priority: row.priority,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    completed: row.completed,
    completedAt: row.completedAt?.toISOString() ?? null,
    archived: row.archived,
    recurrence: row.recurrence,
    recurrenceCount: row.recurrenceCount,
    parentTaskId: row.parentTaskId,
    order: row.order,
    tagIds: row.taskTags.map((tt) => tt.tagId),
    checklist: row.checklist,
    reminders: row.reminders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    version: row.version,
  };
}
