-- Review Vault runs are verified learning sessions with lower rewards.
ALTER TABLE memmara_game.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_mode_check;
ALTER TABLE memmara_game.study_sessions ADD CONSTRAINT study_sessions_mode_check
 CHECK (mode IN ('daily_mix','topic','exam','speed_select','review'));
