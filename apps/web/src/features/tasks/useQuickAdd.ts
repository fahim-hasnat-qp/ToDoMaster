import { useCallback } from 'react';
import type { CreateTaskInput } from '@todomaster/shared';
import { parseQuickAdd, type QuickAddResult } from '@/domain/quick-add-parser';
import { useListStore } from '@/features/lists/list-store';
import { useTagStore } from '@/features/tags/tag-store';
import { useTaskStore } from './task-store';

/**
 * Resolves a QuickAddResult's `listName`/`tagNames` (free text typed by the user)
 * against the real List/Tag stores, creating tags that don't exist yet — matching
 * the "just works" quick-add UX of TickTick/Todoist. Lists are matched but not
 * auto-created (a typo'd list name silently creating a new list is more surprising
 * than helpful; falls back to no list).
 */
export function useQuickAdd(defaultListId: string | null = null) {
  const lists = useListStore((s) => s.lists);
  const tags = useTagStore((s) => s.tags);
  const createTag = useTagStore((s) => s.create);
  const createTask = useTaskStore((s) => s.create);

  const resolve = useCallback(
    async (result: QuickAddResult): Promise<CreateTaskInput> => {
      const matchedList = result.listName
        ? lists.find((l) => l.name.toLowerCase() === result.listName?.toLowerCase())
        : undefined;

      const tagIds: string[] = [];
      for (const name of result.tagNames) {
        const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          tagIds.push(existing.id);
        } else {
          const created = await createTag({ name, color: '#8D95A2' });
          tagIds.push(created.id);
        }
      }

      return {
        title: result.title,
        dueDate: result.dueDate,
        dueTime: result.dueTime,
        priority: result.priority,
        listId: matchedList?.id ?? defaultListId,
        tagIds,
      };
    },
    [lists, tags, createTag, defaultListId],
  );

  const submit = useCallback(
    async (input: string) => {
      const title = input.trim();
      if (!title) return null;
      const parsed = parseQuickAdd(title);
      if (!parsed.title) return null; // e.g. input was only a date/tag with no title text
      const taskInput = await resolve(parsed);
      return createTask(taskInput);
    },
    [resolve, createTask],
  );

  return { submit };
}
