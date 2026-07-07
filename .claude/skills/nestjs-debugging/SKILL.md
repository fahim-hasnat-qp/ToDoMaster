---
name: nestjs-debugging
description: Debug NestJS API issues in apps/api — Prisma query/transaction bugs, sync conflict-resolution mismatches, JWT/guard auth failures, DTO validation rejections (400s from ValidationPipe), or version/optimistic-concurrency errors in tasks/lists/tags. Use when tracing a bug through controller → service → Prisma, or when the client and server disagree on entity state.
user-invocable: false
---

# NestJS debugging (apps/api)

## Trace the real request path
Controllers are thin (see `tasks.controller.ts`) — they just call the service. Almost all logic
lives in `*.service.ts`. Start there, not the controller, unless the bug is routing/DTO shape.

## Prisma-specific gotchas seen in this repo
- `undefined` vs `null` matters on JSON columns. `tasks.service.ts`'s `toRecurrenceJson` exists
  because Prisma treats `undefined` as "don't touch" and `null` needs `Prisma.JsonNull` explicitly —
  a naive `recurrence: dto.recurrence` silently no-ops clears. If a field "won't clear," check for
  this pattern first.
- Multi-row writes that must be atomic use `this.prisma.$transaction([...])` (array form for
  independent statements, e.g. `tasks.service.ts#softDelete`) or `$transaction(async (tx) => ...)`
  (callback form when later statements depend on earlier reads, e.g. `sync.service.ts#applyTaskChange`).
  A bug where a task is deleted but its subtasks aren't is almost always a missing transaction wrap.
- Ownership checks are separate from existence checks: `assertOwnership` in `tasks.service.ts` does
  `findFirst({ where: { id, userId } })` before mutating — a 404 vs. a cross-user data leak bug often
  traces to a missing `userId` in a `where` clause.

## Sync/conflict bugs
- `apps/api/src/modules/sync/conflict-resolver.ts` + `conflict-resolver.spec.ts` is the single source
  of truth for what should happen to a given `(baseVersion, currentVersion, op)` combination. If a
  client reports "my edit disappeared" or "delete didn't stick," reproduce it as a
  `resolveConflict(...)` unit case before touching `sync.service.ts` — the resolver is pure and easy
  to bisect; the service is transactional and Prisma-coupled.
- `version` is bumped via `{ increment: 1 }` on every mutation. If versions drift between client and
  server, check every write path touches `version` — `sync.service.ts`'s delete branch bumps it too.

## Auth bugs
- `JwtAuthGuard` (`common/guards/jwt-auth.guard.ts`) delegates entirely to the Passport `'jwt'`
  strategy in `strategies/jwt.strategy.ts` — a guard failure is usually a strategy/payload bug
  (`jwt-payload.ts`), not the guard itself.
- Anti-enumeration paths in `auth.service.ts` (e.g. `resendVerification`) intentionally return
  success/no-op for unknown emails. Don't "fix" a silent no-op there without checking
  `auth.service.spec.ts` — it's tested as a security property, not an oversight.

## Validation bugs (unexpected 400s)
- Global `ValidationPipe` in `main.ts` runs with `whitelist: true, forbidNonWhitelisted: true` — an
  extra field the client sends that isn't declared with a decorator in the DTO causes a 400, not a
  silent drop. Check the DTO class first when a request the client swears is correct gets rejected.
- DTOs intentionally use looser `class-validator` rules than the shared zod schemas (see the comment
  atop `task.dto.ts`) — don't assume DTO-level validation catches everything zod would.

## Useful checks before you start speculating
- Reproduce with the relevant `*.spec.ts` mocking Prisma the same way `auth.service.spec.ts` or
  `conflict-resolver.spec.ts` do, rather than standing up a real DB.
- `HttpExceptionFilter` normalizes every error to `{ statusCode, message, timestamp }` — if a client
  reports a weird error shape, check whether the throw site used a Nest `HttpException` subclass at
  all (uncaught errors become a generic 500 through this filter).
