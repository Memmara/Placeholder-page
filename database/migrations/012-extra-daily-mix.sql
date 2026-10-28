-- Free accounts refill one token every five hours. Existing balances of two
-- are reduced once on migration; purchased tokens remain separate.
UPDATE memmara_game.user_monetisation
SET practice_tokens=1, updated_at=now()
WHERE account_plan='free' AND practice_tokens=2;

ALTER TABLE memmara_game.user_monetisation
ALTER COLUMN practice_tokens SET DEFAULT 1;

ALTER TABLE memmara_game.ad_reward_intents
DROP CONSTRAINT IF EXISTS ad_reward_intents_reward_kind_check;
ALTER TABLE memmara_game.ad_reward_intents
ADD CONSTRAINT ad_reward_intents_reward_kind_check
CHECK(reward_kind IN ('token','xp_boost','daily_mix'));
