---
description: Propose and apply a refactor in apps/api or apps/web, gated on explicit approval before touching more than one file
allowed-tools: Read, Grep, Glob, Bash(pnpm --filter @todomaster/api test*), Bash(pnpm --filter @todomaster/web test*), Bash(pnpm --filter @todomaster/api typecheck), Bash(pnpm --filter @todomaster/web typecheck), Bash(pnpm --filter @todomaster/api lint), Bash(pnpm --filter @todomaster/web lint), Edit
argument-hint: <file or area to refactor, e.g. apps/api/src/modules/sync/sync.service.ts>
---

# Refactor

Target: $ARGUMENTS

## Steps

1. Read the target file(s) and apply `nestjs-refactoring-conventions` to judge whether a split/extraction is actually warranted here — check real size against the baselines it cites (`tags.service.ts` 46 lines, `lists.service.ts` 57, `tasks.service.ts` 108, `sync.service.ts` 316 as the documented outlier; `TaskEditor.tsx` 297 as the frontend outlier) rather than a fixed line-count rule.
2. Confirm there's a genuine duplicate or layering violation to fix (e.g. near-identical branches like `applySimpleEntityChange` was extracted for, or business logic sitting in a component/store instead of `domain/`) — per the skill, don't extract or split speculatively.
3. **Stop and present a plan before editing anything.** The plan must state: which file(s) will change, what will move where, why (citing the specific duplication/layering issue found), and confirmation that no observable behavior changes. Wait for an explicit yes/no. Do not edit a second file until approval is given — a single trivial rename in one file may proceed, but any multi-file change requires the go-ahead first.
4. On approval, apply the refactor incrementally, keeping public behavior identical (no drive-by feature changes or dead-code cleanup beyond what the approved plan described).
5. Run the affected package's full check trio: `pnpm --filter @todomaster/api test`/`typecheck`/`lint` or the `@todomaster/web` equivalents — the refactor is not done until all three pass with no behavior change.
6. If the refactor touches a documented invariant (e.g. ownership checks, version bumps, outbox pairing), cross-check against `nestjs-code-review-conventions` before declaring done, since those are the same invariants a reviewer would gate on.
7. Summarize what moved where and confirm test/lint/typecheck results.
