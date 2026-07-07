---
description: Implement a full feature lifecycle — spec doc, approval gate, implementation, tests, auto-fix retry loop, self-review — for apps/api or apps/web
allowed-tools: Read, Write, Edit, Glob, Bash(pnpm --filter @todomaster/api test*), Bash(pnpm --filter @todomaster/web test*), Bash(pnpm --filter @todomaster/shared test*), Bash(pnpm --filter @todomaster/api typecheck), Bash(pnpm --filter @todomaster/web typecheck), Bash(pnpm --filter @todomaster/api lint), Bash(pnpm --filter @todomaster/web lint), Bash(git status), Bash(git diff*)
argument-hint: <feature description, e.g. "add subtask reminders" or "per-list default sort order">
disable-model-invocation: true
---

# Feature

Request: $ARGUMENTS

This command inlines the equivalent of `/test`, `/debug`, and `/review` as steps below —
nested slash-command invocation isn't supported, so each step directly applies the
relevant skill's conventions instead of shelling out to the command.

## Steps

### 1. Parse the request
Identify which side(s) this touches — `apps/api` (NestJS/Prisma), `apps/web`
(React/Zustand/Dexie), or both — and whether it's a new module or an extension of an
existing one. If ambiguous, say so and state your assumption rather than guessing silently.

### 2. Read existing patterns
Before designing anything, read one existing feature end-to-end as the structural template:
- Backend: `apps/api/src/modules/lists/` (`dto/list.dto.ts` → `lists.service.ts` →
  `lists.controller.ts` → `lists.module.ts`) is the reference shape — class-validator DTOs,
  `PrismaService` injection, an `assertOwnership` guard clause, version-increment on every
  mutation, multi-statement writes wrapped in `$transaction`, `@UseGuards(JwtAuthGuard)` +
  `@CurrentUser()` for `userId` scoping, no Swagger decorators.
- Frontend: `apps/web/src/features/lists/` (`list-store.ts`) plus
  `apps/web/src/data/repositories/local-list-repository.ts` — stores never touch
  Dexie/`fetch` directly; repositories pair every entity mutation with an outbox entry.
- Check `docs/features/` for the highest existing number (currently through
  `009-auth-and-sync.md`) and its structure (`## What shipped`, `## Design & why`,
  `## Tradeoffs`, `## Future improvements`, `## Verify locally`) — the new spec doc
  must continue this sequence and shape, not invent a new one.

### 3. Write the spec doc and STOP for approval
Write `docs/features/NNN-short-name.md` (next number in sequence) covering:
- What will ship (entities/fields/endpoints/UI touched)
- Design & why (which existing patterns/primitives are reused, any new ones and why
  they're justified)
- Scope boundary (see Step 8) — list the exact files/modules that will be touched
- Verify locally (the command(s) that will prove it works)

**Do not write any implementation code yet.** Present the spec doc's path and a short
summary, then explicitly wait for the user to approve, request changes, or reject it.
Treat anything short of a clear go-ahead ("looks good", "approved", "yes") as not approved.

### 4. Implement
On approval, implement following the patterns identified in Step 2. Stay inside the
scope boundary declared in the approved spec (see Step 8). If implementation reveals the
spec was wrong or incomplete in a material way, stop and re-confirm with the user rather
than silently expanding scope.

### 5. Generate tests
Apply `nestjs-testing-conventions` to pick the matching pattern:
- NestJS service → mock Prisma as plain `jest.fn()` objects per model method actually
  used, following `auth.service.spec.ts` (there is no `lists.service.spec.ts` today —
  don't assume every module has one; use `auth.service.spec.ts` as the pattern to follow
  regardless).
- Pure function (conflict resolution, token/date/query logic) → standalone spec with
  plain inputs/outputs, no `Test.createTestingModule`, following `conflict-resolver.spec.ts`
  / `token.util.spec.ts`.
- Dexie-backed repository → fresh uniquely-named DB instance per test in `beforeEach`,
  following `local-list-repository.test.ts`; assert both the returned entity and the
  outbox side-effect.
- Change to a synced entity/field shape → add a case to `apps/api/test/contract.spec.ts`
  against the shared zod schema, in addition to the service-level spec.
- Before inventing new test infrastructure (fixtures, RTL setup), check
  `nestjs-testing-conventions`'s documented gaps — neither exists yet repo-wide. If one is
  genuinely required, stop and ask rather than establishing the convention unprompted.

### 6. Run tests, auto-fix on failure
Run only the new/changed spec files first, then the full package suite:
- `pnpm --filter @todomaster/api test -- <pattern>` then `pnpm --filter @todomaster/api test`
- `pnpm --filter @todomaster/web test -- <pattern>` then `pnpm --filter @todomaster/web test`
- `pnpm --filter @todomaster/shared test` if shared schemas/domain logic changed

If any test fails, apply `nestjs-debugging`'s known gotcha classes (Prisma
`undefined`-vs-`null` on JSON columns, missing transactions, missing `userId` ownership
scoping, sync/conflict-resolver mismatches, JWT/guard failures, `ValidationPipe` 400s)
to find the root cause, make the minimal fix, and re-run.

Retry this fix-and-rerun cycle **up to 3 times total**. Announce the attempt number
each time (e.g. "Fix attempt 2/3"). If tests still fail after the 3rd attempt, **stop**
and report: which tests are failing, the error output, what was tried in each attempt,
and your best diagnosis of the remaining cause. Do not attempt a 4th fix or fall back to
weakening/skipping the failing test to force a pass.

### 7. Self-review
Once tests pass, apply `nestjs-code-review-conventions` against the full diff
(`git diff`) as if reviewing someone else's PR:
- Backend: version bump on every synced-entity mutation, `userId` in ownership/query
  `where` clauses, atomic transactions for multi-statement writes, correct
  `undefined`-vs-`null` handling, DTO decorator completeness, no Swagger asks.
- Frontend: stores never call Dexie/`fetch` directly, repository writes pair the entity
  mutation with an outbox entry, business/filtering/sorting logic lives in `domain/`.
- If the implementation involved extracting or splitting code, additionally sanity-check
  it against `nestjs-refactoring-conventions` (was the extraction warranted, or speculative).
- If anything needs a comment or a `docs/features/` update beyond the spec doc already
  written in Step 3, apply `nestjs-documentation-conventions` (explain why, not what;
  don't add narration to self-explanatory code).

Tag every finding **CRITICAL** (breaks a hard invariant — missing version bump, missing
`userId` scoping, non-atomic multi-write, store bypassing the repository layer),
**WARNING** (real gap, doesn't corrupt data or leak across users), or **SUGGEST**
(stylestic/structural, not required).

**Fix all CRITICAL findings before reporting done.** WARNING and SUGGEST findings are
reported but not auto-fixed — list them for the user to triage.

### 8. Scope boundary
Only touch files inside the new feature's own module/directory (e.g.
`apps/api/src/modules/<feature>/`, `apps/web/src/features/<feature>/`, plus that
feature's own repository/store/spec files) unless the approved spec from Step 3
**explicitly named** a shared file (e.g. a shared Prisma schema migration, a shared
zod schema in `packages/shared`, a route registration in a shared router/module).
If mid-implementation you find you need to touch a file not listed in the approved
spec, stop and confirm with the user before editing it.

## Final report
Summarize: spec doc path, files created/changed, test results (pass/fail + which
package suites), any CRITICAL findings fixed, and any WARNING/SUGGEST findings left
for the user.
