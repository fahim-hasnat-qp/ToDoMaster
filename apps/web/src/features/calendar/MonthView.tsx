import { format } from 'date-fns';
import type { Task } from '@todomaster/shared';
import { cn } from '@/components/utils/cn';
import type { CalendarDay } from '@/domain/calendar';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type MonthViewProps = Readonly<{
  monthAnchor: Date;
  days: CalendarDay[];
  onSelectTask: (task: Task) => void;
}>;

export function MonthView({ monthAnchor, days, onSelectTask }: MonthViewProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted">{format(monthAnchor, 'MMMM yyyy')}</p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="bg-surface-2 px-2 py-1.5 text-center font-medium text-muted">
            {label}
          </div>
        ))}
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              'min-h-[5.5rem] bg-surface px-1.5 py-1.5',
              !day.isCurrentMonth && 'bg-surface/50 text-muted',
            )}
          >
            <span
              className={cn(
                'mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                day.isToday && 'bg-accent font-semibold text-accent-fg',
              )}
            >
              {Number(day.date.slice(-2))}
            </span>
            <div className="space-y-0.5">
              {day.tasks.slice(0, 3).map((task) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className={cn(
                    'block w-full truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-surface-2',
                    task.completed ? 'text-muted line-through' : 'text-text',
                  )}
                  title={task.title}
                >
                  {task.title}
                </button>
              ))}
              {day.tasks.length > 3 && (
                <p className="px-1 text-[10px] text-muted">+{day.tasks.length - 3} more</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
