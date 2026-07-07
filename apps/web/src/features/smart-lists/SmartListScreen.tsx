import { SmartListId } from '@todomaster/shared';
import { TaskListView } from '@/features/tasks/TaskListView';
import { SMART_LISTS } from './smart-list-config';

const HINTS: Partial<Record<SmartListId, string>> = {
  [SmartListId.TODAY]: 'Tasks due today (and overdue) show up here.',
  [SmartListId.UPCOMING]: 'Tasks scheduled for the future.',
  [SmartListId.OVERDUE]: 'Nothing overdue — nice work!',
  [SmartListId.COMPLETED]: 'Completed tasks will appear here.',
  [SmartListId.HIGH_PRIORITY]: 'Your high-priority tasks, all in one place.',
  [SmartListId.NO_DATE]: 'Tasks without a due date.',
};

/** Renders one smart list. The router binds a concrete id per route. */
export function SmartListScreen({ id }: Readonly<{ id: SmartListId }>) {
  const meta = SMART_LISTS.find((s) => s.id === id);
  if (!meta) return null;
  return (
    <TaskListView
      title={meta.label}
      scope={{ kind: 'smart', smartList: meta.id }}
      emptyHint={HINTS[meta.id]}
    />
  );
}
