# Cosmetics implementation · 21 October 2026

## What is live locally

The Memmara store, locker and avatar use the approved 302-item catalogue. The original 300 item records keep their prices, rarity, unlocks and loot configuration. Dougie and Dotty are additional Legendary, 3,600-coin companions and do not appear in drop pools. Every item ID has an explicit procedural Three.js recipe in `src/cosmetics/`; the same geometry appears in item portraits, isolated inspection and avatar try-on. The 30 world cards, 23 categories, saved outfits, favourites, wishlist, showcase and achievements remain in the app.

The new database migration is `database/migrations/003-cosmetic-presentations.sql`. It adds presentation metadata and versioned equipment tables. Legacy equipment rows remain available as rollback records. A migrated slot conflict is shown to the player without removing either owned item. Capes, wings and back items share a rear attachment exclusion rule.

## Verification completed

- TypeScript and Vite production build completed successfully.
- All 302 model recipes were instantiated headlessly and returned valid mesh geometry and bounds: 62 companions, 121 wearables and 119 other pieces.
- The isolated local API account verified a Dougie purchase, idempotent repeat purchase, equipping, rear attachment replacement, outfit save and restore, braids, and Dotty wishlist persistence.
- Database fingerprints before and after the migration matched for original items, wallets, inventory, unlocks, set bonuses, loot odds and pity counters.
- The live browser preview was visually reviewed on desktop and mobile for the store, avatar, theme gallery, item inspection and try-on.

## Production art boundary

The models are authored procedural geometry. The concept boards in `../memmara-cosmetics-redesign/` are direction references, not the in-game models. Individual animations currently use restrained idle movements; the fuller animation briefs in the design package are future art direction. These assets can later be replaced with optimized artist-built meshes without changing item IDs or economic entitlements.

## Run

`node server/start-local.mjs` starts the configured local PostgreSQL, game API and Vite preview. Open `http://localhost:5173/?preview=biology#store`.
