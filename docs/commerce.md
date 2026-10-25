# Memmara commerce setup

The UI is available at `/shop`. Real charges remain disabled until Stripe is configured.

## Stripe

1. Create six Stripe Prices: 5 tokens (£0.99 one-off), 10 tokens (£1.79 one-off), Plus (£2.99 monthly), Pro (£9.99 monthly), Dougie (£0.99 one-off), and Dotty (£0.99 one-off).
2. Copy `.env.example` to `.env` and set the Stripe secret, publishable key, webhook secret, and the six Price IDs.
3. Set `MEMMARA_COMMERCE_ENABLED=1` only after using Stripe test mode successfully.
4. Register `POST /api/commerce/webhook` for `checkout.session.completed`, `payment_intent.succeeded`, and `customer.subscription.updated/deleted`.
5. Accounts must have purchases enabled by the existing account policy. School-managed accounts are always blocked.

The webhook is the authoritative grant path. It is signature checked and idempotent. The success page only refreshes state.

## Capacitor

The web bundle detects Capacitor at runtime. A native shell must include the official Capacitor App and Browser plugins plus `@capacitor-community/stripe`. Token, pet, and subscription purchases use Stripe PaymentSheet in native builds. Before public iOS/Android distribution, confirm that the chosen checkout model complies with the current App Store and Play digital-goods rules; native store billing may be required.

Rewarded ads use the existing AdMob adapter on native builds. On web, Memmara uses Google Publisher Tag rewarded inventory when configured; otherwise the user sees the requested unavailable message.

## Purchase catalogue

| Product | Code | Price |
|---|---|---:|
| 5 tokens | `tokens_5` | £0.99 |
| 10 tokens | `tokens_10` | £1.79 |
| Plus monthly | `plan_plus` | £2.99 |
| Pro monthly | `plan_pro` | £9.99 |
| Dougie | `pet_dougie` | £0.99 |
| Dotty | `pet_dotty` | £0.99 |
