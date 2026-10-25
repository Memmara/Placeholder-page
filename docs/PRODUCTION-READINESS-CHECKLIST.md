# Memmara production-readiness checklist

This is the big-picture route from the current local prototype to a safe public web and Android launch.

## Current position

### Implemented in the codebase

- [x] Responsive React/Vite learning app and local preview.
- [x] Account, session, email verification and password-reset architecture.
- [x] Google, Apple and Microsoft OAuth routes and account-linking architecture.
- [x] PostgreSQL ownership model for learning data, XP, inventory, streaks and purchases.
- [x] Cloudflare Pages Function adapter and Node compatibility configuration.
- [x] Neon schema deployment and content-import scripts.
- [x] 17,988-question bank split into deployable subject files, with a verified compressed source archive.
- [x] Stripe Checkout/payment-sheet server architecture, product mapping and webhook route.
- [x] Token regeneration, plans, rewarded-ad entitlements and out-of-token shop routing.
- [x] Android AdMob IDs are configured in the app environment.
- [x] Production build and Cloudflare Function compilation pass locally.
- [x] Every build validates all 17,988 questions, curriculum links, IDs, MCQ answer keys, self-check rules and generated subject files.
- [x] Baseline Cloudflare security/cache headers, authenticated-write throttling and retry-safe Stripe webhook processing.
- [x] A read-only live-site smoke test is ready for the deployed homepage, database health, authentication status, security headers and accidental secret-file exposure.

### Configured but not yet proven live

- [x] Neon production database: schema, catalogue and content deployed and independently verified on 25 October 2026.
- [ ] Cloudflare-to-Neon Hyperdrive connection.
- [ ] Transactional email delivery from `contact@memmara.com`.
- [ ] Google OAuth callback and consent-screen production status.
- [ ] Stripe products, prices, webhook signature and test purchases.
- [ ] AdMob behaviour in an installed Android build.
- [ ] AdSense site listing/review for `memmara.com` (currently waiting for the site to appear in AdSense).

### Not ready yet

- [ ] Apple and Microsoft OAuth credentials.
- [ ] Real mobile payment configuration and app-store policy review.
- [ ] Web rewarded-ad provider/fallback policy and consent handling.
- [ ] Production monitoring, alerts, backups/restore drill and incident process.
- [ ] Legal/privacy/cookie/terms and child-safety review for ages 13–18.
- [ ] Independent security and safeguarding review.

## Harry’s next actions on the PC

- [ ] On the PC, finish the open Neon browser sign-in. If it expired, run `pnpm exec neon login` from the Memmara project and approve it in the browser.
- [ ] Tell Codex: **Neon login complete**.
- [ ] Give Codex the GitHub repository URL, or connect GitHub in Codex, so the finished project can be pushed to the repository Cloudflare Pages uses.

Do not paste API keys, connection strings, passwords, OAuth secrets or webhook secrets into chat.

## What Harry personally needs to do

Codex will open the correct page and stop at the secure field. Harry only needs to paste or approve the private information directly on the PC.

- [x] Replace the Stripe test secret that was accidentally posted in chat.
- [x] Finish the Neon browser sign-in.
- [ ] Paste the **new Stripe secret test key** into the secure Cloudflare field when Codex opens it. Do not send it in chat.
- [ ] If Stripe shows a separate **webhook signing secret**, paste that into the secure field when Codex asks. Do not send it in chat.
- [ ] Approve Google, Apple or Microsoft sign-in screens when those providers are configured.
- [ ] Complete any Stripe identity/business verification personally.
- [ ] Read and accept any provider legal agreements personally.
- [ ] When `memmara.com` becomes available in AdSense, add it and request review. There is nothing to paste into chat while waiting.

Everything else in this checklist can be prepared, entered, tested or documented by Codex.

## Neon deployment completed

- [x] Verify the authenticated Neon profile without printing credentials.
- [x] Link organisation `org-orange-firefly-53988854`, project `weathered-pine-52995381` and branch `production`.
- [x] Verify the project-scoped Neon MCP configuration, `.neon` link and generated `neon.ts`.
- [x] Run `pnpm exec neon deploy` and safely pull `DATABASE_URL` plus `DATABASE_URL_UNPOOLED` into ignored `.env.local`.
- [x] Apply all nine tracked migrations with the direct URL.
- [x] Seed 302 cosmetics, 30 sets, 57 achievements and the progression catalogue.
- [x] Import all 17,988 questions, 2,005 curriculum records and 35 definitions.
- [x] Verify 101 tables, 58 RLS-enabled tables, 51 policies, 148 foreign keys and a rolled-back read/write transaction.
- [x] Run `pnpm build` and compile the Cloudflare Function.
- [x] Start Memmara using Neon and verify `/api/game/health`, provider status and anonymous account state end to end.

## Hosting and source control

- [ ] Give Codex the GitHub repository URL or connect an authenticated GitHub integration. This local repository currently has no `origin` remote.
- [ ] Push the complete project to GitHub.
- [ ] In Cloudflare Pages set build command `pnpm build`, output `dist`, Node 24, compatibility date `2026-10-24`, and `nodejs_compat`.
- [ ] Add a Hyperdrive binding named `HYPERDRIVE` using Neon's direct/unpooled connection.
- [ ] Add server secrets in Cloudflare Pages; never put secrets in `VITE_` variables.
- [ ] Attach `memmara.com`, force HTTPS and verify `https://memmara.com/api/game/health`.
- [ ] Run `pnpm smoke:production -- https://memmara.com` and save the successful output as launch evidence.
- [ ] Check production and preview deployments separately.

