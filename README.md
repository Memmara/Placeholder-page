# Memmara

A React + TypeScript + Tailwind learning platform with a Three.js avatar, 26 GCSE/A-Level subject banks, 17,988 questions, a local PostgreSQL preview and a Cloudflare Pages + Neon production path.

## Run

Use Node 24+ and pnpm 11.25.0. The local database is configured on this computer. Startup migrates the previous product identifiers while retaining existing user data:

On this Windows computer, double-click `Start Memmara.cmd` to use the bundled Node and pnpm runtimes. Keep its command window open while using the preview.

```sh
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` starts Vite immediately, then PostgreSQL and the account/game API. A delayed database migration no longer prevents the preview page from opening; the terminal reports any database or API failure while Vite remains available. Open `http://localhost:5173/` and create an account. The build creates the frontend in `dist/`; accounts and game rewards require the Node API behind `/api/auth/` and `/api/game/`. Opening index.html directly is unsupported. `public/data/questions.json` contains supplied content; `public/data/curriculum.json` provides display labels and curriculum mapping.

## Accounts

The app now uses one PostgreSQL account ID for learning progress, questions, XP, inventory, achievements and cosmetics. New accounts require an email verification link. In local development the launcher prints verification and reset links to its command window. The sign-in screens include Google, Apple and Microsoft; those buttons remain inactive until each provider has been registered. Copy `.env.example` to `.env.local` and add the provider and email sender details when available. The local database migration is applied when the launcher restarts. Previous browser learning progress is offered for explicit import after sign-in; preview-game inventory is not automatically transferred.

For a hosted deployment, configure HTTPS, a managed PostgreSQL connection, a verified email sender, all OAuth provider credentials and callback URLs, a trusted reverse proxy, and a database role with least-privilege access. Live end-to-end verification and a security review are still required before production use.

The complete authored bank is retained in compressed form at `data/questions-bank.json.gz`. `pnpm build` regenerates deployable per-subject files in `public/data/questions/`; the browser loads only selected subjects. The production API reads trusted marking records from Neon. After changing content, regenerate the compressed source and rerun `pnpm deploy:neon` before deploying the web build.

For the exact Neon migration, Cloudflare Hyperdrive binding, Pages settings, secrets, OAuth callback and go-live checks, see [docs/NEON-CLOUDFLARE-SETUP.md](docs/NEON-CLOUDFLARE-SETUP.md).

See [GAME-APP.md](GAME-APP.md) for game features, startup, persistence and remaining production work.

## Cosmetics and character

The local game service now serves 302 cosmetics across 23 visual categories and 30 theme worlds. This includes Dougie and Dotty, two Legendary miniature dachshund companions at 3,600 study coins each. The store, locker, avatar and item inspector render explicit procedural Three.js models for all 302 IDs. Item cards share one portrait renderer; the avatar and inspector create visible scenes on demand. The avatar has six hair styles, reduced-motion support, try-on previews, saved outfits and a dedicated cosmetic title slot.

`database/migrations/003-cosmetic-presentations.sql` adds presentation data and versioned loadouts. Existing economic records and ownership were retained. The rear attachment rule allows one of a cape, wings or back item at a time; a migrated conflict stays owned and appears as a choice notice. See [COSMETICS-IMPLEMENTATION.md](COSMETICS-IMPLEMENTATION.md) for technical details and verified behaviour.

## Implemented

