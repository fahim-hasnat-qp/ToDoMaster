# Feature 004 — Quick Add (Natural Language Parsing)

Status: **Shipped** · Builds on Milestones 1–3 (ARCHITECTURE.md §11, step 8)

## What shipped

- **`domain/quick-add-parser.ts`** — a pure, dependency-free heuristic parser: `"Doctor tomorrow 5pm"`
  → `{ title: "Doctor", dueDate: <tomorrow>, dueTime: "17:00" }`. Also understands:
  - Relative dates: `today`, `tomorrow`, `yesterday`, `in N days`, `next <weekday>`, a bare weekday
    name (resolves to the upcoming occurrence).
  - Times: `5pm`, `5:30pm`, `17:30`, `at 5`.
  - Priority: `!1`/`!2`/`!3` (high/medium/low) or the word `urgent`.
  - Tags: `#tagname` (any number, repeatable).
  - List: `@listname` (first match wins).
  - Everything else, whitespace-collapsed, becomes the title.
- **`QuickAddBar`** — an always-visible inline input at the top of every task list view (`TaskListView`),
  with a live preview line ("tomorrow 17:00 · priority: 3 · #health") that updates as you type, and
  creates the task on Enter.
- **`useQuickAdd`** hook — resolves the parser's free-text `listName`/`tagNames` against the real
  List/Tag stores: matching tags are reused, unmatched tags are **created on the fly** (matches
  Todoist/TickTick behavior — typing `#newtag` shouldn't require a trip to Tag settings first).
  Lists are matched but never auto-created — a typo'd list name silently spawning a new list is more
  surprising than helpful, so it just falls back to no list.

## Design & why

- **No parsing library.** The spec only asks for a handful of phrase shapes; a regex-based extractor
  is ~200 lines, has zero bundle-size cost, and is completely deterministic — important for unit tests
  and for a UI that shows a live preview on every keystroke (a heavier library would add latency).
- **This is the local implementation of the `AiPlanner` seam** (ARCHITECTURE.md §9). `parseQuickAdd`
  has a stable input/output shape (`string → QuickAddResult`) that an LLM-backed parser could satisfy
  identically later — the UI and `useQuickAdd` resolution logic wouldn't change at all, only what sits
  behind `parseQuickAdd` itself.
- **Extraction order matters and is deliberate**: symbol-prefixed tokens (`#tag`, `@list`, `!1`) are
  unambiguous and stripped first; date/time phrases (which can span multiple words and overlap with
  ordinary English) are stripped last, so a title like "Buy milk #shopping" doesn't have "milk"
  mistaken for anything.
- **A time is dropped if no date was found.** "Call at 5pm" without a date has no calendar day to attach
  the time to — silently keeping a dangling `dueTime` with `dueDate: null` would violate the schema's
  intent (`dueTime` only means something alongside a `dueDate`). Tested explicitly.
- **QuickAddBar augments, not replaces, the full `TaskEditor`.** The FAB still opens the complete form
  for deliberate editing (subtasks, checklist, description, notes); Quick Add is for the "type and go"
  case. Both create through the same `task-store`, so there's exactly one code path for task creation.

## Tradeoffs

- **Heuristic, not exhaustive.** Phrases like "3 days" inside an unrelated title (e.g. "Review 3 days
  of logs") will be misread as "in 3 days". This is the inherent cost of a regex-based parser without
  full sentence understanding; documented rather than solved, since solving it properly means the LLM
  swap noted above, not more regex.
- **Bare weekday ambiguity**: typing just "Friday" as part of a title (e.g. "Friday night movie club")
  will be parsed as a due date, consuming the word "Friday" from the title. No escape hatch (like
  quoting) exists yet.
- **Tag auto-creation has no undo path in the quick-add flow itself** — if you mistype `#hlth`, it
  creates a real tag. Cleanup is a trip to `/app/tags` (already supports delete). Acceptable given tags
  are cheap and disposable.

## Future improvements

- Escape/quote syntax to force literal text past the parser (e.g. `"Friday Night Live" screening`).
- Highlight matched tokens live in the input itself (not just the preview line below it), the way
  Todoist underlines recognized date phrases as you type.
- Swap `parseQuickAdd`'s implementation for an LLM call behind the same signature once the AI milestone
  lands, for phrases the heuristic can't reach ("the day after next Friday", "in 2 weeks on Tuesday").

## Verify locally

```bash
pnpm --filter @todomaster/web dev
# Any task list view (e.g. /app/today) now has a Quick Add row above the task list.
# Try: "Doctor tomorrow 5pm #health !1" and watch the live preview.
pnpm test   # 47 tests
```
