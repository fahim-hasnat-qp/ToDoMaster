import { useMemo } from 'react';
import { SmartListId, type Task } from '@todomaster/shared';
import { useTaskStore } from './task-store';
import {
  isVisibleTopLevel,
  matchesSmartList,
  sortTasks,
  toLocalDay,
  type SortKey,
} from '@/domain/task-queries';

export type TaskScope =
  | { kind: 'smart'; smartList: SmartListId }
  | { kind: 'list'; listId: string };

/**
 * Derives the visible, sorted task list for a given scope. Memoized against the
 * store slice so unrelated task changes don't recompute. Pure logic lives in
 * task-queries; this hook only wires it to React + the store.
 */
export function useVisibleTasks(scope: TaskScope, sortKey: SortKey): Task[] {
  const tasks = useTaskStore((s) => s.tasks);

  return useMemo(() => {
    const today = toLocalDay(new Date());
    const filtered = tasks.filter((task) => {
      if (scope.kind === 'smart') {
        return matchesSmartList(task, scope.smartList, today);
      }
      return isVisibleTopLevel(task) && !task.completed && task.listId === scope.listId;
    });
    return sortTasks(filtered, sortKey);
  }, [tasks, scope, sortKey]);
}
