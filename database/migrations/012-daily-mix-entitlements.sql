-- Free learners hold one regenerating token. Extra Daily Mixes are unlocked
-- independently by rewarded ads, so the unlock never replaces the token cost.
ALTER TABLE memmara_game.user_monetisation
 ALTER COLUMN practice_tokens SET DEFAULT 1;

UPDATE memmara_game.user_monetisation
 SET practice_tokens=LEAST(practice_tokens,1),
     next_token_at=CASE WHEN practice_tokens>1 THEN NULL ELSE next_token_at END,
     updated_at=now()
 WHERE account_plan='free' AND practice_tokens>1;

ALTER TABLE memmara_game.user_monetisation
 ADD COLUMN IF NOT EXISTS daily_mix_unlock_date date;
ALTER TABLE memmara_game.user_monetisation
 ADD COLUMN IF NOT EXISTS extra_daily_mix_credits integer NOT NULL DEFAULT 0
 CHECK(extra_daily_mix_credits BETWEEN 0 AND 3);

ALTER TABLE memmara_game.ad_reward_intents
 DROP CONSTRAINT IF EXISTS ad_reward_intents_reward_kind_check;
ALTER TABLE memmara_game.ad_reward_intents
 ADD CONSTRAINT ad_reward_intents_reward_kind_check
 CHECK(reward_kind IN ('token','xp_boost','daily_mix_unlock'));
