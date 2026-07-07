import { useState } from 'react';
import { Pencil, Plus, Tag as TagIcon } from 'lucide-react';
import type { CreateTagInput, Tag } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useToastStore } from '@/stores/toast-store';
import { useTagStore } from './tag-store';
import { TagEditor } from './TagEditor';

/** Settings-style management screen: create, rename, recolor, delete tags. */
export function TagsScreen() {
  const tags = useTagStore((s) => s.tags);
  const create = useTagStore((s) => s.create);
  const update = useTagStore((s) => s.update);
  const remove = useTagStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: CreateTagInput) => {
    if (editing) await update(editing.id, draft);
    else await create(draft);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete tag "${name}"? It will be removed from all tasks.`)) return;
    try {
      await remove(id);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Could not delete tag.' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Tags</h1>
          <p className="text-sm text-muted">{tags.length} tags</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Tag
        </Button>
      </header>

      {tags.length === 0 ? (
        <EmptyState icon={TagIcon} title="No tags yet" description="Create your first tag." />
      ) : (
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-card"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden
              />
              <span className="flex-1 truncate text-sm font-medium text-text">{tag.name}</span>
              <button
                onClick={() => openEdit(tag)}
                aria-label={`Edit ${tag.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <TagEditor
        open={editorOpen}
        tag={editing}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmit}
        onDelete={(id) => {
          const name = tags.find((t) => t.id === id)?.name ?? 'this tag';
          void handleDelete(id, name);
        }}
      />
    </div>
  );
}
