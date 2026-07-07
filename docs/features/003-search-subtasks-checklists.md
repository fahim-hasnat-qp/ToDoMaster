# Feature 003 — Search + Subtasks/Checklists UI

Status: **Shipped** · Builds on Milestones 1–2 (ARCHITECTURE.md §11, steps 6–7)

## What shipped

### Search (`/app/search`)
- Full-text search across **title, description, notes, and tag names**, scoped to all non-archived,
  non-deleted top-level tasks (subtasks are excluded from results — opening the parent shows them).
- Runs entirely in memory against the already-loaded Zustand store — no debounce, no separate index.
  At the "thousands of tasks" scale this app targets, an in-memory `.filter()` is sub-millisecond;
  a real search index is future work only if that assumption breaks.
- Results reuse `TaskItem` + `TaskEditor` verbatim — no parallel rendering path to maintain.
- New sidebar entry above Smart Lists (search is a top-level action, not a list).

### Subtasks & Checklists (inside `TaskEditor`)
- **Checklist**: lightweight `ChecklistItem[]` embedded directly on the task (text/done/order) — add,
  check, remove. Edited in the draft and saved with the rest of the form, same as every other field.
- **Subtasks**: real `Task` rows (`parentTaskId` set) — add, complete, remove. Unlike the checklist,
  these persist immediately through the existing task store, because a subtask is a first-class task
  with its own sync lifecycle, not a field on the parent. Only shown once the parent task is saved
  (a subtask needs a real parent id to attach to).
- **Progress indicators on `TaskItem`**: `x/y` checklist and subtask counts render inline, computed by
  two new pure functions in `domain/progress.ts`.

## Design & why

- **`matchesQuery` extended, not duplicated.** Tag-name matching was already promised in a stale comment
  from Milestone 1 ("...tag names is done in the search feature") — closed that gap by adding an optional
  `tagNames: string[]` parameter instead of writing a second search function. The search screen resolves
  tag names from `tagIds` before calling it, keeping the domain function free of a tag-store dependency.
- **Checklist lives in the draft; subtasks don't.** This is the one asymmetry in the editor and it's
  intentional: checklist items are subordinate data with no independent identity outside their parent
  task (they don't sync as their own entity), so they ride along with the parent's save. Subtasks are
  full tasks — saving them separately means completing one doesn't require opening and re-saving the
  parent, and it reuses 100% of the existing task store logic (create/toggle/delete) with zero new
  repository code.
- **Repository layer required no new methods.** `parentTaskId`-based filtering and the existing
  `create`/`update`/`softDelete`/`duplicate` already handle subtasks correctly (cascade delete and
  duplicate-with-subtasks shipped in Milestone 1) — confirmed by re-reading the repository before writing
  any code, avoiding speculative API surface.

## Tradeoffs

- No drag-to-reorder for checklist items or subtasks yet; `order` fields exist and default to insertion
  order, but reordering UI wasn't in scope for this slice.
- Search has no keyboard shortcut (e.g. `Cmd+K`) to jump to it yet — reachable only via the sidebar link.
  Small, deliberate scope cut; easy to add later without touching the search logic itself.
- Subtasks-of-subtasks (nesting beyond one level) are not prevented at the UI layer — the data model
  technically allows a subtask to have its own `parentTaskId` pointing to another subtask. Out of scope
  for "unlimited subtasks" as specified; flagged in case flat-only nesting was intended.

## Future improvements

- `Cmd+K` / global quick-search shortcut.
- Drag-to-reorder for checklist items and subtasks.
- Decide and enforce subtask nesting depth (flat vs. arbitrary) — currently unconstrained.
- Search result highlighting (bold the matched substring).

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# /app/search — type to search; open a result to edit it.
# Open any existing task -> Checklist and Subtasks sections at the bottom of the editor.
pnpm test   # 33 tests
```
