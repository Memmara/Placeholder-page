-- Preview transport state, separate from the immutable original game schema.
CREATE TABLE IF NOT EXISTS memmara_game.local_game_clients (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id),
 history_imported boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memmara_game.local_play_sessions (
 user_id uuid NOT NULL REFERENCES memmara_game.users(id),
 client_ref text NOT NULL,
 session_id uuid NOT NULL REFERENCES memmara_game.study_sessions(id),
 question_ids jsonb NOT NULL,
 answers jsonb NOT NULL DEFAULT '{}',
 completed boolean NOT NULL DEFAULT false,
 PRIMARY KEY(user_id,client_ref)
);
CREATE INDEX IF NOT EXISTS local_play_session_user ON memmara_game.local_play_sessions(user_id,session_id);
ALTER TABLE memmara_game.local_game_clients ADD COLUMN IF NOT EXISTS history_version integer NOT NULL DEFAULT 0;
ALTER TABLE memmara_game.local_game_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.local_play_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_user ON memmara_game.local_game_clients
 USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY own_user ON memmara_game.local_play_sessions
 USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
REVOKE ALL ON memmara_game.local_game_clients,memmara_game.local_play_sessions FROM PUBLIC;
