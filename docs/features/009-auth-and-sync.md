# Feature 009 — Email/Password Auth, Verification & Client Sync Engine

Status: **Shipped** · ARCHITECTURE.md §11, step 13 + step 14 (auth) done together, since the
sync engine needs a real session to call against and auth needed a real backend to verify against.

## What shipped

### Backend
- **Auth simplified to email/password + guest** (no Google/Apple) per explicit direction — the
  `AuthProvider` enum, `.env.example`, and controller comments from Milestone 008 were updated to
  drop the OAuth scaffolding entirely rather than leave dead placeholders.
- **Email verification** (soft-gate): register → account usable immediately → verification email sent
  via a new `MailerService` (nodemailer + Gmail SMTP) → click the link → `emailVerified: true`.
  Never blocks login or app access.
- **`MailerService` dev fallback**: with `SMTP_USER` unset, emails are logged to the console instead of
  sent — the whole flow (including real tokens) is testable with zero external dependencies. Real
  sending activates the moment Gmail SMTP credentials are added to `.env`, no code changes needed.
- **`VerificationToken` model**: single-use, hashed (SHA-256, never store the raw token), expiring
  tokens shared by email verification (24h) and password reset (1h) — one mechanism, two uses.
- **Guest → account upgrade** (`POST /auth/upgrade`, JWT-guarded): attaches email/password to the
  *same* user id a guest was already using. Nothing about their existing tasks needs to move — they
  were already stored under that id.
- **Anti-enumeration**: `resend-verification` and `request-password-reset` always return
  `{success: true}` regardless of whether the email exists, so neither endpoint can be used to probe
  which emails are registered.

### Frontend
- **Auth store** (`features/auth/auth-store.ts`, persisted): holds the current user + access/refresh
  tokens, exposes `register`/`login`/`upgradeGuest`/`logout`/`refreshTokens`. **Every app launch
  creates a guest session automatically** if none exists (`ensureSession`) — there is no logged-out
  state in this app; you're always at least a guest, and "logging in" or "registering" from that point
  is really "upgrading" or "switching" identity, not crossing a walled gate.
- **`apiClient`** (`data/http/api-client.ts`): fetch wrapper that injects the bearer token and
  transparently retries once with a refreshed token on 401 — call sites never think about token
  lifecycle.
- **Screens**: Login, Register, Verify Email (handles the emailed link), Forgot/Reset Password, plus an
  `AccountBanner` (dismissible per-session, soft-gate) and an inline `UpgradeAccountForm` embedded in
  Settings for guests.
- **Client Sync Engine** (`data/sync/sync-engine.ts`): implements the client half of the protocol
  designed in Milestone 1 and built server-side in Milestone 008 — drains the outbox in batches
  (push), applies each batch's authoritative server rows back into Dexie, then delta-pulls
  (`GET /sync/pull?since=`) and merges incoming rows, persisting the cursor. Runs on an interval, on
  `online` events, and immediately once a session exists (`SyncProvider`).

## Design decisions & why

- **Guest-first, not logged-out-first.** The app already worked fully offline before this milestone;
  bolting on a hard "please log in" gate would have broken that. Instead, `ensureSession()` silently
  creates a real (but anonymous) backend user on first launch. This user immediately has an id, so its
  tasks are sync-eligible from the very first task created — "create an account later" is just
  attaching credentials, never a data migration.
- **Verification tokens are opaque random strings with server-stored hashes, not JWTs.** A JWT would
  need no server-side state, but that also means it can't be revoked or checked for reuse without
  extra bookkeeping — for something as sensitive as "prove you own this email" or "reset this
  password," a single-use DB-backed token round-trips exactly that guarantee (`usedAt` marks
  consumption) with less surface area than JWT-based one-time-use tricks.
- **The push-then-pull cycle does not abort the pull if the push fails.** A dropped push (offline mid-
  cycle) shouldn't prevent picking up changes from *other* devices — those are two independent
  concerns. The outbox itself stays intact either way (durable in IndexedDB), so nothing is lost on the
  next attempt. Caught and corrected during test-writing: my first test asserted the opposite and was
  wrong, not the code — worth noting because it's exactly the kind of subtle ordering decision that's
  easy to get backwards.
- **A pulled row that fails shared-schema validation is dropped with a warning, not thrown.** One bad
  row (e.g. a future field the client doesn't understand yet) shouldn't crash the whole sync cycle for
  every other row in the batch.
- **`api-client.ts` and `auth-store.ts` break their circular dependency via a setter function**
  (`setAuthAccessors`), not a shared event bus or prop drilling — the HTTP client needs the current
  token and a refresh capability; the auth store needs to make HTTP calls to refresh. Documented
  in-line since a "why is this indirection here" question is exactly what that comment answers.

## Tradeoffs

- **No rate limiting on `/auth/login` or the guest endpoint** — already flagged in Milestone 008, still
  open.
- **Logout is hidden for guest accounts** in Settings — logging out a guest with no credentials would
  strand that browser's tasks with no way back in. This is a deliberate UI omission, not a missing
  feature: the "way out" for a guest is upgrading to a real account, not logging out.
- **The sync engine has no UI indicator** (spinner, "last synced" timestamp, conflict notice) yet — it
  runs silently in the background. Given the LWW conflict model, a user could in rare cases have a
  concurrent edit silently lose without ever knowing. Flagged in Milestone 008 too; still open.
- **A guest's data is only as durable as the browser's IndexedDB and this one backend user row** — if
  they never upgrade and clear site data, that user id's tasks become unreachable from any other
  device (though they still exist server-side under that orphaned guest id).

## Future improvements

- Rate limiting on auth endpoints.
- A visible sync status indicator (idle / syncing / error / conflicts-found).
- Encourage guest upgrade proactively (e.g. after N tasks created, not just a passive banner).
- Session expiry handling: currently a fully-expired refresh token silently logs the user out
  (`refreshTokens` returns false → store clears) — no "your session expired, please log back in"
  messaging yet.

## Verify locally

```bash
docker compose up -d db
cd apps/api && cp .env.example .env && pnpm exec prisma migrate deploy && pnpm dev   # :3000 (or set PORT)
cd apps/web && VITE_API_BASE_URL=http://localhost:3000 pnpm dev                      # :5173

# Register a user -> check the api server's console log for the verification email link
# (SMTP_USER is empty by default, so it logs instead of sending).
# Click the link (or curl it) -> emailVerified becomes true.
# Create a task -> it appears in `GET /sync/pull` for that user within one sync interval.

pnpm test   # from repo root: shared + web (93) + api (28) = 121 tests across the workspace
```
