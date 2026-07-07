import { useMemo, useState } from 'react';
import { addMonths, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CreateTaskInput, Task } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useTaskStore } from '@/features/tasks/task-store';
import { TaskEditor } from '@/features/tasks/TaskEditor';
import { useToastStore } from '@/stores/toast-store';
import { buildAgenda, buildMonthGrid, buildWeekGrid } from '@/domain/calendar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { AgendaView } from './AgendaView';

type ViewMode = 'month' | 'week' | 'agenda';

export function CalendarScreen() {
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [editing, setEditing] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const tasks = useTaskStore((s) => s.tasks);
  const update = useTaskStore((s) => s.update);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const remove = useTaskStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);

  const today = useMemo(() => new Date(), []);
  const monthDays = useMemo(() => buildMonthGrid(anchor, tasks, today), [anchor, tasks, today]);
  const weekDays = useMemo(() => buildWeekGrid(anchor, tasks, today), [anchor, tasks, today]);
  const agendaGroups = useMemo(() => buildAgenda(tasks, today), [tasks, today]);

  const openTask = (task: Task) => {
    setEditing(task);
    setEditorOpen(true);
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

  const handleSubmit = async (draft: CreateTaskInput) => {
    if (editing) await update(editing.id, draft);
  };

  const step = (direction: 1 | -1) => {
    if (view === 'week') setAnchor((d) => addWeeks(d, direction));
    else setAnchor((d) => addMonths(d, direction));
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Calendar</h1>
        <div className="flex items-center gap-2">
          {view !== 'agenda' && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-1.5" role="group" aria-label="Calendar view">
            {(['month', 'week', 'agenda'] as const).map((v) => (
              <Chip key={v} active={view === v} onClick={() => setView(v)}>
                {v[0]?.toUpperCase() + v.slice(1)}
              </Chip>
            ))}
          </div>
        </div>
      </header>

      {view === 'month' && (
        <MonthView monthAnchor={anchor} days={monthDays} onSelectTask={openTask} />
      )}
      {view === 'week' && (
        <WeekView days={weekDays} onSelectTask={openTask} onToggle={handleToggle} />
      )}
      {view === 'agenda' && (
        <AgendaView groups={agendaGroups} onSelectTask={openTask} onToggle={handleToggle} />
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
