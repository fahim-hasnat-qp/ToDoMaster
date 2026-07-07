import { create } from 'zustand';
import {
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@todomaster/shared';
import { container } from '@/core/di';
import { logger } from '@/core/logger';
import { analytics } from '@/core/analytics';
import { TASK_REPO } from '@/data/repositories/tokens';
import { nowIso } from '@/data/repositories/sync-recorder';
import { computeNextOccurrence } from '@/domain/recurrence-engine';

/**
 * Application layer for tasks. Orchestrates repository use-cases and holds the
 * in-memory list the UI renders. The store NEVER touches Dexie/network directly —
 * it goes through the injected TaskRepository (offline-first golden rule).
 */
interface TaskState {
  tasks: Task[];
  loading: boolean;
  load: () => Promise<void>;
  create: (input: CreateTaskInput) => Promise<Task>;
  update: (id: string, patch: UpdateTaskInput) => Promise<void>;
  /** Returns 'rolled' if a recurring task advanced to its next occurrence instead of completing. */
  toggleComplete: (id: string) => Promise<'completed' | 'uncompleted' | 'rolled'>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Task | undefined>;
  archive: (id: string, archived: boolean) => Promise<void>;
}

const repo = () => container.resolve(TASK_REPO);

/** Local upsert into the in-memory list, keeping it the single render source. */
function upsertLocal(tasks: Task[], task: Task): Task[] {
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx === -1) return [...tasks, task];
  const next = tasks.slice();
  next[idx] = task;
  return next;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const tasks = await repo().getAll();
      set({ tasks, loading: false });
    } catch (error) {
      logger.error('Failed to load tasks', error);
      set({ loading: false });
    }
  },

  create: async (input) => {
    const task = await repo().create(input);
    set({ tasks: upsertLocal(get().tasks, task) });
    analytics.track('task_created', { hasDueDate: task.dueDate !== null });
    return task;
  },

  update: async (id, patch) => {
    const task = await repo().update(id, patch);
    set({ tasks: upsertLocal(get().tasks, task) });
  },

  toggleComplete: async (id) => {
    const current = get().tasks.find((t) => t.id === id);
    if (!current) return 'uncompleted';

    // Completing a recurring task with more occurrences left rolls it forward
    // instead of marking it done — it never becomes `completed: true` in storage,
    // so un-completing only applies to one-off tasks and finished series.
    if (!current.completed && current.recurrence && current.dueDate) {
      const next = computeNextOccurrence(
        { dueDate: current.dueDate, occurrencesCompleted: current.recurrenceCount },
        current.recurrence,
      );
      if (next) {
        const task = await repo().update(id, {
          dueDate: next,
          recurrenceCount: current.recurrenceCount + 1,
        });
        set({ tasks: upsertLocal(get().tasks, task) });
        analytics.track('task_recurrence_rolled');
        return 'rolled';
      }
    }

    const completed = !current.completed;
    const task = await repo().update(id, {
      completed,
      completedAt: completed ? nowIso() : null,
    });
    set({ tasks: upsertLocal(get().tasks, task) });
    analytics.track(completed ? 'task_completed' : 'task_uncompleted');
    return completed ? 'completed' : 'uncompleted';
  },

  remove: async (id) => {
    await repo().softDelete(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
    analytics.track('task_deleted');
  },

  duplicate: async (id) => {
    try {
      const copy = await repo().duplicate(id);
      // Reload to pick up duplicated subtasks too.
      await get().load();
      return copy;
    } catch (error) {
      logger.error('Failed to duplicate task', error);
      return undefined;
    }
  },

  archive: async (id, archived) => {
    const task = await repo().update(id, { archived });
    set({ tasks: upsertLocal(get().tasks, task) });
  },
}));
