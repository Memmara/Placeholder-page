-- Stripe products, purchased token balance, subscription state and webhook idempotency.
ALTER TABLE memmara_game.user_monetisation DROP CONSTRAINT IF EXISTS user_monetisation_account_plan_check;
UPDATE memmara_game.user_monetisation SET account_plan='plus' WHERE account_plan='premium';
ALTER TABLE memmara_game.user_monetisation ADD CONSTRAINT user_monetisation_account_plan_check CHECK(account_plan IN ('free','plus','pro','school'));
ALTER TABLE memmara_game.user_monetisation DROP CONSTRAINT IF EXISTS user_monetisation_practice_tokens_check;
ALTER TABLE memmara_game.user_monetisation ALTER COLUMN practice_tokens TYPE integer;
ALTER TABLE memmara_game.user_monetisation ADD CONSTRAINT user_monetisation_practice_tokens_check CHECK(practice_tokens BETWEEN 0 AND 9);
ALTER TABLE memmara_game.user_monetisation ADD COLUMN IF NOT EXISTS purchased_tokens integer NOT NULL DEFAULT 0 CHECK(purchased_tokens>=0);
ALTER TABLE memmara_game.user_monetisation ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
ALTER TABLE memmara_game.user_monetisation ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;
ALTER TABLE memmara_game.user_monetisation ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE memmara_game.user_monetisation ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

CREATE TABLE IF NOT EXISTS memmara_game.stripe_webhook_events(
 event_id text PRIMARY KEY,event_type text NOT NULL,payload jsonb NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz,error text
);

INSERT INTO memmara_game.products(id,kind,platform,platform_product_id,enabled,metadata) VALUES
 ('stripe_tokens_5','premium_pack','web','memmara_tokens_5',true,'{"product_code":"tokens_5","tokens":5}'::jsonb),
 ('stripe_tokens_10','premium_pack','web','memmara_tokens_10',true,'{"product_code":"tokens_10","tokens":10}'::jsonb),
 ('stripe_plan_plus','subscription','web','memmara_plus_monthly',true,'{"product_code":"plan_plus","plan":"plus"}'::jsonb),
 ('stripe_plan_pro','subscription','web','memmara_pro_monthly',true,'{"product_code":"plan_pro","plan":"pro"}'::jsonb),
 ('stripe_pet_dougie','cosmetic','web','memmara_pet_dougie',true,'{"product_code":"pet_dougie","item_id":"itm_301"}'::jsonb),
 ('stripe_pet_dotty','cosmetic','web','memmara_pet_dotty',true,'{"product_code":"pet_dotty","item_id":"itm_302"}'::jsonb)
ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata;

INSERT INTO memmara_game.product_prices(product_id,region,currency,minor_units,display_price,tax_inclusive,valid_from) VALUES
 ('stripe_tokens_5','GB','GBP',99,'£0.99',true,'2026-10-24'),
 ('stripe_tokens_10','GB','GBP',179,'£1.79',true,'2026-10-24'),
 ('stripe_plan_plus','GB','GBP',299,'£2.99/month',true,'2026-10-24'),
 ('stripe_plan_pro','GB','GBP',999,'£9.99/month',true,'2026-10-24'),
 ('stripe_pet_dougie','GB','GBP',99,'£0.99',true,'2026-10-24'),
 ('stripe_pet_dotty','GB','GBP',99,'£0.99',true,'2026-10-24')
ON CONFLICT DO NOTHING;

ALTER TABLE memmara_game.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON memmara_game.stripe_webhook_events FROM PUBLIC;
