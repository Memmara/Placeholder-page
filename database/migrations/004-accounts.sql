CREATE TABLE IF NOT EXISTS memmara_game.auth_credentials (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 email_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (email = lower(email))
);
CREATE TABLE IF NOT EXISTS memmara_game.auth_identities (
 provider text NOT NULL CHECK (provider IN ('google','apple','microsoft')),
 provider_subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 email_at_link text,
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (provider,provider_subject),
 UNIQUE (user_id,provider)
);
CREATE INDEX IF NOT EXISTS auth_identities_user ON memmara_game.auth_identities(user_id);
CREATE TABLE IF NOT EXISTS memmara_game.auth_account_emails (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 email text NOT NULL,
 verified_at timestamptz
);
CREATE TABLE IF NOT EXISTS memmara_game.auth_oauth_flows (
 state_hash text PRIMARY KEY,
 provider text NOT NULL CHECK (provider IN ('google','apple','microsoft')),
 nonce text NOT NULL,
 code_verifier text NOT NULL,
 link_user_id uuid REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 link_session_hash text,
 return_to text NOT NULL DEFAULT '/dashboard#home',
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memmara_game.auth_sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 persistent boolean NOT NULL DEFAULT true,
 revoked_at timestamptz,
 user_agent text
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_active ON memmara_game.auth_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS memmara_game.auth_tokens (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose ON memmara_game.auth_tokens(user_id,purpose) WHERE used_at IS NULL;
CREATE TABLE IF NOT EXISTS memmara_game.auth_rate_limits (
 key_hash text PRIMARY KEY,
 window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 blocked_until timestamptz
);
CREATE TABLE IF NOT EXISTS memmara_game.learning_progress (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id) ON DELETE CASCADE,
 document jsonb NOT NULL,
 version bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE memmara_game.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.auth_account_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.auth_oauth_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_learning_progress ON memmara_game.learning_progress USING (user_id=NULLIF(current_setting('app.user_id',true),'')::uuid) WITH CHECK (user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
REVOKE ALL ON memmara_game.auth_credentials,memmara_game.auth_identities,memmara_game.auth_sessions,memmara_game.auth_tokens,memmara_game.auth_rate_limits,memmara_game.auth_account_emails,memmara_game.auth_oauth_flows,memmara_game.learning_progress FROM PUBLIC;
