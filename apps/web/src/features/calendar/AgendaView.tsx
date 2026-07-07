import { format, isToday, parseISO } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import type { Task } from '@todomaster/shared';
import { Checkbox } from '@/components/Checkbox';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/components/utils/cn';
import type { AgendaGroup } from '@/domain/calendar';

type AgendaViewProps = Readonly<{
  groups: AgendaGroup[];
  onSelectTask: (task: Task) => void;
  onToggle: (id: string) => void;
}>;

export function AgendaView({ groups, onSelectTask, onToggle }: AgendaViewProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing scheduled"
        description="Tasks with a due date in the next 60 days will show up here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const date = parseISO(group.date);
        return (
          <div key={group.date}>
            <p
              className={cn(
                'mb-2 text-xs font-semibold uppercase tracking-wide',
                isToday(date) ? 'text-accent' : 'text-muted',
              )}
            >
              {format(date, 'EEEE, MMM d')}
            </p>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <Checkbox
                    checked={task.completed}
                    priority={task.priority}
                    onChange={() => onToggle(task.id)}
                    label={`Complete ${task.title}`}
                  />
                  <button
                    onClick={() => onSelectTask(task)}
                    className={cn(
                      'flex-1 truncate text-left text-sm hover:underline',
                      task.completed ? 'text-muted line-through' : 'text-text',
                    )}
                  >
                    {task.title}
                  </button>
                  {task.dueTime && <span className="text-xs text-muted">{task.dueTime}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
