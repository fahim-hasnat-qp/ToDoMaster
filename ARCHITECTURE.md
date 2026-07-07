# ToDoMaster — Architecture Design

> Status: **Draft for review** · Version 0.1 · Owner: Engineering
> This document is the source of truth for high-level design. Feature docs live in `docs/features/`.

---

## 0. Product Summary

A beautiful, fast, **offline-first** Todo PWA in the spirit of TickTick / Todoist / Microsoft To Do.
Installable on desktop and mobile, works fully offline, syncs to a cloud backend when online,
and gracefully resolves multi-device conflicts.

---

## 1. Tech Stack (locked)

### Frontend — `apps/web`
| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript** | Fast dev/build, first-class TS, PWA plugins |
| Styling | **TailwindCSS** + CSS variables for theming | Clean/minimal UI, dark mode + accent colors via tokens |
| State (UI/client) | **Zustand** | Minimal boilerplate, selective subscriptions → few rebuilds |
| Local DB | **Dexie (IndexedDB)** | Offline-first store, thousands of tasks, indexed queries |
| Server sync | **TanStack Query** + custom **Sync Engine** | Background sync, retries, cache |
| Routing | **React Router v6** | Nested routes for lists / views |
| PWA | **vite-plugin-pwa (Workbox)** | Service worker, offline shell, install prompt |
| Forms/validation | **react-hook-form + zod** | Shared zod schemas with backend contracts |
| Dates | **date-fns** + a small NLP parser | Quick Add natural-language parsing |
| Testing | **Vitest + React Testing Library + Playwright** | Unit, component, e2e |

### Backend — `apps/api`
| Concern | Choice | Why |
|---|---|---|
| Framework | **NestJS (TypeScript)** | DI-first, modular, mirrors SOLID emphasis |
| DB | **PostgreSQL** | Relational integrity, JSON columns where useful |
| ORM | **Prisma** | Type-safe queries, migrations |
| Auth | **JWT (access + refresh)** + email/password + guest | Guest → account upgrade path. **Revised**: OAuth (Google/Apple) dropped by explicit decision — email/password + Gmail SMTP verification only (see docs/features/009-auth-and-sync.md) |
| Validation | **class-validator / zod** on DTOs | Contract safety |
| Testing | **Jest + Supertest** | Unit + integration (e2e) |

### Shared — `packages/`
- `packages/shared` — TypeScript types, zod schemas, sync protocol contracts, domain enums (Priority, RecurrenceRule, etc.). **Single source of truth** shared by web + api. Kills duplication.

### Monorepo tooling
- **pnpm workspaces** + **Turborepo** for task orchestration and caching.
- **Docker Compose** for local Postgres.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         apps/web (PWA)                        │
│                                                               │
│  ┌───────────┐   ┌────────────────┐   ┌───────────────────┐  │
│  │    UI      │→ │  Domain / Logic │→ │   Data Layer       │  │
│  │ (features/ │  │ (use-cases,     │  │ (repositories)     │  │
│  │  components)│ │  stores)        │  │                    │  │
│  └───────────┘   └────────────────┘   └────────┬──────────┘  │
│                                                 │             │
│                          ┌──────────────────────┴─────────┐  │
│                          │  Local Repo (Dexie/IndexedDB)   │  │  ← source of truth offline
│                          └──────────────────────┬─────────┘  │
│                                                 │             │
│                          ┌──────────────────────┴─────────┐  │
│                          │        Sync Engine              │  │  ← outbox + pull/push + merge
│                          └──────────────────────┬─────────┘  │
└─────────────────────────────────────────────────┼───────────┘
                                                   │ HTTPS (REST + JSON)
