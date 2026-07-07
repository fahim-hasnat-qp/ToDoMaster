# Feature 008 — Backend (NestJS + Prisma + Auth + Sync API)

Status: **Shipped** · ARCHITECTURE.md §11, step 12 (+ the server half of step 13)

## What shipped

A new `apps/api` NestJS service, fully wired into the pnpm/Turborepo workspace:

- **Prisma schema** (`prisma/schema.prisma`) mirroring every shared entity: `User`, `List`, `Task`,
  `Tag`, `TaskTag` (explicit join table), `ActivityEvent`. Every syncable table carries
  `id/createdAt/updatedAt/deletedAt/version`, matching `packages/shared`'s `SyncMeta` exactly.
  `checklist`/`reminders`/`recurrence` are stored as `Json` columns on `Task` — they have no
  independent query pattern or lifecycle outside "belongs to this task."
- **Auth module**: email/password register+login (bcrypt, 12 rounds) issuing short-lived access +
  long-lived refresh JWTs; a `guest` endpoint creating an anonymous account with no credentials; a
  `refresh` endpoint. Google/Apple OAuth endpoints are **not implemented** — see "What's deliberately
  not done" below.
- **Tasks/Lists/Tags REST modules**: standard CRUD, JWT-guarded, scoped to the authenticated user via
  `assertOwnership` checks on every mutation. **Both List and Tag deletion mirror the client's exact
  data-integrity behavior** from Milestone 2 — deleting a list reassigns its tasks to `listId: null`
  instead of orphaning them; deleting a tag strips it from every task's `tagIds` (via `TaskTag`
  cleanup) — same invariant, enforced identically offline and online.
- **Sync module** implementing the push/pull protocol exactly as specified in
  `packages/shared/src/sync/protocol.ts` (which was designed back in Milestone 1, before any server
  existed): `POST /sync/push` applies a batch of outbox changes atomically per-change, `opId`-deduped;
  `GET /sync/pull?since=` returns delta rows (including tombstones) with a cursor and `hasMore` flag.
- **Conflict resolver** (`sync/conflict-resolver.ts`) — see "Design change" below, the most important
  thing to understand about this milestone.
- **Contract tests** (`test/contract.spec.ts`) that validate the API's actual mapped responses against
  the *same* zod schemas (`taskSchema`, `listSchema`, `tagSchema`) the client uses — proof, not
  assertion, that server and client agree on shape.

## Design change from the original architecture — read this one

ARCHITECTURE.md originally specified **field-level merge** for non-overlapping conflicting edits
(e.g., device A changes `title`, device B changes `dueDate` — merge both). Implementing the sync
module surfaced a real constraint: the outbox protocol (`Change.payload`, designed in Milestone 1)
carries a **full entity snapshot** per change, not a per-field diff. Given only two full snapshots and
no record of "which fields did the client actually intend to touch," a server cannot tell field-level
intent apart from "this field happened to already be at this value." Implementing field-level merge on
top of full snapshots would mean guessing — worse than an honest whole-row decision.

**What's implemented instead**: whole-row last-writer-wins, comparing the incoming change's `clientTs`
against the current server row's `updatedAt`. Deletes always win over edits. This is documented in three
places that all say the same thing for a reason — silent scope-narrowing on a previously-designed
guarantee is exactly the kind of thing that should be loud, not quiet:
1. `ARCHITECTURE.md` §7 (the source-of-truth design doc, updated in place with a "Revision" note)
2. `apps/api/src/modules/sync/conflict-resolver.ts` (the implementation)
3. Here.

The upgrade path (outbox carrying per-field diffs, or per-field versions) is real and noted as future
work — it's a protocol change, not a resolver rewrite.

## Other design decisions & why

- **Guest accounts are real `User` rows with no credentials**, not a client-side-only concept. This
  means a guest's tasks sync immediately if the app ever calls `/sync/push` for them — "upgrade to a
  real account" later just means attaching an email/password or OAuth identity to the *same* user id,
  not a data migration. That upgrade endpoint isn't built yet (next milestone: Auth on web).
- **DTOs use loose class-validator rules, not a re-implementation of the zod schemas.** The shared zod
  schemas in `packages/shared` are the single source of truth for the full contract and are re-validated
  client-side; duplicating every zod rule as class-validator decorators would just be two schemas
  drifting over time. The API DTOs validate types and basic shape (UUID format, date regex, priority
  range) — enough to reject garbage before it hits Prisma — the contract tests catch the rest.
- **`version` increments happen server-side only**, via Prisma's `{ increment: 1 }`, never trusted from
  the client payload. This is what makes the whole conflict model safe against a malicious or buggy
  client claiming a version it doesn't have.
- **Subtask and orphan-reassignment version bumps are explicit.** Soft-deleting a parent task or a list
  also increments the `version` of every affected subtask/orphaned task in the same transaction — without
  this, a client's next sync push against one of those rows would carry a `baseVersion` the server no
  longer recognizes as current, causing a spurious conflict.

## What's deliberately not done (and why it's a fork, not an oversight)

- **Google/Apple OAuth are not wired up.** `passport-google-oauth20` / a `passport-apple` strategy are
  mechanical to add once real client credentials exist — but those credentials come from the Google
  Cloud Console and Apple Developer portal and require your organization's identity (app names,
  redirect URIs, signing keys, possibly a paid Apple Developer account). This is exactly the kind of
  decision-only-you-can-make fork flagged at the start of this session: I can wire the strategies the
  moment you have the credentials, but I can't obtain or invent them. `.env.example` documents exactly
  which values are needed.
- **No rate limiting / brute-force protection on `/auth/login`** yet — flagged as a pre-production
  gap, not shipped silently.
- **No Web Push** (real background notifications) — this was already flagged as a gap in the Reminders
  milestone; the backend now exists but push subscription storage + a trigger endpoint aren't built.
  Noted as future work in this doc too since it's now technically unblocked.

## Tradeoffs

- Whole-row LWW instead of field-level merge (above) — the single most consequential tradeoff in this
  milestone.
- `checklist`/`reminders`/`recurrence` as `Json` columns means no server-side query "find all tasks with
  an overdue reminder" without a full scan — acceptable since reminder scheduling is currently
  client-only (see Reminders milestone); would need reconsideration if server-triggered push notifications
  land.
- The `applySimpleEntityChange` generic in `sync.service.ts` uses one internal `as unknown as {...}` cast
  to share logic between List and Tag changes (structurally identical, but Prisma generates distinct
  types per model with no common interface). Contained to one private method; not exposed.

## Future improvements

- Outbox diffs (field-level change tracking) to unlock real field-level merge.
- Google/Apple OAuth once credentials are available.
- Rate limiting on auth endpoints.
- Web Push subscriptions + a trigger endpoint, reusing the reminder-resolution logic already built
  client-side (`domain/reminders.ts` was explicitly designed to be reusable here).
- Surface lost-conflict edits to the user instead of silently discarding them.

## Verify locally

```bash
docker compose up -d db
cd apps/api
cp .env.example .env
pnpm exec prisma migrate dev
pnpm dev                        # boots on :3000 by default; set PORT to avoid local conflicts
pnpm test                       # 11 tests: conflict resolver + response-shape contract tests

# Or from the repo root:
pnpm test                       # runs shared + web + api across the whole workspace (100 tests)
```
