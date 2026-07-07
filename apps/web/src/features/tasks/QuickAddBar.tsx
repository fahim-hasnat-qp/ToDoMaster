import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Input } from '@/components/Input';
import { parseQuickAdd, formatQuickAddPreview } from '@/domain/quick-add-parser';
import { useQuickAdd } from './useQuickAdd';

type QuickAddBarProps = Readonly<{
  /** List to attach the task to when no @list token is typed. */
  defaultListId?: string | null;
  placeholder?: string;
}>;

/**
 * Always-visible inline quick-add row. Parses natural language as you type
 * (see domain/quick-add-parser.ts) and shows a live preview of what will be
 * created; pressing Enter creates the task immediately.
 */
export function QuickAddBar({ defaultListId = null, placeholder }: QuickAddBarProps) {
  const [value, setValue] = useState('');
  const { submit } = useQuickAdd(defaultListId);

  const preview = useMemo(() => {
    if (!value.trim()) return [];
    return formatQuickAddPreview(parseQuickAdd(value));
  }, [value]);

  const handleSubmit = async () => {
    const created = await submit(value);
    if (created) setValue('');
  };

  return (
    <div className="mb-4">
      <div className="relative">
        <Plus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={placeholder ?? 'Quick add — e.g. "Doctor tomorrow 5pm #health !1"'}
          className="pl-9"
        />
      </div>
      {preview.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-1 text-xs text-muted">
          <Sparkles className="h-3 w-3 text-accent" />
          {preview.join(' · ')}
        </div>
      )}
    </div>
  );
}
