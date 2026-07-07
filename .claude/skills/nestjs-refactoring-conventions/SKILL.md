---
name: nestjs-refactoring-conventions
description: Refactor NestJS services/controllers in apps/api or React feature files in apps/web — splitting an oversized file, extracting shared entity-mutation logic (task/list/tag CRUD + versioning), pulling business logic out of Zustand stores or React components, or deduplicating Prisma transaction patterns across sync.service.ts and tasks.service.ts.
---

# Refactoring conventions

## Backend (apps/api)

**Size signal**: existing services stay small — `tags.service.ts` (46 lines), `lists.service.ts`
(57), `tasks.service.ts` (108). `sync.service.ts` (316) is the outlier, and it already refactors
itself: `applySimpleEntityChange<Row>` is a generic extracted specifically because List and Tag
changes shared identical shape while Task didn't (see the comment above it). When a service
approaches ~150+ lines, look for that same signal — near-identical branches for different entities —
before adding more inline logic.

**Extract only when a real duplicate exists.** Don't pre-extract a shared "entity mutation" base
class speculatively — `applySimpleEntityChange` was extracted because List and Tag became
byte-for-byte structurally identical, not in anticipation of it. Task stayed separate because it
genuinely differs (`tagIds` join-table handling).

**Ownership + transaction shape stay next to the mutation.** `assertOwnership` in `tasks.service.ts`
is a private method on the service, not a shared guard/interceptor — ownership rules are
entity-specific (e.g. `sync.service.ts`'s list-delete cleanup mirrors `ListsService.softDelete`'s
orphan-reassignment invariant via a code comment, not a shared function). If you extract shared
ownership logic, keep the two copies' invariants in sync explicitly (comment cross-reference, like
the existing one) rather than silently diverging.

**DTOs**: `UpdateTaskDto extends CreateTaskDto` (task.dto.ts) — prefer extending/narrowing over
duplicating decorator lists when an update DTO is "create DTO minus required-ness."

## Frontend (apps/web)

**Size signal**: most `features/tasks/*` files are 20–140 lines. `TaskEditor.tsx` at 297 lines is
the largest and already delegates sub-concerns to `ChecklistEditor.tsx`, `SubtaskList.tsx`,
`RecurrenceEditor.tsx`, `ReminderEditor.tsx` — treat ~150 lines in a component as the point to ask
"can this become a child editor component like those," not a hard rule to split at 150 exactly.

**Pure logic vs. React wiring stay in separate files.** `useVisibleTasks.ts` is explicit about this:
the hook only memoizes and wires the store to `domain/task-queries.ts`'s pure functions
(`matchesSmartList`, `sortTasks`). If you find filtering/sorting/business-rule logic growing inside a
component or hook body, it belongs in `domain/*.ts` as a pure, independently-testable function —
mirror that split, don't invent a new layering.

**Stores orchestrate, they don't compute.** `task-store.ts` calls out in its own header comment that
it "NEVER touches Dexie/network directly" — all persistence goes through the injected repository
(`container.resolve(TASK_REPO)`). If a refactor is tempted to call Dexie or `fetch` directly from a
store or component, that breaks the offline-first golden rule in `ARCHITECTURE.md` §2 — route through
a repository instead.

**Gap — no lint rule enforces file-size or layering splits.** These are conventions inferred from
existing file sizes and comments, not an enforced max-lines rule. *Proposal (confirm before treating
as standing)*: adopt ~150 lines as a soft trigger to consider splitting a component/service, matching
what's already true of every file in the repo except the two documented exceptions above.
