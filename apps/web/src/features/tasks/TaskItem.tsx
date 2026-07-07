import { motion } from 'framer-motion';
import { CalendarClock, Copy, ListChecks, Repeat, Trash2 } from 'lucide-react';
import { type Task } from '@todomaster/shared';
import { Checkbox } from '@/components/Checkbox';
import { cn } from '@/components/utils/cn';
import { useTagStore } from '@/features/tags/tag-store';
import { useTaskStore } from './task-store';
import { formatDue } from './format';
import { toLocalDay } from '@/domain/task-queries';
import { checklistProgress, subtaskProgress } from '@/domain/progress';
import { describeRecurrence } from '@/domain/recurrence-engine';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onToggle, onOpen, onDuplicate, onDelete }: TaskItemProps) {
  const due = formatDue(task.dueDate, task.dueTime);
  const overdue =
    !task.completed && task.dueDate !== null && task.dueDate < toLocalDay(new Date());
  const allTags = useTagStore((s) => s.tags);
  const taskTags = task.tagIds.length
    ? allTags.filter((t) => task.tagIds.includes(t.id))
    : [];
  const allTasks = useTaskStore((s) => s.tasks);
  const checklist = checklistProgress(task.checklist);
  const subtasks = subtaskProgress(allTasks, task.id);
  const hasProgress = checklist.total > 0 || subtasks.total > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-card"
    >
      <Checkbox
        checked={task.completed}
        priority={task.priority}
        onChange={() => onToggle(task.id)}
        label={`Complete ${task.title}`}
      />

      <button
        onClick={() => onOpen(task)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span
          className={cn(
            'w-full truncate text-sm',
            task.completed ? 'text-muted line-through' : 'text-text',
          )}
        >
          {task.title}
        </span>
        {due && (
          <span
            className={cn(
              'mt-0.5 inline-flex items-center gap-1 text-xs',
              overdue ? 'text-danger' : 'text-muted',
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {due}
            {task.recurrence && (
              <span
                className="inline-flex items-center gap-0.5"
                title={describeRecurrence(task.recurrence)}
              >
                <Repeat className="h-3 w-3" />
              </span>
            )}
          </span>
        )}
        {taskTags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />
                {tag.name}
              </span>
            ))}
          </span>
        )}
        {hasProgress && (
          <span className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
            {checklist.total > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                {checklist.done}/{checklist.total}
              </span>
            )}
            {subtasks.total > 0 && (
              <span className="inline-flex items-center gap-1">
                {subtasks.done}/{subtasks.total} subtasks
              </span>
            )}
          </span>
        )}
      </button>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onDuplicate(task.id)}
          aria-label="Duplicate"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Delete"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
