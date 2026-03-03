-- 009: OAuth Connections
-- Stores OAuth tokens for platform integrations (Threads, YouTube, etc.)

CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'threads' | 'youtube' | etc.
  provider_user_id TEXT NOT NULL,      -- platform user ID
  provider_username TEXT,              -- @handle
  access_token TEXT NOT NULL,          -- AES-256-GCM encrypted
  refresh_token TEXT,                  -- encrypted (if applicable)
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)            -- one account per platform
);

-- RLS: users can only view/delete their own connections
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON oauth_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own connections"
  ON oauth_connections FOR DELETE
  USING (user_id = auth.uid());

-- INSERT/UPDATE are server-only via supabaseAdmin (service role bypasses RLS)

-- Index for fast lookups
CREATE INDEX idx_oauth_connections_user_provider
  ON oauth_connections(user_id, provider);

-- Updated_at trigger
CREATE TRIGGER set_oauth_connections_updated_at
  BEFORE UPDATE ON oauth_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
