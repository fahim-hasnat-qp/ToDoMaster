import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';
import type { CreateTaskInput, Task } from '@todomaster/shared';
import { Input } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { useToastStore } from '@/stores/toast-store';
import { useTaskStore } from '@/features/tasks/task-store';
import { TaskItem } from '@/features/tasks/TaskItem';
import { TaskEditor } from '@/features/tasks/TaskEditor';
import { useSearchResults } from './useSearchResults';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const results = useSearchResults(query);
  const update = useTaskStore((s) => s.update);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const remove = useTaskStore((s) => s.remove);
  const duplicate = useTaskStore((s) => s.duplicate);
  const showToast = useToastStore((s) => s.show);

  const openEdit = (task: Task) => {
    setEditing(task);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: CreateTaskInput) => {
    if (editing) await update(editing.id, draft);
  };

  const handleToggle = async (id: string) => {
    const result = await toggleComplete(id);
    if (result === 'completed') {
      showToast({
        message: 'Task completed',
        actionLabel: 'Undo',
        onAction: () => void toggleComplete(id),
      });
    } else if (result === 'rolled') {
      showToast({ message: 'Moved to next occurrence' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5">
        <h1 className="mb-3 text-2xl font-bold text-text">Search</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description, notes, tags…"
            className="pl-9"
          />
        </div>
      </header>

      {query.trim() === '' ? (
        <EmptyState
          icon={SearchIcon}
          title="Search your tasks"
          description="Start typing to search across title, description, notes, and tags."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No results"
          description={`Nothing matches "${query}".`}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </p>
          <AnimatePresence initial={false}>
            {results.map((task) => (
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

      <TaskEditor
        open={editorOpen}
        task={editing}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmit}
        onDelete={(id) => void remove(id)}
      />
    </div>
  );
}
