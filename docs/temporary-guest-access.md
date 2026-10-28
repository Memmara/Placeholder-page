# Temporary public guest access

Guest access is enabled by default. Set `VITE_MEMMARA_GUEST_ACCESS=false` in the Cloudflare Pages build environment and deploy again to disable the entry buttons and guest sessions. No account migrations or data deletion are required. `/guest` continues to show public learning examples with an account creation link.

The homepage and login page link to `/guest`, a public page with sample questions and explanations. Continue as guest opens a browser-only preview with a GCSE science and maths plan. Guests can browse the dashboard, subjects and cosmetics. Game cards open an explanation dialog with Sign in to play, Create an account, and Keep exploring actions. Daily Mix, topic practice, Review Vault, Speed Select and all minigames require sign-in before gameplay. Both launch handlers and the guest game adapter reject gameplay; saved guest sessions are cleared on load. Static sample questions on `/guest` remain available without signing in.

Guest progress and cosmetics use separate `memmara.guest.*` storage keys. They never write to authenticated user APIs, grant server rewards, charge payments or change the existing signed-in account. Sign in exits guest mode; guest progress does not automatically transfer. Local development preview continues to use its existing separate keys. Clearing browser storage removes guest progress.

The guest experience is visible to everyone, not only reviewers. API authentication and ownership checks remain enabled. Public access may help reviewers inspect the service, but does not guarantee AdSense approval. Keep crawlable learning content available and configure any required crawler access before restricting ad-bearing pages again.

`/guest` is included in the public sitemap. A dedicated Mediapartners-Google robots.txt group allows the AdSense crawler to fetch public practice assets, while API and account restrictions remain in place. General search crawlers still avoid personalised app routes.
