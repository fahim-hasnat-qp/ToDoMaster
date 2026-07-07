import { useMemo } from 'react';
import type { Task } from '@todomaster/shared';
import { useTaskStore } from '@/features/tasks/task-store';
import { useTagStore } from '@/features/tags/tag-store';
import { isVisibleTopLevel, matchesQuery, sortTasks } from '@/domain/task-queries';

/**
 * Searches title/description/notes/tags across all visible tasks (not scoped to
 * a list). Runs entirely in memory against the already-loaded store — local data
 * is small enough (thousands of tasks) that no debounce or index is needed yet.
 */
export function useSearchResults(query: string): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  const tags = useTagStore((s) => s.tags);

  return useMemo(() => {
    if (!query.trim()) return [];
    const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
    const matches = tasks.filter((task) => {
      if (!isVisibleTopLevel(task)) return false;
      const tagNames = task.tagIds
        .map((id) => tagNameById.get(id))
        .filter((name): name is string => name !== undefined);
      return matchesQuery(task, query, tagNames);
    });
    return sortTasks(matches, 'modifiedDate');
  }, [tasks, tags, query]);
}
