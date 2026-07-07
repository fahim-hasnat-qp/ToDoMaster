---
description: Add or extend test coverage for a service, repository, or domain function in apps/api or apps/web, following this repo's existing test patterns
allowed-tools: Read, Grep, Glob, Bash(pnpm --filter @todomaster/api test*), Bash(pnpm --filter @todomaster/web test*), Bash(pnpm --filter @todomaster/shared test*), Edit, Write
argument-hint: <file or function to test, e.g. apps/api/src/modules/tasks/tasks.service.ts>
---

# Test

Target: $ARGUMENTS

## Steps

1. Identify which package the target lives in — `apps/api` (Jest, `*.spec.ts`), `apps/web` (Vitest, `*.test.ts`/`.test.tsx`), or `packages/shared` (Vitest) — and locate its existing spec file if one exists.
2. Apply `nestjs-testing-conventions` to pick the matching pattern for what's being tested:
   - A NestJS service → mock Prisma as plain `jest.fn()` objects per model method actually used, following `auth.service.spec.ts`; state in a header comment what's deliberately out of scope if relevant.
   - A pure function (conflict resolution, token utils, recurrence/date/query logic) → a standalone spec with plain inputs/outputs, no `Test.createTestingModule`, following `conflict-resolver.spec.ts` / `token.util.spec.ts` / `recurrence-engine.test.ts`.
   - A Dexie-backed repository → a fresh uniquely-named DB instance per test in `beforeEach` (see `local-task-repository.test.ts`), and assert both the returned entity and the outbox side-effect, not just the entity.
   - A change to a synced entity/field shape → add or update a case in `apps/api/test/contract.spec.ts` against the shared zod schema, not just the service-level spec.
3. Before writing new test infrastructure (fixtures/factories, RTL setup), check the gaps section of `nestjs-testing-conventions` — neither a shared fixture module nor an RTL component-test pattern exists yet. If one is genuinely needed, stop and ask rather than inventing the convention silently.
4. Write the test(s), matching the assertion style already in use (assert on exception type / meaningful call args via `expect.objectContaining`, not exact call counts or internals).
5. Run the new test in isolation first, then the full package suite:
   - `pnpm --filter @todomaster/api test -- <pattern>` then `pnpm --filter @todomaster/api test`
   - `pnpm --filter @todomaster/web test -- <pattern>` then `pnpm --filter @todomaster/web test`
   - `pnpm --filter @todomaster/shared test` for shared schema/domain changes
6. Report which pattern was followed (and from which existing file) and the final pass/fail state of the full suite.
