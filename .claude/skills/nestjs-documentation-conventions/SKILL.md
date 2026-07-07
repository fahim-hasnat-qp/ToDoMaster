---
name: nestjs-documentation-conventions
description: Write or review comments, JSDoc, and design docs in this repo — inline comments in apps/api services/guards, JSDoc headers on Zustand stores and hooks in apps/web, updating ARCHITECTURE.md's tradeoff sections, or adding a docs/features/NNN-*.md entry for a new feature. Use when a change needs explaining beyond the code itself, or when deciding whether a comment is worth adding at all.
user-invocable: false
---

# Documentation conventions

## No Swagger, no TSDoc tooling — comments are the documentation
There is no `@nestjs/swagger`, no `@ApiProperty`/`@ApiTags` anywhere in `apps/api`, and no TSDoc
generation configured. Don't add Swagger decorators to DTOs/controllers unless asked — it would be a
new convention, not an extension of an existing one. Documentation here means well-placed comments
and the `docs/` markdown files, not generated API docs.

## Comment style actually used in this repo
Comments explain **why**, never **what** — e.g. `jwt-auth.guard.ts`'s one-liner
(`/** Applied per-controller/route; Passport's 'jwt' strategy does the verification. */`) states the
non-obvious delegation, not "this guard checks the JWT." Follow that ratio: most functions (see
`lists.service.ts`, `tags.service.ts`) have zero comments because they're self-explanatory from
naming; comments appear exactly where a reader would otherwise be confused or would "fix" something
that's intentional.

**Flag intentional-looking oddities.** `tasks.service.ts`'s `toRecurrenceJson` has a one-line doc
(`/** \`undefined\` = leave the column untouched (update only); \`null\` = clear it. */`) precisely
because the undefined/null distinction is easy to "clean up" incorrectly. `auth.service.spec.ts`'s
header comment defends *why* certain paths aren't tested there. When you write code where the
obvious refactor would be wrong, say so in one line, right there — don't rely on commit messages.

**Cite the concrete mechanism, not a vague warning.** `sync.service.ts`'s `pull()` comment doesn't
say "careful with race conditions" — it says the cursor is "the server's own clock at query time, NOT
the max `updatedAt` seen" and explains the specific race that would cause. Match that specificity.

**Class-level doc comments explain a design decision, not the class's members.** `task.dto.ts`'s
class comment explains *why* class-validator rules are deliberately looser than the zod schemas
(to avoid two schemas drifting) — it doesn't restate what each decorator does.

## Design docs
- `ARCHITECTURE.md` is the living source of truth for cross-cutting design, explicitly including
  **revisions**: §7's conflict-resolution section documents that field-level merge was originally
  envisioned, then explains in prose why whole-row LWW was implemented instead, and points at
  `conflict-resolver.ts` for the same reasoning in code. When an implementation diverges from an
  earlier documented design, update the doc to say what changed and why — don't just silently ship
  the divergence, and don't delete the original intent, revise it in place.
- `docs/features/NNN-short-name.md` — one file per feature milestone (`001-foundation-and-tasks.md`
  through `009-auth-and-sync.md`), each covering design, tradeoffs, and future work for that
  milestone. A new feature-sized change gets a new numbered file continuing the sequence, not an edit
  buried in an unrelated one.
- README.md stays focused on setup/run instructions; design rationale belongs in ARCHITECTURE.md or
  docs/features, not duplicated into the README.

## Gap — no CLAUDE.md exists
This repo has no CLAUDE.md capturing agent-facing conventions. *Proposal*: once these five skills
settle, consider a short CLAUDE.md that just points to ARCHITECTURE.md, docs/features/, and these
skills rather than restating them — don't create one unprompted with invented rules.
