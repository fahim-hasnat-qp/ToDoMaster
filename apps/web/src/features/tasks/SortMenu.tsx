import { ArrowUpDown } from 'lucide-react';
import type { SortKey } from '@/domain/task-queries';

const OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'dueDate', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'alphabetical', label: 'Alphabetical' },
  { key: 'createdDate', label: 'Created Date' },
  { key: 'modifiedDate', label: 'Modified Date' },
];

export function SortMenu({
  value,
  onChange,
}: Readonly<{ value: SortKey; onChange: (key: SortKey) => void }>) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-muted">
      <ArrowUpDown className="h-4 w-4" />
      <select
        aria-label="Sort tasks by"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer rounded-lg bg-surface-2 px-2 py-1 text-text focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
