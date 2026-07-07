# Feature 001 — Foundation + Offline Tasks CRUD

Status: **Shipped** · Milestone 1 · Delivery plan steps 0–3 (ARCHITECTURE.md §11)

## What shipped

A fully working, **offline-first** Todo app you can run in the browser:

- **Monorepo**: pnpm workspaces + Turborepo. `packages/shared` (types/DTOs/sync contracts),
  `apps/web` (the PWA). Docker Compose for Postgres (used by the backend milestone).
- **Design system**: token-based theming (dark/light + 5 accent colors via CSS variables),
  primitives (`Button`, `Input`, `Textarea`, `Checkbox`, `Sheet`, `Chip`, `Field/Fieldset`,
  `EmptyState`, `Toaster`, `ComingSoon`), subtle Framer Motion, reduced-motion + focus-visible a11y.
- **App shell + navigation**: responsive sidebar (desktop) ↔ bottom nav (mobile), React Router routes
  for all seven smart lists, custom lists, and placeholders for the not-yet-built features.
- **Local data layer**: Dexie (IndexedDB) schema with sync-ready indexes, Repository Pattern behind
  interfaces, a token-based DI container, an atomic **outbox** on every write, seeded default lists.
- **Tasks CRUD**: create / edit / complete (with animated check + **Undo** toast) / delete (soft, with
  subtask cascade) / duplicate / archive — all offline, all optimistic.
- **Smart lists**: Today, Upcoming, Overdue, High Priority, No Due Date, All, Completed — computed by
  pure predicates. **Sorting** by due date / priority / alphabetical / created / modified.
- **Tests**: 24 passing (pure domain queries + repository integration on fake-indexeddb).

## Design & why

- **UI never touches storage or network directly** — it goes through an injected `TaskRepository`.
  This is the offline-first golden rule and it's what makes swapping in the remote/sync layer later a
  zero-feature-change operation.
- **Every write is atomic with its outbox entry** (same Dexie transaction) so nothing is lost on reload
  — the durable foundation for the sync engine (ARCHITECTURE.md §7).
- **Pure domain logic** (`domain/task-queries.ts`) is framework-free → the highest-ROI unit tests.
- **`packages/shared` is the single source of truth** for entity shapes → web and (future) api can't drift.

## Tradeoffs

- **Single JS bundle (~550 KB / 174 KB gzip)** — fine to launch, but flagged. Route-level code-splitting
  and `manualChunks` are a scheduled performance pass.
- **No `tailwind-merge`** yet — `cn` is a thin clsx wrapper; conflicting utility classes aren't deduped.
  Cheap to upgrade if it bites.
- **`ensureDefaults` patches `isDefault` on the row post-create** rather than through the create schema
  (which intentionally omits it). Documented in code; correct, just slightly indirect.
- Sonarish lint suggested optional-chaining on `!row || row.deletedAt !== null` guards — kept the explicit
  two-condition form for correctness/readability; will revisit under the ESLint config pass.

## Future improvements (next milestones, in order)

Lists & Tags CRUD UI → Search → Subtasks/Checklists UI → Quick Add (NLP) → Recurring → Reminders →
Calendar → **Backend (NestJS/Prisma/auth)** → **Sync engine** → Auth on web → Stats → Gamification →
AI seam → Attachments → Settings → PWA/widgets polish + code-splitting.

## Verify locally

```bash
pnpm install
pnpm --filter @todomaster/web dev     # http://localhost:5173
pnpm test                             # 24 tests
pnpm --filter @todomaster/web build   # prod + service worker
```
