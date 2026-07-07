---
name: nestjs-code-review-conventions
description: Review a diff touching apps/api services/DTOs/guards or apps/web stores/repositories/domain logic — checking Prisma mutation correctness (version bumps, transactions, ownership checks), DTO validation completeness, offline-first repository/outbox invariants, or whether new logic landed in the right layer (domain vs. store vs. component). Use before approving PRs in this repo, not for generic style nits.
user-invocable: false
---

# Code review conventions

## Backend (apps/api) — checklist grounded in existing invariants

- **Version bump on every mutation.** Every service update/delete in `tasks.service.ts` and
  `sync.service.ts` includes `version: { increment: 1 }`. A new mutation that writes to a synced
  entity (Task/List/Tag) without bumping `version` will break optimistic-concurrency conflict
  resolution silently — flag this even if the PR's own tests pass.
- **Ownership check precedes mutation, and includes `userId` in the `where`.** `assertOwnership` in
  `tasks.service.ts` and the `findFirst({ where: { id, userId } })` pattern throughout `sync.service.ts`
  are the guard against cross-user data access. A new endpoint/service method that queries or mutates
  by `id` alone (no `userId` in the filter) is a data-leak bug, not a style issue.
- **Multi-statement writes are transactional when they must be atomic.** `tasks.service.ts#softDelete`
  wraps parent+subtask updates in `$transaction([...])`; `sync.service.ts#applyTaskChange` uses the
  callback form because later steps read earlier results. A PR that does two related Prisma writes
  outside a transaction is a correctness risk (partial-apply on failure) worth blocking on.
- **`undefined` vs `null` on optional/JSON fields.** Check any new optional field follows
  `toRecurrenceJson`'s pattern (`tasks.service.ts`) — `undefined` must mean "untouched," `null` must
  mean "clear," and Prisma needs `Prisma.JsonNull` for the latter on JSON columns specifically.
- **DTOs stay intentionally loose vs. the shared zod schema** (see comment in `task.dto.ts`) — don't
  ask an author to replicate every zod constraint as class-validator decorators; do check that
  `@IsOptional()`/type decorators exist for every field so `whitelist: true` in `main.ts` doesn't
  400 on a legitimate field the client sends.
- **No Swagger decorators exist in this repo** — don't request `@ApiProperty` etc. in review; it's
  not the established pattern (see [[nestjs-documentation-conventions]]).

## Frontend (apps/web)

- **Stores never touch Dexie/network directly.** `task-store.ts`'s header comment states this
  explicitly. A store method that imports `db` or calls `fetch`/`apiClient` directly instead of going
  through `container.resolve(TASK_REPO)` (or the relevant token) violates the offline-first golden
  rule in `ARCHITECTURE.md` §2 — flag it even if it "works."
  - Note: `sync-api.ts` and `SyncProvider.tsx` are the deliberate exception — the Sync Engine layer is
    where network calls are expected to live, per §7. Don't flag network calls made *there*.
- **Repository writes pair the entity mutation with an outbox entry.** Any new Dexie repository
  method that changes a synced entity should append to `db.outbox` in the same operation, mirroring
  `local-task-repository.ts` — a write with no outbox entry never syncs.
- **Pure logic (filtering/sorting/parsing/date math) belongs in `domain/`, not inline in a
  component/hook/store.** `useVisibleTasks.ts` delegates to `domain/task-queries.ts` for exactly this
  reason — new business-rule logic added directly inside a `.tsx` file or Zustand action is a layering
  smell to call out, even if functionally correct.

## What NOT to flag
- File length alone — only `TaskEditor.tsx` (297 lines) and `sync.service.ts` (316) exceed ~140 lines
  today, and both already delegate to sub-modules. Don't block a PR purely for size; check whether the
  new code has an obvious extraction point instead (see [[nestjs-refactoring-conventions]]).
- Missing RTL component tests — none exist yet anywhere in the repo, so absence isn't a regression
  (see the gap noted in [[nestjs-testing-conventions]]). Missing tests for new pure `domain/` functions
  or repository methods, however, is a real gap — those have consistent existing coverage to match.
