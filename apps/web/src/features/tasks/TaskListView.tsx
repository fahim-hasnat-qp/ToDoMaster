import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ListTodo, Plus } from 'lucide-react';
import { type CreateTaskInput, type Task } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useToastStore } from '@/stores/toast-store';
import type { SortKey } from '@/domain/task-queries';
import { useTaskStore } from './task-store';
import { useVisibleTasks, type TaskScope } from './useVisibleTasks';
import { TaskItem } from './TaskItem';
import { TaskEditor } from './TaskEditor';
import { SortMenu } from './SortMenu';
import { QuickAddBar } from './QuickAddBar';

interface TaskListViewProps {
  title: string;
  scope: TaskScope;
  /** Preselect this list when creating from here. */
  defaultListId?: string | null;
  emptyHint?: string;
}

export function TaskListView({
  title,
  scope,
  defaultListId = null,
  emptyHint,
}: Readonly<TaskListViewProps>) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const tasks = useVisibleTasks(scope, sortKey);
  const create = useTaskStore((s) => s.create);
  const update = useTaskStore((s) => s.update);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const remove = useTaskStore((s) => s.remove);
  const duplicate = useTaskStore((s) => s.duplicate);
  const showToast = useToastStore((s) => s.show);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (task: Task) => {
    setEditing(task);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: CreateTaskInput) => {
    if (editing) await update(editing.id, draft);
    else await create(draft);
  };

  const handleToggle = async (id: string) => {
    const result = await toggleComplete(id);
    if (result === 'completed') {
      // Undo affordance for completion (offline-safe: just re-toggles locally).
      showToast({
        message: 'Task completed',
        actionLabel: 'Undo',
        onAction: () => void toggleComplete(id),
      });
    } else if (result === 'rolled') {
      // No undo: the task advanced to its next occurrence, not a simple field flip.
      showToast({ message: 'Moved to next occurrence' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="text-sm text-muted">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <SortMenu value={sortKey} onChange={setSortKey} />
      </header>

      <QuickAddBar defaultListId={defaultListId} />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nothing here yet"
          description={emptyHint ?? 'Add your first task to get started.'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onOpen={openEdit}
                onDuplicate={(id) => void duplicate(id)}
                onDelete={(id) => void remove(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={openCreate}
        aria-label="Add task"
        className="fixed bottom-20 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TaskEditor
        open={editorOpen}
        task={editing}
        defaultListId={defaultListId}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmit}
        onDelete={(id) => void remove(id)}
      />
    </div>
  );
}
