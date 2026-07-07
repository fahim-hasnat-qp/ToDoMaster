# ToDoMaster

A fast, offline-first Todo PWA in the spirit of TickTick / Todoist / Microsoft To Do — built as a
pnpm/Turborepo monorepo with a React PWA frontend and a NestJS + Postgres backend for optional
cross-device sync.

- **Works fully offline.** Local-first on IndexedDB (Dexie); the backend is only needed for
  cross-device sync, not for the app to function.
- **Installable PWA** with dark mode, accent colors, smart lists, tags, subtasks, checklists,
  recurring tasks, natural-language quick add, reminders, and a calendar view.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design and [docs/features/](./docs/features/)
  for a per-milestone log of what shipped, why, and known tradeoffs.

---

## Quick start — just the app, no backend (fastest)

The web app works completely on its own. If the backend isn't running, it falls back to full offline
mode automatically — nothing to configure.

```bash
corepack enable          # first time only, activates the pinned pnpm version
pnpm install
pnpm --filter @todomaster/web dev
```

Open the printed local URL (defaults to `http://localhost:5173`). That's it — tasks, lists, tags,
calendar, reminders, everything works, stored locally in your browser.

---

## Full setup — with cross-device sync

Sync requires the backend: NestJS + PostgreSQL, running locally via Docker.

**Prerequisites:** Node 20+, [pnpm](https://pnpm.io) (via `corepack enable`), [Docker](https://docker.com).

```bash
# 1. Install dependencies (from the repo root)
pnpm install

# 2. Start Postgres
pnpm db:up

# 3. Configure and migrate the backend
cd apps/api
cp .env.example .env
pnpm exec prisma migrate deploy
cd ../..

# 4. Run everything
pnpm dev
```

This starts the web app (`:5173`) and the API (`:3000`, or whatever `PORT` is set to in
`apps/api/.env`) together via Turborepo. Open `http://localhost:5173` — the app will silently create
a guest account against the running backend and start syncing.

### Sending real verification emails

Registered accounts get an email-verification link. By default (no SMTP configured) the link is just
logged to the API's console — copy it into your browser to verify. To send real emails via Gmail:

1. Enable 2-Step Verification on the Gmail account you want to send from.
2. Generate an [App Password](https://myaccount.google.com/apppasswords).
3. Set `SMTP_USER` and `SMTP_APP_PASSWORD` in `apps/api/.env` (see the comments in `.env.example`).

No restart-proof magic needed — just fill in the two values and emails start sending for real.

### Stopping the backend

```bash
pnpm db:down   # stops the Postgres container (data persists in a Docker volume)
```

---

## Project structure

```
apps/
  web/      React + Vite + TypeScript PWA (offline-first, Dexie/IndexedDB)
  api/      NestJS + Prisma + PostgreSQL backend (auth, REST CRUD, sync)
packages/
  shared/   Zod schemas & types shared by web and api — the single source of truth for data shapes
docs/
  features/   One doc per shipped milestone: design, tradeoffs, what's deliberately not done
ARCHITECTURE.md   Full system design: data model, sync protocol, delivery plan
```

## Common commands (from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + api together |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all test suites (shared + web + api) |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:up` / `pnpm db:down` | Start/stop the local Postgres container |

## What's implemented vs. planned

Core task management, lists/tags, search, subtasks/checklists, quick add, recurrence, reminders,
calendar, backend + sync, and email/password auth are shipped and tested — see
[docs/features/](./docs/features/) for details on each.

**Not yet built** (tracked in [ARCHITECTURE.md §11](./ARCHITECTURE.md)): statistics, gamification,
AI-assisted planning, file attachments, and full settings (backup/export/import). Google/Apple OAuth
was explicitly descoped in favor of email/password + guest accounts.

## Known limitations (self-documented — see individual feature docs for full detail)

- Reminders and the daily summary only fire while the app is open in a browser tab (no server-push
  notifications yet).
- Sync conflict resolution is whole-row last-writer-wins, not field-level merge.
- No rate limiting on auth endpoints yet — fine for local/dev use, not for a public deployment.
