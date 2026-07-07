import { useEffect, useState } from 'react';
import {
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  Priority,
  type ChecklistItem,
  type CreateTaskInput,
  type RecurrenceRule,
  type Reminder,
  type Task,
} from '@todomaster/shared';
import { Button } from '@/components/Button';
import { Input, Textarea } from '@/components/Input';
import { Sheet } from '@/components/Sheet';
import { Chip } from '@/components/Chip';
import { Field, Fieldset } from '@/components/Field';
import { useListStore } from '@/features/lists/list-store';
import { useTagStore } from '@/features/tags/tag-store';
import { notificationService } from '@/core/notifications';
import { useTaskStore } from './task-store';
import { ChecklistEditor } from './ChecklistEditor';
import { SubtaskList } from './SubtaskList';
import { RecurrenceEditor } from './RecurrenceEditor';
import { ReminderEditor } from './ReminderEditor';

export interface TaskDraft {
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  listId: string | null;
  tagIds: string[];
  checklist: ChecklistItem[];
  recurrence: RecurrenceRule | null;
  reminders: Reminder[];
}

type TaskEditorProps = Readonly<{
  open: boolean;
  /** Task being edited; null = creating a new one. */
  task: Task | null;
  /** Default list to preselect when creating (e.g. current list route). */
  defaultListId?: string | null;
  onClose: () => void;
  onSubmit: (draft: CreateTaskInput) => void | Promise<void>;
  onDelete?: (id: string) => void;
}>;

const emptyDraft = (listId: string | null): TaskDraft => ({
  title: '',
  description: '',
  dueDate: null,
  dueTime: null,
  priority: Priority.NONE,
  listId,
  tagIds: [],
  checklist: [],
  recurrence: null,
  reminders: [],
});

const priorityColor: Record<Priority, string | undefined> = {
  [Priority.NONE]: undefined,
  [Priority.LOW]: 'rgb(96 200 120)',
  [Priority.MEDIUM]: 'rgb(245 166 35)',
  [Priority.HIGH]: 'rgb(240 90 90)',
};

export function TaskEditor({
  open,
  task,
  defaultListId = null,
  onClose,
  onSubmit,
  onDelete,
}: TaskEditorProps) {
  const lists = useListStore((s) => s.lists);
  const tags = useTagStore((s) => s.tags);
  const allTasks = useTaskStore((s) => s.tasks);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft(defaultListId));

  // Re-seed the form whenever the sheet opens or the target task changes.
  useEffect(() => {
    if (!open) return;
    setDraft(
      task
        ? {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            priority: task.priority,
            listId: task.listId,
            tagIds: [...task.tagIds],
            checklist: task.checklist.map((item) => ({ ...item })),
            recurrence: task.recurrence,
            reminders: task.reminders.map((r) => ({ ...r })),
          }
        : emptyDraft(defaultListId),
    );
  }, [open, task, defaultListId]);

  const subtasks = task
    ? allTasks.filter((t) => t.parentTaskId === task.id).sort((a, b) => a.order - b.order)
    : [];

  const toggleTag = (tagId: string) =>
    setDraft((d) => ({
      ...d,
      tagIds: d.tagIds.includes(tagId)
        ? d.tagIds.filter((id) => id !== tagId)
        : [...d.tagIds, tagId],
    }));

  const handleRemindersChange = (reminders: Reminder[]) => {
    // Ask for permission the first time the user actually adds a reminder,
    // never proactively on load.
    if (reminders.length > draft.reminders.length) void notificationService.requestPermission();
    setDraft((d) => ({ ...d, reminders }));
  };

  const canSave = draft.title.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave) return;
    await onSubmit({
      title: draft.title.trim(),
      description: draft.description,
      dueDate: draft.dueDate,
      dueTime: draft.dueTime,
      priority: draft.priority,
      listId: draft.listId,
      tagIds: draft.tagIds,
      checklist: draft.checklist,
      recurrence: draft.dueDate ? draft.recurrence : null,
      reminders: draft.dueDate ? draft.reminders : [],
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      footer={
        <div className="flex items-center gap-2">
          {task && onDelete && (
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="primary"
            className="ml-auto"
            disabled={!canSave}
            onClick={handleSubmit}
          >
            {task ? 'Save' : 'Add Task'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Title">
          <Input
            autoFocus
            value={draft.title}
            placeholder="What needs to be done?"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) void handleSubmit();
            }}
          />
        </Field>

        <Field label="Description">
          <Textarea
            rows={3}
            value={draft.description}
            placeholder="Add details…"
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <Input
              type="date"
              value={draft.dueDate ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dueDate: e.target.value || null }))
              }
            />
          </Field>
          <Field label="Time">
            <Input
              type="time"
              value={draft.dueTime ?? ''}
              disabled={!draft.dueDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dueTime: e.target.value || null }))
              }
            />
          </Field>
        </div>

        {draft.dueDate && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">Repeat</p>
            <RecurrenceEditor
              value={draft.recurrence}
              onChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))}
            />
          </div>
        )}

        {draft.dueDate && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">Reminders</p>
            <ReminderEditor reminders={draft.reminders} onChange={handleRemindersChange} />
          </div>
        )}

        <Fieldset label="Priority">
          {PRIORITY_VALUES.map((p) => (
            <Chip
              key={p}
              color={priorityColor[p]}
              active={draft.priority === p}
              onClick={() => setDraft((d) => ({ ...d, priority: p }))}
            >
              {PRIORITY_LABELS[p]}
            </Chip>
          ))}
        </Fieldset>

        <Fieldset label="List">
          <Chip
            active={draft.listId === null}
            onClick={() => setDraft((d) => ({ ...d, listId: null }))}
          >
            None
          </Chip>
          {lists.map((list) => (
            <Chip
              key={list.id}
              color={list.color}
              active={draft.listId === list.id}
              onClick={() => setDraft((d) => ({ ...d, listId: list.id }))}
            >
              {list.name}
            </Chip>
          ))}
        </Fieldset>

        {tags.length > 0 && (
          <Fieldset label="Tags">
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                color={tag.color}
                active={draft.tagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Chip>
            ))}
          </Fieldset>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">Checklist</p>
          <ChecklistEditor
            items={draft.checklist}
            onChange={(checklist) => setDraft((d) => ({ ...d, checklist }))}
          />
        </div>

        {task && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">Subtasks</p>
            <SubtaskList parentId={task.id} subtasks={subtasks} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
