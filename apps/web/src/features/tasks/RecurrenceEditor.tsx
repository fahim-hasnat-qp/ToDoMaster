import { useState } from 'react';
import { RecurrenceFreq, WEEKDAYS, type RecurrenceRule, type Weekday } from '@todomaster/shared';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { cn } from '@/components/utils/cn';

type RecurrenceEditorProps = Readonly<{
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}>;

const WEEKDAY_LABELS: Record<Weekday, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const WEEKDAYS_ONLY: readonly Weekday[] = [1, 2, 3, 4, 5];

type Preset = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';

function presetFor(rule: RecurrenceRule | null): Preset {
  if (!rule) return 'none';
  if (rule.freq === RecurrenceFreq.DAILY && rule.interval === 1) return 'daily';
  if (
    rule.freq === RecurrenceFreq.WEEKLY &&
    rule.interval === 1 &&
    rule.byWeekday?.length === 5 &&
    WEEKDAYS_ONLY.every((d) => rule.byWeekday?.includes(d))
  ) {
    return 'weekdays';
  }
  if (rule.freq === RecurrenceFreq.WEEKLY && rule.interval === 1 && !rule.byWeekday?.length) {
    return 'weekly';
  }
  if (rule.freq === RecurrenceFreq.MONTHLY && rule.interval === 1) return 'monthly';
  return 'custom';
}

const PRESET_RULES: Record<Exclude<Preset, 'none' | 'custom'>, RecurrenceRule> = {
  daily: { freq: RecurrenceFreq.DAILY, interval: 1 },
  weekdays: { freq: RecurrenceFreq.WEEKLY, interval: 1, byWeekday: [...WEEKDAYS_ONLY] },
  weekly: { freq: RecurrenceFreq.WEEKLY, interval: 1 },
  monthly: { freq: RecurrenceFreq.MONTHLY, interval: 1 },
};

/**
 * Recurrence picker: quick presets covering the common cases (Daily/Weekdays/
 * Weekly/Monthly), plus a "Custom" mode for interval + specific weekdays —
 * covering the full spec (Daily, Weekly, Monthly, Every X Days, Weekdays, Custom).
 */
export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const [customOpen, setCustomOpen] = useState(presetFor(value) === 'custom');
  const preset = customOpen ? 'custom' : presetFor(value);

  const selectPreset = (p: Preset) => {
    if (p === 'none') {
      setCustomOpen(false);
      onChange(null);
      return;
    }
    if (p === 'custom') {
      setCustomOpen(true);
      onChange(value ?? { freq: RecurrenceFreq.DAILY, interval: 2 });
      return;
    }
    setCustomOpen(false);
    onChange(PRESET_RULES[p]);
  };

  const updateCustom = (patch: Partial<RecurrenceRule>) => {
    const base: RecurrenceRule = value ?? { freq: RecurrenceFreq.DAILY, interval: 1 };
    onChange({ ...base, ...patch });
  };

  const toggleWeekday = (day: Weekday) => {
    const current = value?.byWeekday ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    updateCustom({ byWeekday: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom'] as const).map((p) => (
          <Chip key={p} active={preset === p} onClick={() => selectPreset(p)}>
            {p === 'none' ? 'None' : p === 'custom' ? 'Custom' : p[0]?.toUpperCase() + p.slice(1)}
          </Chip>
        ))}
      </div>

      {customOpen && value && (
        <div className="space-y-3 rounded-lg bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-sm text-text">
            <span className="text-muted">Every</span>
            <Input
              type="number"
              min={1}
              value={value.interval}
              onChange={(e) => updateCustom({ interval: Math.max(1, Number(e.target.value)) })}
              className="w-16 py-1.5 text-center"
            />
            <select
              aria-label="Recurrence unit"
              value={value.freq}
              onChange={(e) => updateCustom({ freq: e.target.value as RecurrenceRule['freq'] })}
              className="rounded-lg bg-surface px-2 py-1.5 text-sm text-text focus:outline-none"
            >
              <option value={RecurrenceFreq.DAILY}>day(s)</option>
              <option value={RecurrenceFreq.WEEKLY}>week(s)</option>
              <option value={RecurrenceFreq.MONTHLY}>month(s)</option>
              <option value={RecurrenceFreq.YEARLY}>year(s)</option>
            </select>
          </div>

          {value.freq === RecurrenceFreq.WEEKLY && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Repeat on weekdays">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={value.byWeekday?.includes(day) ?? false}
                  onClick={() => toggleWeekday(day)}
                  title={WEEKDAY_LABELS[day]}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full text-xs font-medium transition-colors',
                    value.byWeekday?.includes(day)
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface text-muted hover:text-text',
                  )}
                >
                  {WEEKDAY_LABELS[day][0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
