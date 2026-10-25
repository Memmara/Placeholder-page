-- One authoritative entitlement row per learner. Organic energy refills to two;
-- rewarded ads may temporarily raise the balance to three.
CREATE TABLE IF NOT EXISTS memmara_game.user_monetisation (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 account_plan text NOT NULL DEFAULT 'free' CHECK(account_plan IN ('free','premium','school')),
 practice_tokens smallint NOT NULL DEFAULT 2 CHECK(practice_tokens BETWEEN 0 AND 3),
 next_token_at timestamptz,
 xp_boost_pending boolean NOT NULL DEFAULT false,
 xp_boost_granted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(practice_tokens < 2 OR next_token_at IS NULL)
);

CREATE TABLE IF NOT EXISTS memmara_game.ad_reward_intents (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 reward_kind text NOT NULL CHECK(reward_kind IN ('token','xp_boost')),
 provider text NOT NULL CHECK(provider IN ('web_google','admob','development')),
 completion_token_hash text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','expired','rejected')),
 provider_transaction_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 completed_at timestamptz,
 UNIQUE(user_id,id),
 UNIQUE(provider,provider_transaction_id)
);
CREATE INDEX IF NOT EXISTS ad_reward_intents_user_created
 ON memmara_game.ad_reward_intents(user_id,created_at DESC);

ALTER TABLE memmara_game.study_sessions
 ADD COLUMN IF NOT EXISTS xp_multiplier smallint NOT NULL DEFAULT 1 CHECK(xp_multiplier IN (1,2));
ALTER TABLE memmara_game.study_sessions
 ADD COLUMN IF NOT EXISTS token_spent boolean NOT NULL DEFAULT false;

ALTER TABLE memmara_game.user_monetisation ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.ad_reward_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_user ON memmara_game.user_monetisation
 USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY own_user ON memmara_game.ad_reward_intents
 USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
REVOKE ALL ON memmara_game.user_monetisation,memmara_game.ad_reward_intents FROM PUBLIC;