## Authentication and email

- [ ] Confirm Google OAuth has origin `https://memmara.com` and callback `https://memmara.com/api/auth/oauth/google/callback`.
- [ ] Add the new Google client secret to Cloudflare as `MEMMARA_GOOGLE_CLIENT_SECRET`.
- [ ] Move the Google consent screen from testing to production when verification requirements are satisfied.
- [ ] Register Apple and Microsoft applications, callbacks and secrets—or clearly leave their buttons unavailable until then.
- [ ] Verify the sending domain with the email provider and add `MEMMARA_RESEND_API_KEY` plus `MEMMARA_EMAIL_FROM=Memmara <contact@memmara.com>`.
- [ ] Test registration, email verification, wrong password, password reset, session expiry, logout-all and provider linking.
- [ ] Test that one account cannot access another account’s records.

## Stripe and monetisation

- [x] Rotate the Stripe test secret exposed in chat. The old credential is invalid.
- [ ] Codex opens Cloudflare’s encrypted-secret screen and prepares the fields.
- [ ] Harry pastes the replacement secret directly into the field; Codex never needs to see it.
- [ ] Create Stripe test-mode products/prices for 5 tokens, 10 tokens, Plus, Pro, Dougie and Dotty.
- [ ] Add all Stripe test keys and price IDs to Cloudflare secrets.
- [ ] Register `https://memmara.com/api/commerce/webhook` and add its signing secret.
- [ ] Test successful, cancelled, failed and repeated/idempotent payments.
- [ ] Test subscription creation, renewal, failed renewal, cancellation and plan downgrade.
- [ ] Confirm refunds/revocations have a documented policy and do not corrupt inventory or token ledgers.
- [ ] Complete Stripe business verification before enabling live mode.
- [ ] Review Apple/Google rules before selling digital goods inside mobile builds; native-store billing may be required instead of Stripe.

## Ads and Android

- [ ] Keep AdMob test ads enabled during development; never repeatedly click live ads during testing.
- [ ] Build and install the Capacitor Android app on a physical device.
- [ ] Confirm banners appear only during games, never on Home.
- [ ] Confirm rewarded ads grant exactly one token or one pending XP boost and cannot be replayed fraudulently.
- [ ] Test offline/no-fill/error/cancelled-ad paths.
- [ ] Add consent management appropriate to the UK/EEA and students aged 13–18.
- [ ] Complete Google Play data-safety, ads and age-targeting declarations.
- [ ] Add crash reporting and test release signing before Play Console submission.

## Web ads

- [ ] Create or activate a Google AdSense account.
- [ ] Add `memmara.com`, connect the site and request Google’s review.
- [ ] Harry completes Google’s identity, payment-profile and agreement steps personally when requested.
- [ ] Configure a Google-certified consent platform for UK/EEA visitors before serving personalised ads.
- [ ] Add approved web banner units only to game, practice and minigame screens — never the Home page.
- [ ] Set up the approved Google web rewarded-ad route for “Watch an ad” rewards; do not confuse normal AdSense banners with rewarded inventory.
- [ ] Until rewarded web inventory is approved, keep the safe “ad unavailable” fallback and never grant a reward without a verified completion event.
- [ ] Test consent, ad blockers, no-fill, failed ads and duplicate reward callbacks before launch.

## Learning-content and quality assurance

- [x] Run automated validation on every question-bank change: unique IDs, curriculum mapping, rubric shape and MCQ answer integrity.
- [ ] Subject-expert sample review across every subject and tier.
- [ ] Verify self-check outcomes against authored positive/negative cases.
- [ ] Confirm students can contest or amend a self-check without presenting it as independent examiner marking.
- [ ] Test automatic curriculum pacing for Years 9, 10 and 11 and every selected subject/tier/optional unit combination.
- [ ] Load-test Daily Mix, Speed Select, Review Vault and minigames with representative accounts.
- [ ] Move sensitive answer/rubric delivery fully behind authenticated endpoints if preventing browser inspection is a launch requirement.

## Security, operations and compliance

- [ ] Separate development, preview and production Neon branches and credentials.
- [ ] Test Neon point-in-time restore/branch recovery and document recovery time.
- [ ] Add error monitoring, uptime checks, structured logs and alerts for auth, database, email and webhooks.
- [x] Add application-level rate limits to sign-in, account recovery, OAuth starts, game writes and commerce writes.
- [ ] Load-test those limits against the deployed Neon/Cloudflare environment and tune thresholds from real traffic.
- [x] Add baseline Cloudflare headers for HTTPS enforcement, clickjacking prevention, MIME protection, referrer privacy, browser permissions and immutable asset caching.
- [ ] Set retention/deletion rules and provide account/data deletion.
- [ ] Publish privacy policy, cookie policy, terms, acceptable-use policy and contact process.
- [ ] Complete UK GDPR, age-appropriate-design and safeguarding review; determine the lawful basis and school/parent roles.
- [ ] Add accessibility testing, including keyboard, screen reader, contrast, reduced motion and mobile layouts.
- [ ] Run dependency, secret, vulnerability and independent penetration/security reviews.
- [ ] Prepare an incident-response and user-support process before launch.

## Launch gates

- [ ] No secrets in GitHub or browser bundles.
- [ ] Production build, database migrations and smoke tests all pass from a clean checkout.
- [ ] OAuth, email, Stripe and ads pass real end-to-end tests in their appropriate test environments.
- [ ] Backup restore has been demonstrated.
- [ ] Security, privacy, child-safety and payment-store-policy reviews are signed off.
- [ ] Monitoring and rollback are active before inviting real students.
