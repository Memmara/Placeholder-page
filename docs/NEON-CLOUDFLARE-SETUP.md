# Memmara: Neon + Cloudflare Pages setup

The application is prepared for a Vite frontend on Cloudflare Pages, a Pages Function API, and PostgreSQL on Neon. Local preview continues to use the embedded PostgreSQL database.

## 1. Create the Neon database

1. Create a PostgreSQL 16+ Neon project.
2. Copy the **direct/unpooled** connection string from Neon. Keep it private.
3. In PowerShell, from this project folder, run:

```powershell
$env:MEMMARA_DATABASE_URL='postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require'
pnpm deploy:neon
Remove-Item Env:MEMMARA_DATABASE_URL
```

This applies the tracked schema and migrations, seeds the economy/cosmetics catalogue, and imports all 17,988 questions, curriculum points and definition records. It is safe to rerun after a content update; IDs are upserted and migration hashes are checked.

## 2. Connect Neon to Cloudflare

1. In Cloudflare, create a Hyperdrive configuration using the Neon direct/unpooled connection string.
2. Open the Memmara Pages project, then **Settings → Bindings**.
3. Add the Hyperdrive binding with the exact variable name `HYPERDRIVE`.
4. Keep `wrangler.jsonc` in the repository. It enables the Node.js compatibility layer required by the existing secure account service.
5. If the Pages dashboard exposes compatibility settings separately, set the date to `2026-10-24` and add the `nodejs_compat` flag there as well.

Do not add the Neon password to a `VITE_` variable. Vite variables are public browser data.

## 3. Cloudflare Pages build settings

- Production branch: the repository's main branch
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: the folder containing this `package.json`
- Node version: 24

The build divides the question bank into subject files. The old 131 MB public monolith has been preserved as `data/questions-bank.json.gz`, while deployable subject files remain below Cloudflare's per-asset size limit. Learners fetch only their selected subjects.

## 4. Production variables and secrets

Add these in **Pages → Settings → Variables and Secrets**. Mark credentials and webhook secrets as encrypted secrets.

Required now:

```text
MEMMARA_PUBLIC_URL=https://memmara.com
MEMMARA_GOOGLE_CLIENT_ID=682559030526-qu12evpho5oathilvuqgj6hv5mofqo0q.apps.googleusercontent.com
MEMMARA_GOOGLE_CLIENT_SECRET=<new Google client secret>
MEMMARA_RESEND_API_KEY=<Resend API key>
MEMMARA_EMAIL_FROM=Memmara <contact@memmara.com>
```

Required when payments go live:

```text
MEMMARA_COMMERCE_ENABLED=1
MEMMARA_STRIPE_SECRET_KEY=<Stripe secret key>
MEMMARA_STRIPE_PUBLISHABLE_KEY=<Stripe publishable key>
MEMMARA_STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
MEMMARA_STRIPE_PRICE_TOKENS_5=<price id>
MEMMARA_STRIPE_PRICE_TOKENS_10=<price id>
MEMMARA_STRIPE_PRICE_PLUS=<price id>
MEMMARA_STRIPE_PRICE_PRO=<price id>
MEMMARA_STRIPE_PRICE_DOUGIE=<price id>
MEMMARA_STRIPE_PRICE_DOTTY=<price id>
```

Apple and Microsoft remain unavailable until their client credentials are supplied. Do not create placeholder secrets.

## 5. Google OAuth settings

In the Google OAuth web client, use:

- Authorised JavaScript origin: `https://memmara.com`
- Authorised redirect URI: `https://memmara.com/api/auth/oauth/google/callback`

Add the Cloudflare preview-domain origin and matching callback only if OAuth must be tested on preview deployments. Keep the OAuth consent screen in testing until the production flow has been verified, then publish it when ready.

## 6. Domain and checks

1. Attach `memmara.com` to the Pages project and make it the production domain.
2. Deploy from GitHub.
3. Open `https://memmara.com/api/game/health`; it should report that the database is connected.
4. Test registration, verification email, login, logout, password reset and Google sign-in.
5. Complete a Daily Mix and confirm XP, tokens, attempts and inventory persist after signing in on another browser.
6. Configure Stripe's webhook as `https://memmara.com/api/commerce/webhook`, then complete test-mode purchases before enabling live mode.

Do not enable real payments or advertise production readiness until OAuth, email, webhook signatures, mobile AdMob test mode, privacy/cookie notices, backups, monitoring and an independent security review have all been completed.
