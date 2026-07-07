import { format, parseISO } from 'date-fns';
import type { Task } from '@todomaster/shared';
import { Checkbox } from '@/components/Checkbox';
import { cn } from '@/components/utils/cn';
import type { CalendarDay } from '@/domain/calendar';

type WeekViewProps = Readonly<{
  days: CalendarDay[];
  onSelectTask: (task: Task) => void;
  onToggle: (id: string) => void;
}>;

export function WeekView({ days, onSelectTask, onToggle }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.date}
          className={cn(
            'rounded-xl border border-border bg-surface p-2',
            day.isToday && 'border-accent',
          )}
        >
          <p className={cn('mb-2 text-xs font-medium', day.isToday ? 'text-accent' : 'text-muted')}>
            {format(parseISO(day.date), 'EEE d')}
          </p>
          <div className="space-y-1.5">
            {day.tasks.length === 0 && <p className="text-xs text-muted">No tasks</p>}
            {day.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-1.5">
                <Checkbox
                  checked={task.completed}
                  priority={task.priority}
                  onChange={() => onToggle(task.id)}
                  label={`Complete ${task.title}`}
                />
                <button
                  onClick={() => onSelectTask(task)}
                  className={cn(
                    'flex-1 truncate text-left text-xs hover:underline',
                    task.completed ? 'text-muted line-through' : 'text-text',
                  )}
                  title={task.title}
                >
                  {task.title}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
