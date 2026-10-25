# Avatar, Inventory, Store and Achievements

## Open the app

Run `pnpm dev` from this folder, using Node 24 or newer. This keeps three local services running:

- PostgreSQL: `127.0.0.1:54329`, database `memmara`.
- Game API: `127.0.0.1:5178`, proxied through Vite.
- App: `http://localhost:5173/?preview=biology#avatar`.

Keep the command running while using the preview. For a fresh computer, install dependencies in both the app and `database/`, then run `node database/database.mjs setup` before `pnpm dev`. The private `.local-db` directory contains the persistent database and generated local secrets; it is excluded from source control and frontend output. Do not publish it. `pnpm build` builds the frontend only.

## Working in this version

- Avatar, Inventory, Store and Achievements navigation on desktop and mobile.
- Original procedural Three.js character with skin colours, four hair choices, hair colours, starter top colours, expressions, rotation controls, idle and equip movement, and reduced motion support.
- Equipped clothing, headwear, accessories, tools, pets, aura particles and orbital scenery update the preview. GPU resources are disposed when a preview closes.
- 300 catalogue records, including 225 coin items and 75 study exclusives, imported from the supplied game design catalogue. Search, slot and rarity filters, owned states, item try-on and saved favourites.
- Explicit coin purchase confirmation with server-owned prices, ownership checks, a locked wallet, append-only ledger and idempotent purchase references. No real-money UI or payment routes.
- Persistent avatar appearance, owned inventory, equipping/removing, item favourites, named equipment outfits and three showcase positions.
- Collection counts and 30 set collections. Matching set counts are shown; all gear is cosmetic.
- First qualifying Daily Mix of each server day: 60 coins and an earned reward box. Three further qualifying sessions can earn 45 coins each. A qualifying session needs all 5–12 slots answered, at least three nonblank responses and three distinct curriculum references.
- New answers are re-marked on the server using the stored question bank. Correct unaided answers receive performance XP; self-check revisions do not become independent recall evidence.
- Level milestone rewards use the supplied level table, with the existing unlimited level formula after level 50. Level one rewards are granted after the first qualifying session. Existing browser history is re-graded once for XP continuity; historical answers do not directly mint coins.
- Earned box reveals, published rarity weights, eligible-opening pity counters, duplicate conversion and ledger entries. Boxes cannot be bought. Daily/weekly coin budgets and shard limits are applied server-side.
- Fifty achievement definitions and tracked progress. Supported learning, daily practice, streak and collection milestones can award their configured coins, shards and gear. Unsupported subjects and paper mode are labelled as future features. Mastery badges require delayed independent written recall; MCQ and post-reveal self-check results do not satisfy that condition.

## Observed walkthrough

In the isolated `preview=avatar-check` namespace, a five-question Biology/Physics Daily Mix completed through the actual app. Participation and performance XP appeared, a level-up dialog opened, and completion added coins, level gear, boxes and two achievements. Opening the daily box revealed an item and 31 coins. A 120-coin hat purchase changed the balance from 351 to 231; equipping it updated the character and survived a page refresh. Avatar colour changes and a named outfit saved successfully. This walkthrough does not change the main `preview=biology` learning history.

TypeScript checking and the Vite production build completed. This is not a production load, security, accessibility or complete question-bank audit.

## Persistence and deployment boundaries

The game service loads PostgreSQL credentials only on the server. Database mutation requests derive the learner from a signed HttpOnly SameSite cookie and validate local host/origin. User rows are explicitly scoped; mutations for one learner serialize. SQL constraints validate equipment ownership and wallet balances. Migration `database/migrations/002-local-game.sql` is checksum recorded separately from the previously applied schema.

This is a local preview identity. The local API currently runs with the local database owner. Before deployment, replace the preview cookie with authenticated school/parent accounts, use a restricted database role and transaction-scoped RLS identity, move catalogue seeding to deployment, add request throttling and conflict/version handling, and migrate the remaining learning history off browser storage. Do not deploy this local API directly to the internet.

The 3D gear uses procedural prototype shapes and theme colours, rather than 300 individually authored artist models. Upgrade forms, item mastery effects, pet bonding, animated set bonuses, paper mode, weekly quests, season-pass screens, social profiles and payments are not implemented in this UI. Their design/schema remains available in `../memmara-game-system/`. Imported history preserves prior learning progress but cannot provide independently verified achievement or streak evidence.
