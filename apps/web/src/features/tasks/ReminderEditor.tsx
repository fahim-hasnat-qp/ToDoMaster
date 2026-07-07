import { v4 as uuid } from 'uuid';
import { Bell, X } from 'lucide-react';
import { ReminderType, type Reminder } from '@todomaster/shared';
import { Chip } from '@/components/Chip';

type ReminderEditorProps = Readonly<{
  reminders: Reminder[];
  onChange: (reminders: Reminder[]) => void;
}>;

/** Quick offsets, in minutes before the due time. */
const PRESETS: ReadonlyArray<{ label: string; offsetMinutes: number }> = [
  { label: 'At due time', offsetMinutes: 0 },
  { label: '10 min before', offsetMinutes: 10 },
  { label: '1 hour before', offsetMinutes: 60 },
  { label: '1 day before', offsetMinutes: 1440 },
];

function presetLabel(offsetMinutes: number | undefined): string {
  const preset = PRESETS.find((p) => p.offsetMinutes === offsetMinutes);
  return preset?.label ?? `${offsetMinutes ?? 0} min before`;
}

/**
 * Multiple DUE reminders per task, each a preset offset before the due time.
 * Custom absolute-time reminders (ReminderType.CUSTOM) share the same Reminder
 * shape but aren't exposed in this quick picker yet — see feature doc.
 */
export function ReminderEditor({ reminders, onChange }: ReminderEditorProps) {
  const addPreset = (offsetMinutes: number) => {
    if (reminders.some((r) => r.type === ReminderType.DUE && r.offsetMinutes === offsetMinutes)) {
      return; // already added
    }
    const reminder: Reminder = {
      id: uuid(),
      type: ReminderType.DUE,
      offsetMinutes,
      // Placeholder; DUE reminders resolve their real fire time from the task's
      // due date/time at scan time (see domain/reminders.ts resolveReminderTime).
      remindAt: new Date(0).toISOString(),
    };
    onChange([...reminders, reminder]);
  };

  const removeReminder = (id: string) => onChange(reminders.filter((r) => r.id !== id));

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => (
        <div key={reminder.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <Bell className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="flex-1 text-sm text-text">{presetLabel(reminder.offsetMinutes)}</span>
          <button
            onClick={() => removeReminder(reminder.id)}
            aria-label="Remove reminder"
            className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface hover:text-danger"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Chip key={p.label} onClick={() => addPreset(p.offsetMinutes)}>
            + {p.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
