import { useState } from 'react';
import { List as ListIcon, Pencil, Plus } from 'lucide-react';
import type { CreateListInput, List } from '@todomaster/shared';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useToastStore } from '@/stores/toast-store';
import { listIcon } from './list-icon';
import { useListStore } from './list-store';
import { ListEditor } from './ListEditor';

/** Settings-style management screen: create, rename, recolor, delete lists. */
export function ListsScreen() {
  const lists = useListStore((s) => s.lists);
  const create = useListStore((s) => s.create);
  const update = useListStore((s) => s.update);
  const remove = useListStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<List | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (list: List) => {
    setEditing(list);
    setEditorOpen(true);
  };

  const handleSubmit = async (draft: CreateListInput) => {
    if (editing) await update(editing.id, draft);
    else await create(draft);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Its tasks will move to "No List".`)) return;
    try {
      await remove(id);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Could not delete list.' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Lists</h1>
          <p className="text-sm text-muted">{lists.length} lists</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New List
        </Button>
      </header>

      {lists.length === 0 ? (
        <EmptyState icon={ListIcon} title="No lists yet" description="Create your first list." />
      ) : (
        <ul className="space-y-2">
          {lists.map((list) => {
            const Icon = listIcon(list.icon);
            return (
              <li
                key={list.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-card"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `${list.color}22` }}
                >
                  <Icon className="h-4 w-4" style={{ color: list.color }} />
                </span>
                <span className="flex-1 truncate text-sm font-medium text-text">
                  {list.name}
                  {list.isDefault && (
                    <span className="ml-2 text-xs font-normal text-muted">Default</span>
                  )}
                </span>
                <button
                  onClick={() => openEdit(list)}
                  aria-label={`Edit ${list.name}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ListEditor
        open={editorOpen}
        list={editing}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmit}
        onDelete={(id) => {
          const name = lists.find((l) => l.id === id)?.name ?? 'this list';
          void handleDelete(id, name);
        }}
      />
    </div>
  );
}
