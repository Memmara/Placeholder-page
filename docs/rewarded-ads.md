# Memmara rewarded ads and practice tokens

## Architecture

The browser never changes tokens or XP flags itself. It requests a short-lived reward intent from the authenticated game API, displays an ad through the selected adapter, and completes the intent only after the provider's earned-reward callback. The API serialises mutations on the signed-in user row and returns the refreshed game state.

```text
RewardedAdsCard / useRewardedAds
             |
             v
showTokenAd / showXpBoostAd / showRewardedAd
             |
     Capacitor platform check
       /                 \
Google Publisher Tag   Capacitor AdMob plugin
       \                 /
        earned callback
             |
 POST /api/game/ad-complete
             |
 user_monetisation + ad_reward_intents
```

An unavailable, failed, timed-out, cancelled, or early-closed ad leaves the reward intent uncompleted and grants nothing. Development simulation works only with `VITE_MEMMARA_ADS_SIMULATE=1`; the API rejects development completion in production.

## Token regeneration

- Free accounts start with two organic practice tokens.
- One token regenerates every five hours until the organic balance reaches two.
- A rewarded ad adds one token and may temporarily raise the balance to three.
- Starting the first answered question of a new server session spends one token atomically.
- Going from two tokens to one starts the five-hour clock. A balance of two or three has no refill timer.
- Premium and school plans retain the same database shape but do not spend practice tokens.

## XP boost

`xp_boost_pending` is set only after a completed rewarded ad. The next new study session copies that flag into `study_sessions.xp_multiplier=2` and clears the pending flag in the same transaction. Every XP ledger entry for that session is multiplied by two, including completion and streak XP. Existing or resumed server sessions cannot consume another boost.

## Database records

Migration `006-monetisation.sql` adds:

- `user_monetisation`: one row per user containing plan, token balance, next regeneration timestamp, and pending XP boost.
- `ad_reward_intents`: expiring, single-use reward intents and provider transaction references.
- `study_sessions.xp_multiplier`: immutable multiplier selected when the session begins.
- `study_sessions.token_spent`: audit evidence that the session consumed an entitlement.

Both new tables use the existing `user_id` ownership model and row-level security policy. The migration is applied automatically by the catalogue migration loader at server startup.

## Configuration

Set the three production ad identifiers in `.env`:

```dotenv
VITE_MEMMARA_WEB_REWARDED_AD_UNIT=/network-code/memmara_rewarded
VITE_MEMMARA_ADMOB_IOS_REWARDED_ID=ca-app-pub-xxx/ios-unit
VITE_MEMMARA_ADMOB_ANDROID_APP_ID=ca-app-pub-7297433574610458~2374774011
VITE_MEMMARA_ADMOB_ANDROID_BANNER_ID=ca-app-pub-7297433574610458/1061692341
VITE_MEMMARA_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-7297433574610458/3496283993
```

Free Android users receive an adaptive banner positioned above the mobile navigation during Daily Mix, Speed Select, Review sessions and Minigames. The banner is hidden on Home and non-game pages. Plus and Pro remove it. Development builds always use Google's demo banner and rewarded units; production builds use the configured Memmara units.

For a Capacitor app, install the compatible major versions of Capacitor and `@capacitor-community/admob`, add the AdMob application IDs to `AndroidManifest.xml` and `Info.plist`, then run `npx cap sync`. The adapter first uses the registered `window.Capacitor.Plugins.AdMob` bridge, so the existing web build does not require the native plugin package.

The mobile adapter passes the intent ID and completion token through AdMob SSV custom data. Before launch, configure the AdMob SSV callback to verify Google's ECDSA signature and reconcile the matching `ad_reward_intents` record. Client earned callbacks provide immediate UX; SSV provides fraud auditing and reversal/rejection policy.

## Web and mobile difference

Ordinary AdSense display ads do not expose a reliable earned-reward event. Memmara therefore uses Google's web rewarded format through Google Publisher Tag and a Google Ad Manager rewarded ad unit. Native iOS and Android builds use the Google Mobile Ads SDK through the Capacitor AdMob plugin. Both adapters feed the same server reward-intent API and account-owned entitlement row.
