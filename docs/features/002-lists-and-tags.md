# Feature 002 — Lists & Tags CRUD

Status: **Shipped** · Builds on Milestone 1 (ARCHITECTURE.md §11, step 4)

## What shipped

- **Lists management** (`/app/lists`, linked from the sidebar "Manage" section): create, rename,
  recolor (10-swatch palette) custom lists. Default lists (Personal/Work/Shopping/Study) can be
  renamed/recolored but **not deleted** — enforced in `list-store.ts` (throws `AppError('VALIDATION')`
  before hitting the repository) and reflected in the UI (`ListEditor` hides Delete for defaults).
- **Tags management** (`/app/tags`): create, rename, recolor, delete tags. Same editor pattern as lists.
- **Tag assignment on tasks**: `TaskEditor` gained a multi-select "Tags" `Fieldset` of `Chip`s; `TaskItem`
  renders small colored tag pills under the title so tags are visible without opening the task.
- **Data-integrity fixes at the repository layer** (not the UI — this is a correctness concern that
  belongs below the store):
  - Deleting a **list** now reassigns its tasks' `listId` to `null` instead of leaving them pointing at
    a tombstoned list (which would have silently hidden them from every list-scoped view).
  - Deleting a **tag** now strips that tag's id from every task's `tagIds` array.
  - Both reassignments are folded into the *same Dexie transaction* as the delete and each produces its
    own outbox `UPSERT` entry, so the cleanup is atomic and syncs correctly.

## Design & why

- **Reused the existing `Sheet` + `Field`/`Fieldset` + `Chip` primitives** for both editors — no new UI
  patterns introduced, keeping the design system coherent (per the "avoid duplication" guideline).
- **New `ColorSwatchPicker` primitive** (10-color curated palette) shared by `ListEditor` and `TagEditor`
  — one component, not two copy-pasted color grids.
- **Delete confirmation uses a native `window.confirm`**, not a custom modal. Deliberate scope call: list
  deletion has a real consequence (task reassignment) that an undo-toast can't cleanly reverse, so a
  blocking confirm is more honest than a false "Undo" affordance. A styled in-app `ConfirmDialog` is a
  natural follow-up once more destructive flows exist (see Future).
- **Cleanup logic lives in the repositories, not the stores or UI.** The store layer only orchestrates;
  data-integrity invariants (no dangling `listId`/`tagIds` references) are the repository's job, so they
  hold no matter which UI calls them — and they're covered by repository-level tests, not UI tests.

## Tradeoffs

- `window.confirm` is functional but visually inconsistent with the rest of the design system (native
  browser chrome). Acceptable for now; flagged for a custom `ConfirmDialog` component later.
- No drag-to-reorder for custom lists yet — `order` exists on the model and new lists append at the end,
  but reordering UI wasn't in scope for this slice.
- Tag deletion is a hard delete-from-tasks operation with no undo. Given tags are lightweight/recreatable,
  this was judged an acceptable simplicity/safety tradeoff versus building tag-restore logic.

## Future improvements

- Drag-to-reorder lists (persist via the existing `order` field).
- In-app `ConfirmDialog` primitive to replace `window.confirm` across all destructive actions.
- Tag autocomplete/creation inline from the task editor (type a new tag name without leaving the sheet).
- Search/filter by tag (planned in the Search and Filtering milestones).

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# Visit /app/lists and /app/tags, or use the sidebar "Manage" links.
pnpm test   # apps/web: 27 tests (was 20 + new list/tag repo coverage)
```
