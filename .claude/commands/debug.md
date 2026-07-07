---
description: Investigate and fix a bug in apps/api or apps/web, grounded in this repo's actual request path and known gotchas
allowed-tools: Read, Grep, Glob, Bash(pnpm --filter @todomaster/api test*), Bash(pnpm --filter @todomaster/web test*), Bash(pnpm --filter @todomaster/api typecheck), Bash(pnpm --filter @todomaster/web typecheck), Edit
argument-hint: <description of the bug, error message, or failing behavior>
---

# Debug

Bug report: $ARGUMENTS

## Steps

1. Identify which app the bug lives in — `apps/api` (NestJS/Prisma) or `apps/web` (React/Zustand/Dexie) — from the report. If ambiguous, check both the relevant controller/service and the relevant store/repository before assuming.
2. Apply `nestjs-debugging` to trace the request path and check for the known gotcha classes it documents (Prisma `undefined`/`null` on JSON columns, missing transactions, ownership checks, sync/conflict-resolver mismatches, JWT/guard failures, `ValidationPipe` 400s) before speculating about new causes.
3. Reproduce the bug as a failing test first, following the mocking/isolation patterns in `nestjs-testing-conventions` (plain `jest.fn()` Prisma mocks on the backend, isolated per-test Dexie instance on the frontend) — do not hand-verify by reading code alone if a test can pin the behavior down.
   - Backend: run the relevant spec with `pnpm --filter @todomaster/api test -- <pattern>`.
   - Frontend: run the relevant spec with `pnpm --filter @todomaster/web test -- <pattern>`.
4. Once the failing test reproduces the bug, make the minimal fix. Do not perform opportunistic refactors while debugging — if the fix reveals a larger structural issue, note it and stop; that belongs in `/refactor`, not this command.
5. Re-run the full test suite for the affected package (`pnpm --filter @todomaster/api test` or `pnpm --filter @todomaster/web test`) and the matching `typecheck` script to confirm no regressions.
6. Summarize: root cause, the file(s)/line(s) changed, and which test now covers it.
