import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, X } from 'lucide-react';
import type { ChecklistItem } from '@todomaster/shared';
import { Checkbox } from '@/components/Checkbox';
import { Input } from '@/components/Input';
import { cn } from '@/components/utils/cn';

type ChecklistEditorProps = Readonly<{
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}>;

/** Inline checklist editor: add/check/delete items. Order = insertion order. */
export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    const item: ChecklistItem = { id: uuid(), text, done: false, order: items.length };
    onChange([...items, item]);
    setDraft('');
  };

  const toggleItem = (id: string) =>
    onChange(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));

  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center gap-2">
          <Checkbox checked={item.done} onChange={() => toggleItem(item.id)} label={item.text} />
          <span
            className={cn(
              'flex-1 truncate text-sm',
              item.done ? 'text-muted line-through' : 'text-text',
            )}
          >
            {item.text}
          </span>
          <button
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.text}`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted opacity-0 hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder="Add checklist item…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button
          onClick={addItem}
          aria-label="Add checklist item"
          disabled={!draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted hover:text-text disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
