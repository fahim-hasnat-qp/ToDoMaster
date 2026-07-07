# Feature 007 — Calendar Views (Month / Week / Agenda)

Status: **Shipped** · Builds on Milestones 1–6 (ARCHITECTURE.md §11, step 11)

## What shipped

- **`domain/calendar.ts`** — pure grid/grouping logic: `buildMonthGrid` produces a full 6-week (42-day)
  grid including leading/trailing days from adjacent months, `buildWeekGrid` produces a single Mon–Sun
  week, `buildAgenda` groups incomplete tasks by due date chronologically within a rolling window
  (default 60 days). All three bucket tasks by `dueDate` in O(1) per task, not O(days × tasks).
- **`CalendarScreen`** (`/app/calendar`, replacing the `ComingSoon` placeholder) with a Month/Week/Agenda
  tab switcher and prev/today/next navigation (hidden in Agenda mode, where "window from today" is the
  only sensible frame).
- **`MonthView`** — classic grid, up to 3 tasks per day inline with a "+N more" overflow indicator,
  today highlighted, out-of-month days dimmed.
- **`WeekView`** — 7 day-columns, each task shown with its own checkbox so you can complete tasks
  directly from the calendar, not just view them.
- **`AgendaView`** — flat chronological list grouped by date header, closest in spirit to "Upcoming"
  but spanning further out and grouped visually by day.
- All three views open the existing `TaskEditor` on task click and share the same complete/undo and
  recurrence-roll toast logic already used by `TaskListView` and `SearchScreen` — no new completion
  code path.

## Design & why

- **No new data model.** Calendar is purely a different lens over the same `Task[]` already in the
  store — `dueDate` was always there. This is why the whole feature is additive: no schema change, no
  migration, no repository change.
- **Grouping happens once per render via a `Map`, not a nested loop.** `buildMonthGrid`/`buildWeekGrid`/
  `buildAgenda` all build a `Map<dueDate, Task[]>` once, then look up each grid cell — O(tasks + days)
  instead of O(tasks × days), which matters once the "thousands of tasks" performance target is real.
- **Agenda excludes completed tasks; Month/Week don't.** Agenda's job is "what's coming up," so a
  completed task there would just be noise. Month/Week are more of a visual overview of the whole
  period, where seeing a struck-through completed task in its day cell is useful context (you did
  finish something that day), not clutter.
- **Weeks start Monday (ISO)**, consistent with the `Weekday` enum already used by the recurrence engine
  — one convention across the whole app, not a per-feature choice.

## Tradeoffs

- **Recurring tasks are not expanded on the calendar.** A weekly recurring task shows on its *current*
  due date only, not projected onto every future Tuesday. `computeNextOccurrence` (from the Recurring
  Tasks milestone) is deliberately a pure, repeatable function specifically so a future pass can call it
  N times to render a "ghost" projection without materializing real task rows — flagged as the natural
  next step rather than built speculatively now.
- **Month view caps at 3 visible tasks per day** with a "+N more" label that isn't yet clickable (no
  day-detail popover). Acceptable for a first pass; the day cell already has the full task list in
  `CalendarDay.tasks`, so wiring a popover later is a UI-only change.
- **No drag-to-reschedule** (dragging a task to a different day to change its due date) — a common
  calendar-app affordance, out of scope for this slice.

## Future improvements

- Render a few projected future occurrences of recurring tasks (dimmed/ghosted) using the existing
  `computeNextOccurrence`, without creating real rows.
- Day-detail popover/sheet when a month cell has more tasks than fit inline.
- Drag-and-drop rescheduling across day cells (Week/Month) — would call the existing `update()` task
  action with a new `dueDate`, no new domain logic needed.
- Filter the calendar by list/tag (compose with `matchesFilters`, already built in Milestone 1).

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# /app/calendar -> switch between Month / Week / Agenda, navigate months/weeks, click a task.
pnpm test   # 85 tests
```
