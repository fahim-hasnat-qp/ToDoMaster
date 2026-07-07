---
description: Review a diff or file in apps/api or apps/web against this repo's real invariants (version bumps, ownership checks, transactions, outbox pairing, layering) and produce a severity-tagged report
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status)
argument-hint: [file, PR number, or range — defaults to the current uncommitted diff]
---

# Review

Scope: $ARGUMENTS (if empty, review `git diff` against the current branch's base)

## Steps

1. Gather the diff (`git diff` / `git diff <base>...HEAD` / the named file) and identify which side(s) it touches — `apps/api` and/or `apps/web`.
2. Apply `nestjs-code-review-conventions` as the checklist. For each changed file, check the invariants it documents:
   - Backend: version bump on every synced-entity mutation, `userId` present in ownership/query `where` clauses, atomic transactions for multi-statement writes, correct `undefined`-vs-`null` handling on optional/JSON fields, DTO decorator completeness (not zod-parity), no Swagger asks.
   - Frontend: stores never call Dexie/`fetch` directly (except the sync-engine layer, which is the deliberate exception), repository writes pair the entity mutation with an outbox entry, business/filtering/sorting logic lives in `domain/` not inline in a component/hook/store.
   - Explicitly do NOT flag: file length alone (only `TaskEditor.tsx` and `sync.service.ts` exceed ~140 lines today, both already delegate), or missing RTL component tests (none exist anywhere yet).
3. Cross-check test coverage for the diff against `nestjs-testing-conventions` — new pure `domain/` functions or repository methods without a matching spec are a real gap; missing RTL tests are not.
4. If the diff includes a refactor-shaped change, sanity-check it against `nestjs-refactoring-conventions` (was extraction warranted, or is this a speculative abstraction).
5. Tag every finding with exactly one severity:
   - **CRITICAL** — breaks a hard invariant (missing version bump, missing `userId` scoping, non-atomic multi-write, store bypassing the repository layer). Blocks merge.
   - **WARNING** — a real gap that should be fixed but doesn't corrupt data or leak across users (missing test for new domain/repository logic, a comment needed for a non-obvious decision, a DTO field missing a validator).
   - **SUGGEST** — a stylistic or structural improvement consistent with repo conventions but not required (an extraction opportunity, a comment that could be tightened).
6. For each finding, cite the specific file/line and the specific existing-repo pattern it deviates from (not a generic best practice).
7. End with exactly one line: `Verdict: <APPROVE | APPROVE WITH COMMENTS | REQUEST CHANGES>` based on whether any CRITICAL findings exist (REQUEST CHANGES if so).
