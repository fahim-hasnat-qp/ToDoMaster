---
description: Write or update comments, ARCHITECTURE.md, or docs/features/*.md entries for a change in this repo, matching its existing why-not-what documentation style
allowed-tools: Read, Grep, Glob, Edit, Write
argument-hint: <file, feature, or design decision to document>
---

# Docs

Target: $ARGUMENTS

## Steps

1. Determine the right destination before writing anything, per `nestjs-documentation-conventions`:
   - A non-obvious implementation detail or intentional-looking oddity in code → an inline comment next to it (not a design doc).
   - A cross-cutting design decision, tradeoff, or a revision of previously-documented design → `ARCHITECTURE.md`, edited in place to show what changed and why (see how §7 documents the field-level-merge-to-LWW revision) — don't delete the original intent, revise it.
   - A new feature-sized addition → a new `docs/features/NNN-short-name.md` continuing the existing numbered sequence (currently through `009-auth-and-sync.md`).
   - Setup/run instructions → `README.md` only; keep design rationale out of it.
2. If writing inline comments, apply `nestjs-documentation-conventions`'s style: explain **why**, never **what**; match the density already in the file (most functions in this repo have zero comments because they're self-explanatory — don't add narration to obvious code). Cite the concrete mechanism or invariant at risk, the way `sync.service.ts`'s `pull()` comment names the specific race it avoids, rather than a generic warning.
3. Do not add Swagger/TSDoc-generation decorators (`@ApiProperty`, `@ApiTags`, etc.) — confirmed absent from this repo; that would be a new convention, not an extension of the existing one.
4. If the change touches a place where a prior gap was noted (e.g. the missing CLAUDE.md, or an undocumented convention), don't silently resolve the gap as part of an unrelated docs task — flag it back to the user instead.
5. Re-read the written comment/doc section once more and cut anything that restates what the code already makes obvious.
6. Summarize what was documented and where.
