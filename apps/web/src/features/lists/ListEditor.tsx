import { useEffect, useState } from 'react';
import type { CreateListInput, List } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Sheet } from '@/components/Sheet';
import { Field, Fieldset } from '@/components/Field';
import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';

type ListEditorProps = Readonly<{
  open: boolean;
  /** List being edited; null = creating a new one. */
  list: List | null;
  onClose: () => void;
  onSubmit: (draft: CreateListInput) => void | Promise<void>;
  onDelete?: (id: string) => void;
}>;

const emptyDraft = (): { name: string; color: string } => ({
  name: '',
  color: '#6C8EF5',
});

export function ListEditor({ open, list, onClose, onSubmit, onDelete }: ListEditorProps) {
  const [draft, setDraft] = useState(emptyDraft());

  useEffect(() => {
    if (!open) return;
    setDraft(list ? { name: list.name, color: list.color } : emptyDraft());
  }, [open, list]);

  const canSave = draft.name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave) return;
    await onSubmit({ name: draft.name.trim(), color: draft.color });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={list ? 'Edit List' : 'New List'}
      footer={
        <div className="flex items-center gap-2">
          {list && !list.isDefault && onDelete && (
            <Button
              variant="danger"
              onClick={() => {
                onDelete(list.id);
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="ml-auto" disabled={!canSave} onClick={handleSubmit}>
            {list ? 'Save' : 'Create List'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Name">
          <Input
            autoFocus
            value={draft.name}
            placeholder="e.g. Groceries"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
        </Field>

        <Fieldset label="Color">
          <ColorSwatchPicker
            value={draft.color}
            onChange={(color) => setDraft((d) => ({ ...d, color }))}
          />
        </Fieldset>

        {list?.isDefault && (
          <p className="text-xs text-muted">
            This is a default list and can&apos;t be deleted, but you can rename it or change its color.
          </p>
        )}
      </div>
    </Sheet>
  );
}