- Three-step onboarding, studied topics, Foundation/Higher filtering, 3/6/10-minute goals.
- Daily and chosen-topic practice, one question at a time, autosaved drafts, feedback, alternate-question concept retry where a later slot exists, fixed session length, completion and a clear stopping point.
- Initial rule-based marking with outcomes correct / incorrect final value / partial / review needed / not yet recalled. After feedback the student can reveal the mark scheme, revise their answer, award themselves marks and challenge an individual rubric point. No student self-check is shown as an independent mark.
- Separate attempts, hints, review schedules, evidence, XP, reports and settings. Deterministic attempt IDs prevent repeat submission awards after refresh. Interrupted submitted/next states recover safely.
- Learners can select multiple AQA GCSE subjects and Years 9, 10 or 11. Daily Mix samples their selected subjects; automatic coverage sequences question-bearing specification points across the three school years.
- Account-linked progress, topic detail, learning coverage, conservative retention states, weekly consistency, achievements, dispute export and usefulness feedback.
- Dark/light themes, keyboard focus, live feedback, reduced motion and responsive desktop/mobile navigation.
- Returning-user preview in Profile; it changes presentation without falsifying history.

## Marking limits

`src/marking.ts` applies explicit whole-answer variants to the two starting energy-store questions, known wrong-answer rules for those questions, final numeric value + unit checks for supported numerical formats, and exact complete-reference answer acceptance. Case is significant for unit prefixes. Numeric equivalence uses a small relative tolerance for representation, not arbitrary rounding. Unsupported formats, prose, missing method evidence and unfamiliar equivalent wording are routed to review; they are never rejected just because a keyword is absent. Numerical outcomes concern the final answer, not method marks. This is not a general semantic examiner.

When automatic marking is uncertain, the learner compares their answer with the model answer and criteria. They can revise their response, mark each criterion as correct, and save a challenge to their account. Answers and challenges are not sent to a person for checking. Self-awarded marks must never be presented as independently verified or as delayed recall evidence. The exported progress file includes the complete history. All rules need subject-expert review before use for graded assessment.

## Future AI connection

`MarkingProvider` and `apiProvider()` expose a replaceable adapter. Keep the default rule provider until a real authenticated `/api/mark` service is deployed. The API request contains attempt ID, question ID, response, hint flag and content version. The server must load its trusted rubric, enforce access/rate limits and atomically store a result by attempt ID before returning it. Never accept the client as authority for marks, XP or mastery. Never place provider credentials in the frontend or Vite environment variables.

The service must return `MarkingResult`, validate structured output, flag uncertainty and retain provider/rubric/version audit information. On failure, leave the answer saved and retry the same idempotency key. See `../memmara-design.md` for the production plan and schema mapping.

## Deliberate prototype boundaries

Physics, Chemistry and Biology are available for AQA GCSE. MIS integration, classroom analytics, email reminders, real notifications and AI marking are not connected. Learning progress and the game inventory now use account-owned PostgreSQL records. The current progress document is a versioned JSON snapshot and requires normalization for large histories; the game API still uses the local database owner credential and needs a least-privilege production role. OAuth and email delivery require external registrations before they can be exercised. The curriculum file contains subsection-level paraphrases, not a verified atomic specification inventory; its counts are not complete exam coverage.

## File map

- `src/models.ts`: content and progress types
- `src/engine.ts`: import validation, curriculum adapter, session selection, evidence, review/XP updates
- `src/marking.ts`: rules and future API adapter
- `../self_check_schema.sql`: relational persistence for mark-scheme criteria, answer revisions, criterion-level self-checks and challenges
- `src/main.tsx`: connected screens and session controller
- `src/styles.css`: semantic theme tokens and responsive components
- `public/design.html`: mobile wireframes and clickable live-layout preview frames

## Demonstration route

Select Energy and Electricity, Higher, 3 minutes. Start the daily mix. For the wound-up toy answer `kinetic` to see specific incorrect feedback or `elastic potential energy` for accepted feedback. For a numeric question enter the final value and unit (for the robot: `2.7 J`) or a different value to see correction. For free explanations, unfamiliar wording demonstrates the review-needed state. “I’m not sure yet” demonstrates non-recall. Pause after typing, return Home, then Continue my mix to see the saved draft. Complete five questions to see the daily goal change. Profile offers a missed-day presentation preview. Progress never invents retained knowledge from this short run.

