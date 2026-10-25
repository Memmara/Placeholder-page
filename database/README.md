# Memmara local PostgreSQL

PostgreSQL 16.14 was installed for this workspace. On the next local startup, the existing database and schema will be renamed to:

- Host: `127.0.0.1` — this computer only
- Port: `54329`
- Database: `memmara`
- Schema: `memmara_game`
- Tables: **81**; row-level security enabled on **43** tables
- Foreign keys: **129**

The local database is not a Windows service and will not automatically start after a reboot. The database files persist at `../.local-db/data/` when the server stops. The Memmara rename has not yet been verified against a running database in this workspace.

## Commands

From this folder, with Node.js 22+ available:

```powershell
node database.mjs serve   # Start and keep the server running
node database.mjs status  # Report whether it is reachable
node database.mjs apply   # Apply once, or verify the matching migration is already applied
node verify.mjs           # Transactional checks; fixtures are rolled back
node database.mjs stop    # Stop this cluster without deleting data
```

The Node runtime used during setup is:

```text
C:/Users/Harry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe
```

Keep the `serve` process alive while using the database in this sandbox. It handles Ctrl+C/SIGTERM with a normal PostgreSQL shutdown. `setup` is safe to run again: it preserves the existing cluster and uses the recorded migration hash.

## Credentials and access

A random local owner password is saved in `../.local-db/credentials.json`. The entire `.local-db` directory has a Windows ACL restricted to the current Windows user and is ignored by Git. Do not place its contents in browser code, Vite variables, public assets or deployment archives. The migration scripts load credentials internally without printing them or passing passwords as command-line arguments.

The owner connection is for local administration. The current Node account/game API uses this owner connection and enforces account ownership in its queries. A hosted production deployment needs a separately scoped non-owner role without BYPASSRLS, `app.user_id` set from the authenticated session, and least-privilege grants. No database credentials have been added to the frontend.

## Migration and verification

The migration manager records the SQL hash in `public.memmara_schema_migrations`. Schema creation and its migration record commit together. A changed file under an already-applied migration is rejected; use a new migration for later structural changes. Existing unrelated schemas are not replaced.

`applied-schema.json` records the applied hash and table/RLS counts. `verification.json` records checks for duplicate ledger protection, nonnegative balances, append-only accounting and own-user RLS, including the coin-ledger view. Verification data and the temporary verification role are rolled back.

The local game API imports the item catalogue and achievements when it starts. Migration `004-accounts.sql` adds unified account identities, Argon2id credentials, revocable sessions, single-use email tokens, and account-owned learning progress. The React app loads its progress from this API. Browser progress can be imported only after the learner chooses a record to attach to the signed-in account.

## Account setup

Create `.env.local` next to `package.json` from `.env.example` (it is ignored by Git). Development verification and password-reset links are printed in the launcher terminal until `MEMMARA_RESEND_API_KEY` and `MEMMARA_EMAIL_FROM` are configured. Do not use terminal links in a hosted deployment. Google, Apple and Microsoft buttons only become active after their respective credentials are configured. Register callbacks at `/api/auth/oauth/{google|apple|microsoft}/callback` on the public HTTPS origin. Apple Sign In requires an HTTPS public callback and cannot be exercised on localhost.

The local launcher applies `004-accounts.sql` when the game API starts. This document does not claim a live OAuth or cross-device test: those require provider registrations, an email sender, a reachable API, and a production HTTPS deployment. Existing preview-game inventory belongs to a fictional preview user and is not silently transferred to a new account.

Portable PostgreSQL binaries are supplied by `@embedded-postgres/windows-x64`; `pg` is the Node PostgreSQL driver. Exact dependency versions are pinned in this folder and its lockfile. Reinstallation in this Windows sandbox uses a local package store and copied packages:

```powershell
pnpm install --ignore-workspace --ignore-scripts --node-linker=hoisted --store-dir=.pnpm-store --config.enable-global-virtual-store=false --package-import-method=copy
```
