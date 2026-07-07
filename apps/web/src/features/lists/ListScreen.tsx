import { useParams } from 'react-router-dom';
import { TaskListView } from '@/features/tasks/TaskListView';
import { useListStore } from './list-store';

/** Renders tasks for a single custom/default list. */
export function ListScreen() {
  const { listId } = useParams<{ listId: string }>();
  const list = useListStore((s) => s.lists.find((l) => l.id === listId));

  if (!listId) return null;

  return (
    <TaskListView
      title={list?.name ?? 'List'}
      scope={{ kind: 'list', listId }}
      defaultListId={listId}
      emptyHint="No tasks in this list yet."
    />
  );
}
