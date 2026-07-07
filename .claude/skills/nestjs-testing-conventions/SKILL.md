---
name: nestjs-testing-conventions
description: Write or review tests for apps/api (Jest, *.service.spec.ts) or apps/web (Vitest, *.test.ts/.tsx) — mocking Prisma/PrismaService, testing Dexie-backed repositories, pure domain function tests, or contract tests validating API responses against shared zod schemas. Use when adding a new service/repository/domain function and it needs test coverage.
user-invocable: false
---

# Testing conventions

## Backend (apps/api) — Jest

**Mock Prisma as plain `jest.fn()` objects, not a Nest testing module with a real PrismaService.**
`auth.service.spec.ts` builds `prisma = { user: { findUnique: jest.fn(), ... }, verificationToken: {...} }`
and provides it via `{ provide: PrismaService, useValue: prisma }`. Only mock the specific
model methods the service under test actually calls — don't stub the whole Prisma client.

**State the test's scope in a header comment when it's non-obvious what's NOT covered.**
`auth.service.spec.ts` opens with a comment explaining it proves service *decisions* (anti-enumeration
silence, token expiry/reuse, which emails get sent) and explicitly defers DB-integration correctness
to `conflict-resolver.spec.ts` and `test/contract.spec.ts`. Follow that pattern instead of writing
one giant spec that tries to cover everything for a service.

**Pure logic gets isolated spec files.** `conflict-resolver.ts` / `conflict-resolver.spec.ts` and
`token.util.ts` / `token.util.spec.ts` sit as standalone pure functions with their own spec next to
them — test these directly with plain inputs/outputs, no mocking, no `Test.createTestingModule`.

**Contract tests protect the client/server boundary.** `test/contract.spec.ts` validates real mapper
output shapes against the *shared* zod schemas (`taskSchema`, `listSchema`, `tagSchema` from
`@todomaster/shared`) — including a case with an extra Prisma-only field (`userId` on List) and a
case with a missing required field. When adding a new synced entity or field, add a case here rather
than trusting the DTO/mapper alone.

**Assert behavior, not implementation.** Tests check `expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({...}))`
and `rejects.toBeInstanceOf(ConflictException)` — assert on the exception type and the meaningful
call args, not exact call counts or internal method names unless that's the actual behavior under test.

## Frontend (apps/web) — Vitest

**Repository tests get a fresh isolated DB per test.** `local-task-repository.test.ts` does
`db = new TodoDatabase(\`test-tasks-${counter++}\`)` in `beforeEach` — a uniquely-named Dexie instance
per test avoids cross-test bleed. Mirror this for any new Dexie-backed repository test rather than
sharing one DB instance across a `describe` block.

**Test the offline-first contract explicitly**: repository tests assert both the returned entity
*and* the outbox side-effect (`db.outbox.toArray()` has an `UPSERT`/`DELETE` entry with the right
`baseVersion`) and the `dirty` flag on the stored row. A repository change that doesn't also verify
the outbox entry is incomplete coverage here.

**Domain logic is tested as pure functions**, e.g. `recurrence-engine.test.ts`, `task-queries.test.ts`,
`quick-add-parser.test.ts` — no React, no store, no DOM. If new logic can be expressed as a pure
function in `domain/`, test it there rather than through a component/hook.

## Gaps — confirm before adopting
- No shared test-utils/factory module exists on either side (each spec inlines its fixtures, e.g. the
  task-row literal in `contract.spec.ts`). *Proposal*: if fixture duplication grows, introduce
  `apps/api/test/factories.ts` / a `apps/web/src/test/factories.ts` — not yet standard, don't invent
  it unprompted.
- No React Testing Library component test exists yet despite RTL being in `ARCHITECTURE.md`'s stack
  table — component-level tests for `features/tasks/*.tsx` are unprecedented in this repo. Follow the
  domain/repository test style above for logic; ask before establishing an RTL pattern from scratch.
