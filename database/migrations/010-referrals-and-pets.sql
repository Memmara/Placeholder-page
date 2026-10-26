CREATE TABLE IF NOT EXISTS referral_codes (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z2-9]{8}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS referrals (
 invited_user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 inviter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code text NOT NULL REFERENCES referral_codes(code),
 created_at timestamptz NOT NULL DEFAULT now(),
 qualified_at timestamptz,
 CHECK (invited_user_id <> inviter_user_id)
);
CREATE INDEX IF NOT EXISTS referrals_inviter_idx ON referrals(inviter_user_id,qualified_at);
ALTER TABLE user_monetisation ADD COLUMN IF NOT EXISTS referral_plus_until timestamptz;
UPDATE items SET premium_price=NULL,real_money_product_id=NULL,purchasable_with_real_money=false WHERE id IN ('itm_301','itm_302');
UPDATE products SET enabled=false WHERE id IN ('stripe_plan_pro','stripe_pet_dougie','stripe_pet_dotty');

ALTER TABLE auth_oauth_flows ADD COLUMN IF NOT EXISTS referral_code text;