┌──────────────────────────────────────────────────┼───────────┐
│                        apps/api (NestJS)          │            │
│   Controllers → Services → Repositories → Prisma → Postgres    │
│   Auth · Tasks · Lists · Tags · Sync · Stats · Notifications   │
└────────────────────────────────────────────────────────────────┘
```

**Golden rule (offline-first):** The UI **only ever talks to the local repository**. It never calls the
network directly. Writes go to IndexedDB immediately + enqueue an outbox entry. The Sync Engine reconciles
with the server in the background. This is what makes the app feel instant and work fully offline.

### Layer responsibilities (both apps)
1. **UI / Presentation** — dumb-ish React components, hooks, screens. No business rules.
2. **Domain / Application** — use-cases, entities, pure functions (recurrence expansion, NLP parse, sorting/filtering, stats, gamification XP math). Framework-agnostic → easy to unit test.
3. **Data** — repositories behind interfaces (Repository Pattern). Local impl = Dexie; remote impl = HTTP client. DI swaps them.

---

## 3. Folder Structure

```
ToDoMaster/
├─ package.json                 # pnpm workspace root
├─ pnpm-workspace.yaml
├─ turbo.json
├─ docker-compose.yml           # local postgres
├─ ARCHITECTURE.md
├─ docs/
│  ├─ features/                 # one md per feature (design + tradeoffs + future work)
│  └─ adr/                      # architecture decision records
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ domain/             # enums, value objects (Priority, RecurrenceRule)
│        ├─ dto/                # zod schemas + inferred types (Task, List, Tag…)
│        ├─ sync/               # sync protocol contracts (Change, PushRequest…)
│        └─ index.ts
├─ apps/
│  ├─ web/
│  │  └─ src/
│  │     ├─ app/                # app shell, router, providers, DI container
│  │     ├─ core/               # cross-cutting: logger, analytics, config, errors, di
│  │     ├─ data/
│  │     │  ├─ db/              # Dexie schema + migrations
│  │     │  ├─ repositories/    # LocalTaskRepository, RemoteTaskRepository, interfaces
│  │     │  └─ sync/            # SyncEngine, Outbox, conflict resolver
│  │     ├─ domain/             # use-cases + pure logic (recurrence, nlp, sort, filter, stats, xp)
│  │     ├─ features/           # feature-based UI slices
│  │     │  ├─ tasks/
│  │     │  ├─ lists/
│  │     │  ├─ smart-lists/
│  │     │  ├─ search/
│  │     │  ├─ calendar/
│  │     │  ├─ statistics/
│  │     │  ├─ gamification/
│  │     │  ├─ auth/
│  │     │  └─ settings/
│  │     ├─ components/         # reusable design-system components (Button, Sheet, Chip…)
│  │     ├─ hooks/              # shared hooks
│  │     ├─ stores/             # zustand stores (ui, settings, session)
│  │     └─ styles/             # tailwind + tokens
│  └─ api/
│     └─ src/
│        ├─ main.ts
│        ├─ app.module.ts
│        ├─ common/             # guards, interceptors, filters, logger, pipes
│        ├─ prisma/             # PrismaService + module
│        └─ modules/            # feature modules (auth, tasks, lists, tags, sync, stats)
│           └─ tasks/
│              ├─ tasks.controller.ts
│              ├─ tasks.service.ts
│              ├─ tasks.repository.ts
│              └─ dto/
└─ prisma/
   └─ schema.prisma
