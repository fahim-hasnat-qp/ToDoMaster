# Feature 005 — Recurring Tasks

Status: **Shipped** · Builds on Milestones 1–4 (ARCHITECTURE.md §11, step 9)

## What shipped

- **`domain/recurrence-engine.ts`** — pure expansion logic: `computeNextOccurrence(state, rule)`
  advances a due date by one occurrence (Daily, Weekly, Monthly, Yearly, every-N-interval, specific
  weekday sets), honoring `until`/`count` end conditions. `describeRecurrence(rule)` produces the
  human-readable label ("Every 3 days", "Every weekday", "Weekly on Mon, Wed") used in the UI.
- **`RecurrenceEditor`** in `TaskEditor` — presets for the spec'd set (None/Daily/Weekdays/Weekly/
  Monthly) plus a **Custom** mode exposing interval + unit + specific-weekday toggles, covering
  "Every X Days" and arbitrary combinations. Only shown once a due date is set — a recurrence needs an
  anchor date to advance from.
- **Rolling completion in `task-store.ts`**: completing a recurring task with occurrences remaining
  **advances `dueDate` and `recurrenceCount`, and never sets `completed: true`** — the task stays live
  in Today/Upcoming at its new date instead of moving to Completed. Once the series ends (`count`
  reached or `until` passed), the final completion behaves like an ordinary one-off task.
- **`Task.recurrenceCount`** — new field in `packages/shared` tracking occurrences completed in the
  current series, needed to evaluate `count` limits. Defaults to 0; resets to 0 on duplicate (a copy
  starts its own series).
- **Recurrence indicator** on `TaskItem` — a repeat icon next to the due date, with the human-readable
  rule on hover.

## Design & why

- **Rolling completion, not archive-and-recreate.** This matches TickTick/Todoist: recurring tasks are
  one persistent row whose due date moves forward, not a new task spawned on every completion. It also
  means subtasks/checklist/tags/history stay attached to the same task across occurrences — recreating
  a new row each time would either duplicate or lose that data.
- **No "Undo" on a rolled completion.** The existing complete/undo toast flips one boolean field, which
  is trivially reversible. A roll changes `dueDate` *and* `recurrenceCount` together — reversing it
  correctly isn't a single-field flip, and a fake "Undo" that didn't fully restore state would be worse
  than no undo. The toggle now returns a `'completed' | 'uncompleted' | 'rolled'` result so the UI can
  show an honest, undo-less confirmation ("Moved to next occurrence") instead.
- **Month-end recurrence clamps, it doesn't roll into the next month.** `date-fns`'s `addMonths` turns
  Jan 31 + 1 month into Feb 28, not Mar 3. This is the behavior most calendar apps use and is called out
  explicitly in code and tests because the alternative (rolling forward) is a classic date-math bug that
  silently drifts a monthly task's day-of-month over a year.
- **This is a pure function change, not a repository change.** `computeNextOccurrence` takes a plain
  `{ dueDate, occurrencesCompleted }` state and a rule, returns a date or `null` — no I/O. The task store
  is the only place that calls it and persists the result, keeping the recurrence math itself trivially
  unit-testable in isolation from Dexie.

## Tradeoffs

- **No visual distinction between "this occurrence" and "the series"** in the UI beyond the repeat icon
  — e.g., there's no way yet to say "skip just this one" without either completing it (which rolls
  forward, the desired behavior) or deleting the whole series.
- **Weekly-with-specific-weekdays and interval > 1 don't compose** (e.g. "every 2 weeks on Mon/Wed" isn't
  representable) — `byWeekday` sets always step within a single week's cadence regardless of `interval`.
  The schema doesn't prevent setting both, but the engine ignores `interval` when `byWeekday` is present.
  Flagged rather than silently wrong: documented in `recurrence-engine.ts` and worth deciding if it's
  needed before the calendar milestone.
- **`recurrenceCount` is a new field on an already-shipped schema.** Since sync/backend hasn't landed
  yet, there's no migration concern today, but this is the first schema field added after initial
  ship — a reminder that once the sync engine exists, additive fields like this need a Prisma migration
  + client migration story, not just a zod default.

## Future improvements

- "Skip this occurrence" as a distinct action from "complete".
- Compose `interval` with `byWeekday` (e.g. biweekly on Mon/Wed) if a real use case demands it.
- Calendar view (upcoming milestone) should expand a few future occurrences for display without
  materializing them as real rows — `computeNextOccurrence` is already positioned to support that by
  being callable repeatedly without side effects.

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# Create a task with a due date, open Repeat -> try Daily/Weekdays/Weekly/Monthly/Custom.
# Complete it — watch it roll to the next date instead of moving to Completed.
pnpm test   # 62 web tests + 4 shared tests
```
