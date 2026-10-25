# Memmara production domain

Canonical origin: `https://memmara.com`

The production environment must set:

```dotenv
NODE_ENV=production
MEMMARA_PUBLIC_URL=https://memmara.com
```

This origin is used for OAuth callbacks, password and verification links, Stripe Checkout return URLs, host validation, and browser-origin checks.

## Required public routes

- App: `https://memmara.com/`
- Google callback: `https://memmara.com/api/auth/oauth/google/callback`
- Stripe webhook: `https://memmara.com/api/commerce/webhook`

The `/api/*` routes require the Memmara Node API and PostgreSQL database. A static Cloudflare Pages upload alone cannot run those routes. Put the API behind the same domain using a compatible server host or adapt it to Cloudflare Workers, then proxy `/api/*` through Cloudflare.

Redirect `https://www.memmara.com/*` to `https://memmara.com/*` with a permanent redirect. Keep TLS mode on Full (strict) when an external API origin is used.