```

**Why feature-based:** each feature owns its UI, hooks, and wiring; cross-cutting logic lives in `domain`/`data`.
Adding a feature = adding a folder, not editing ten shared files. Scales to many contributors.

---

## 4. Data Model (domain)

Core entities (all carry sync metadata — see §7):

- **Task**: id, title, description, notes, listId, priority(0–3), dueDate, dueTime, isAllDay,
  completed, completedAt, archived, deletedAt(soft), recurrence(RecurrenceRule|null),
  parentTaskId(for subtasks), order, createdAt, updatedAt, + sync fields.
- **ChecklistItem**: id, taskId, text, done, order.
- **Tag**: id, name, color. **TaskTag**: taskId, tagId (many-to-many).
- **List**: id, name, color, icon, isDefault, order.
- **Reminder**: id, taskId, remindAt, type(DUE|CUSTOM), offsetMinutes.
- **Attachment**: id, taskId, kind(IMAGE|VOICE|PDF), url, sizeBytes, localBlobRef.
- **Stats / gamification** computed from tasks + an append-only **ActivityEvent** log
  (COMPLETED, CREATED…) → XP, levels, streaks, achievements.

**Sync metadata on every synced row:** `id (uuid)`, `updatedAt`, `deletedAt`, `version`, `lastSyncedAt`, `dirty(bool)`.

Priorities: `NONE=0, LOW=1, MEDIUM=2, HIGH=3`.
Recurrence stored as a structured rule (RFC-5545-inspired subset): `{ freq, interval, byWeekday?, until?, count? }`.

---

## 5. Database Schema (Postgres via Prisma) — summary

- `User (id, email, passwordHash?, provider, displayName, avatarUrl, createdAt)`
- `List`, `Task`, `Tag`, `TaskTag`, `ChecklistItem`, `Reminder`, `Attachment`, `ActivityEvent`
- Every syncable table: `id UUID pk`, `userId FK`, `updatedAt`, `deletedAt NULL`, `version INT`.
- Indexes tuned for the hot queries: `(userId, listId)`, `(userId, dueDate)`, `(userId, completed)`,
  `(userId, updatedAt)` for delta pulls.
- Soft deletes (`deletedAt`) so deletions propagate across devices.

Local Dexie mirrors these tables with the same ids, plus an **`outbox`** table and a **`syncState`** table.

---

## 6. Navigation

```
/                         → redirect to /app/today
/login, /register, /verify-email, /forgot-password, /reset-password  → auth flows (email/password + guest)
/app  (shell: sidebar + topbar + content)
  /app/today              → Smart list: Today
  /app/upcoming
  /app/overdue
  /app/completed
  /app/all
  /app/priority
  /app/no-date
  /app/list/:listId       → custom / default list
  /app/tag/:tagId
  /app/search?q=
  /app/calendar           → month | week | agenda (tab)
  /app/stats
  /app/settings/*
Task detail = slide-over/sheet layered over any route (so it works everywhere).
```

Responsive: sidebar collapses to a bottom nav + drawer on mobile widths.

---

## 7. Sync Engine (the hard part — designed carefully)

**Model:** Local-first with an **Outbox** + **delta pull** + **field-aware Last-Writer-Wins with version guards**.

### Write path (optimistic)
1. UI calls `TaskRepository.update(task)`.
2. Local repo writes to Dexie, sets `dirty=true`, bumps local `updatedAt`.
3. An **Outbox** entry is appended: `{ entity, entityId, op, payload, baseVersion, clientTs }`.
4. UI re-renders instantly from Dexie. Done — no network needed.

### Sync cycle (background, on reconnect / interval / manual)
1. **Push**: send outbox batch → `POST /sync/push`. Server applies with conflict rules, returns
   authoritative rows + new versions. Clear/patch outbox.
2. **Pull**: `GET /sync/pull?since=<lastSyncCursor>` → server returns all rows changed since cursor
   (including tombstones). Merge into Dexie.
3. Persist new `lastSyncCursor` (server `updatedAt` high-watermark) in `syncState`.

### Conflict resolution
- Each row has a monotonic `version`. Push includes `baseVersion`.
- Server accepts if `baseVersion == current`. Else **conflict**:
  - **Implemented as whole-row LWW by `clientTs` vs. the server row's `updatedAt`**, not field-level
    merge. **Revision of the original design**: field-level merge requires the outbox to carry per-field
    diffs; the outbox as built (see `Change` in `packages/shared/sync/protocol.ts`) carries a full entity
    snapshot per change, so the server has no way to know which fields the client actually intended to
    touch versus which were merely present at their old value. Implementing the originally-envisioned
    field-level merge on top of full snapshots would mean guessing at diffs — worse than an honest LWW.
    See `apps/api/src/modules/sync/conflict-resolver.ts` for the implementation and this same reasoning
    in code. Upgrading the outbox to carry diffs (or per-field versions) is the documented path to real
    field-level merge — see §"Future".
  - The losing side's change is discarded, not queued/retried — its outbox entry is dropped after the
    push response is processed. Surfacing "you lost a conflicting edit" to the user is noted as future work.
- Deletes always win over edits (tombstone) **except when the incoming op is itself the delete of an
  already-deleted row**, which is treated as an idempotent no-op via `opId` dedup. Completion toggles use LWW.
- This is deterministic and multi-device safe without heavyweight CRDTs; §"Future" notes the CRDT upgrade path.

### Guarantees
- **Idempotent**: outbox ops carry a client-generated `opId`; server dedupes.
- **Atomic batches**: push applied in a transaction per batch.
- **No lost writes offline**: outbox is durable in IndexedDB, survives reloads.

---

## 8. UI / Design System

- **Tokens** as CSS variables: `--bg`, `--surface`, `--text`, `--muted`, `--accent`, priority colors,
  radius, spacing, shadows. Dark mode = swap token set on `<html data-theme>`. Accent color = swap `--accent`.
- **Primitives**: Button, IconButton, Input, Textarea, Checkbox (with satisfying complete animation),
  Chip/Tag, Select, DatePicker, Sheet/Drawer, Modal, Toast, EmptyState, Skeleton.
- **Motion**: Framer Motion, subtle — list reorder, task complete, sheet slide. Respect `prefers-reduced-motion`.
- **A11y**: semantic roles, focus management in sheets/modals, keyboard shortcuts, ARIA on interactive bits.
- **Responsive**: mobile-first; sidebar ↔ bottom-nav; task sheet full-height on mobile, side panel on desktop.

---

## 9. Cross-Cutting Concerns

- **DI**: NestJS DI on backend; a lightweight token-based container/provider on web so repositories
  and services are injected (swap Local/Remote/mock in tests).
- **Error handling**: typed `Result`/error boundaries on web; Nest exception filters + problem+json on api.
- **Logging**: pluggable `Logger` interface (console in dev, sink hook in prod).
- **Analytics**: `Analytics` interface with `track(event, props)` — no-op by default, real sink later.
- **AI seam**: `AiPlanner` interface (`suggestSubtasks`, `suggestPriority`, `planDay`, `parseTask`) with a
  local heuristic impl now; swap for an LLM-backed impl later. No feature code changes when we add the LLM.

---

## 10. Testing Strategy

- **Unit**: pure domain logic (recurrence, NLP, sort/filter, XP, conflict resolver) — highest ROI, 100% target.
- **Component**: RTL for key components.
- **Integration**: web repo ↔ Dexie (fake-indexeddb); api controllers ↔ test Postgres (Supertest).
- **E2E**: Playwright happy paths incl. an **offline→online sync** scenario.

---

## 11. Delivery Plan (feature-by-feature, always buildable)

Each step ends green (build + tests pass). Order respects dependencies.

0. **Scaffold**: monorepo, shared package, web app boots, api boots, docker postgres, CI-lint. ← *first*
1. **Design system + app shell + navigation** (no data yet).
2. **Local data layer**: Dexie schema, repository interfaces + local impls, DI, seed default lists.
3. **Tasks CRUD** (create/edit/complete/undo/delete/duplicate/archive) — fully offline.
4. **Lists** (default + custom) & **Tags**.
5. **Smart Lists** + **Sorting** + **Filtering**.
6. **Search**.
7. **Subtasks & Checklists**.
8. **Quick Add** (NLP parsing).
9. **Recurring tasks**.
10. **Reminders/Notifications** (Notifications API + scheduling) & **Daily Summary**.
11. **Calendar views** (month/week/agenda).
12. **Backend**: NestJS modules, Prisma schema, auth (email/password + guest), REST endpoints. ✅
13. **Sync engine**: outbox, push/pull, conflict resolution (client + server). ✅
14. **Auth on web**: guest mode → account, email/password + verification (no OAuth — see §3 revision). ✅
15. **Statistics**.
16. **Gamification** (XP/levels/streaks/achievements/badges).
17. **AI features** (heuristic impls behind the `AiPlanner` seam).
18. **Attachments** (images/voice/PDF).
19. **Settings** (themes/accent/dark mode/backup/restore/export/import).
20. **PWA polish + Widgets** (installability, offline shell; platform widget notes).

---

## 12. Key Tradeoffs (called out honestly)

- **LWW+versioning over CRDTs**: simpler, deterministic, good enough for a Todo app's edit patterns.
  Tradeoff: rare concurrent same-field edits pick a winner rather than truly merging. Upgrade path documented.
- **PWA over native**: one codebase, instant updates, installable. Tradeoff: iOS PWA limits
  (background notifications, some widget capabilities). We degrade gracefully and note native shims later.
- **Dexie/IndexedDB**: great for structured offline data. Tradeoff: no SQL joins → we denormalize/index carefully.
- **Monorepo (pnpm+turbo)**: shared types kill drift. Tradeoff: slightly more initial setup.

---

## 13. Future Improvements (backlog)

- CRDT (Yjs/Automerge) sync upgrade for true concurrent merge.
- Real LLM behind `AiPlanner` (OpenAI/Anthropic) with streaming daily-planning.
- Collaboration / shared lists (multi-user) — model already user-scoped.
- Native wrappers (Capacitor) for richer notifications/widgets on iOS.
- Server-push sync (WebSocket/SSE) instead of polling.
- Full-text search server-side (Postgres `tsvector`).
```
