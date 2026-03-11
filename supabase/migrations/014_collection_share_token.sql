-- Add share_token column to collections for public sharing
ALTER TABLE collections ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Index for fast lookup by share_token
CREATE INDEX IF NOT EXISTS idx_collections_share_token ON collections (share_token) WHERE share_token IS NOT NULL;
