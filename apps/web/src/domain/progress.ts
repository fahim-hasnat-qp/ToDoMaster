import type { ChecklistItem, Task } from '@todomaster/shared';

export interface Progress {
  done: number;
  total: number;
  /** 0 when total is 0 (nothing to divide by, not "complete"). */
  ratio: number;
}

function toProgress(done: number, total: number): Progress {
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

/** Checklist completion ratio for a task's embedded checklist items. */
export function checklistProgress(checklist: ChecklistItem[]): Progress {
  return toProgress(checklist.filter((item) => item.done).length, checklist.length);
}

/** Subtask completion ratio given the full task list and a parent id. */
export function subtaskProgress(allTasks: Task[], parentId: string): Progress {
  const subtasks = allTasks.filter(
    (t) => t.parentTaskId === parentId && t.deletedAt === null,
  );
  return toProgress(subtasks.filter((t) => t.completed).length, subtasks.length);
}
