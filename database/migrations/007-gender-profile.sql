ALTER TABLE memmara_game.users
 ADD COLUMN IF NOT EXISTS gender_identity text
 CHECK(gender_identity IN ('male','female','prefer_not_to_say'));

ALTER TABLE memmara_game.avatars DROP CONSTRAINT IF EXISTS avatars_body_type_check;
UPDATE memmara_game.avatars SET body_type='prefer_not_to_say' WHERE body_type NOT IN ('male','female','prefer_not_to_say');
ALTER TABLE memmara_game.avatars ADD CONSTRAINT avatars_body_type_check
 CHECK(body_type IN ('male','female','prefer_not_to_say'));
