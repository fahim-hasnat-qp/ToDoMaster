# Feature 006 — Reminders, Notifications & Daily Summary

Status: **Shipped** · Builds on Milestones 1–5 (ARCHITECTURE.md §11, step 10)

## What shipped

- **`domain/reminders.ts`** — pure logic: `resolveReminderTime(task, reminder)` turns a DUE reminder
  (offset-minutes-before-due) or CUSTOM reminder (absolute time) into a concrete `Date`;
  `collectDueReminders(tasks, from, to)` finds everything firing in a window, skipping completed/
  archived/deleted tasks; `summarizeForDailyDigest(tasks, today)` builds the daily-summary body text.
- **`core/notifications.ts`** — thin wrapper over the browser `Notification` API: permission check/
  request, `notify()`. Permission is requested lazily, the first time a user actually adds a reminder —
  never proactively on load.
- **`ReminderScheduler`** (`features/reminders/reminder-scheduler.ts`) — arms `setTimeout`s for
  reminders due in the next hour, re-scanning every 5 minutes so edits and the rolling window stay
  covered. **`DailySummaryScheduler`** does the analogous thing for a single daily notification at a
  user-configured time, re-arming itself for the next day after firing.
- **`ReminderEditor`** in `TaskEditor` — quick-preset reminders (at due time / 10 min / 1 hour / 1 day
  before), multiple per task, only shown once a due date is set.
- **Minimal `SettingsScreen`** (`/app/settings`, replacing the `ComingSoon` placeholder) — notification
  permission status + Daily Summary time picker. Deliberately built as the seam the full Settings
  milestone (step 19: themes/accent/backup/export/import) will extend, not a throwaway page.

## Design & why — the one thing to read carefully

**This is client-only, best-effort scheduling, not real push notifications.** The browser
`Notification` API has no mechanism to fire at an arbitrary future time when the app isn't open — that
requires server-side Web Push (VAPID keys, a subscription per device, a backend trigger endpoint),
which doesn't exist until the Backend/Sync milestone. What's shipped here:

- Fires correctly **while the app/tab is open** — reminders and the daily summary work as expected
  during active use.
- Re-arms on load and every 5 minutes, so closing and reopening the tab before a reminder's time still
  catches it.
- **Does NOT fire if the tab/app is fully closed** on mobile or desktop. This is called out in three
  places on purpose — the code comment in `core/notifications.ts`, the Settings screen copy itself
  ("Only fires while the app is open in a tab"), and here — because silently shipping something that
  *looks* like real reminders but isn't would be a worse outcome than an honest limitation.

Other decisions:
- **Permission requested on first reminder add, not on app load.** Cold-requesting notification
  permission before the user has expressed intent is a well-known dark pattern that just trains people
  to reflexively deny; asking at the moment of adding a reminder is the point where the request makes
  sense to them.
- **Reminder domain logic has zero dependency on the Notification API or timers** — `resolveReminderTime`
  and `collectDueReminders` are pure date-in/date-out functions, so the scheduling math is fully unit
  tested without mocking browser globals or fake timers.
- **`ReminderEditor` only exposes DUE-type presets.** The `Reminder` schema already supports `CUSTOM`
  (arbitrary absolute time) but there's no UI for picking an arbitrary date/time reminder yet — the
  preset-offset UX covers the common cases from the spec ("Due Reminder", "Multiple Reminders") and
  "Custom Reminder" as an arbitrary-time picker is flagged as future work rather than half-built now.

## Tradeoffs

- No background push (see above) — the single biggest gap versus a "real" reminders feature, and
  unavoidable without a backend.
- `ReminderEditor` presets only; no arbitrary custom-time reminder picker yet.
- No reminder editing (only add/remove) — changing an offset means removing and re-adding.
- The Settings screen is intentionally minimal; it will grow substantially in step 19, not get replaced.

## Future improvements

- Real push notifications via a backend Web Push endpoint once the Backend/Sync milestone lands —
  `resolveReminderTime`/`collectDueReminders` are already positioned to be reused server-side (pure
  functions, same shared `Task`/`Reminder` types) to compute what to push and when.
- Custom absolute-time reminder picker (the schema already supports `ReminderType.CUSTOM`).
- Edit-in-place for existing reminders instead of remove-and-re-add.
- Snooze action on a fired notification (would need Service Worker notification actions, not just `Notification`).

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# Open a task, set a due date, add a reminder -> browser will prompt for permission.
# /app/settings -> set a Daily Summary time.
pnpm test   # 74 web tests
```
