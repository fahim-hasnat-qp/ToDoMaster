import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Task } from '@todomaster/shared';
import { Checkbox } from '@/components/Checkbox';
import { Input } from '@/components/Input';
import { cn } from '@/components/utils/cn';
import { useTaskStore } from './task-store';

type SubtaskListProps = Readonly<{
  parentId: string;
  subtasks: Task[];
}>;

/**
 * Subtasks are real Task rows (parentTaskId set), so unlike the checklist they
 * persist immediately via the task store rather than living in the draft —
 * consistent with how the parent task itself is edited in place, not staged.
 */
export function SubtaskList({ parentId, subtasks }: SubtaskListProps) {
  const [draft, setDraft] = useState('');
  const create = useTaskStore((s) => s.create);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const remove = useTaskStore((s) => s.remove);

  const addSubtask = async () => {
    const title = draft.trim();
    if (!title) return;
    await create({ title, parentTaskId: parentId, order: subtasks.length });
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="group flex items-center gap-2">
          <Checkbox
            checked={subtask.completed}
            onChange={() => void toggleComplete(subtask.id)}
            label={subtask.title}
          />
          <span
            className={cn(
              'flex-1 truncate text-sm',
              subtask.completed ? 'text-muted line-through' : 'text-text',
            )}
          >
            {subtask.title}
          </span>
          <button
            onClick={() => void remove(subtask.id)}
            aria-label={`Remove ${subtask.title}`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted opacity-0 hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder="Add subtask…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addSubtask();
            }
          }}
        />
        <button
          onClick={() => void addSubtask()}
          aria-label="Add subtask"
          disabled={!draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted hover:text-text disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
