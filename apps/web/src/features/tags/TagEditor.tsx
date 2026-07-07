import { useEffect, useState } from 'react';
import type { CreateTagInput, Tag } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Sheet } from '@/components/Sheet';
import { Field, Fieldset } from '@/components/Field';
import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';

type TagEditorProps = Readonly<{
  open: boolean;
  tag: Tag | null;
  onClose: () => void;
  onSubmit: (draft: CreateTagInput) => void | Promise<void>;
  onDelete?: (id: string) => void;
}>;

const emptyDraft = (): { name: string; color: string } => ({
  name: '',
  color: '#50C878',
});

export function TagEditor({ open, tag, onClose, onSubmit, onDelete }: TagEditorProps) {
  const [draft, setDraft] = useState(emptyDraft());

  useEffect(() => {
    if (!open) return;
    setDraft(tag ? { name: tag.name, color: tag.color } : emptyDraft());
  }, [open, tag]);

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
      title={tag ? 'Edit Tag' : 'New Tag'}
      footer={
        <div className="flex items-center gap-2">
          {tag && onDelete && (
            <Button
              variant="danger"
              onClick={() => {
                onDelete(tag.id);
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button className="ml-auto" disabled={!canSave} onClick={handleSubmit}>
            {tag ? 'Save' : 'Create Tag'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Name">
          <Input
            autoFocus
            value={draft.name}
            placeholder="e.g. urgent"
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
      </div>
    </Sheet>
  );
}
