-- Studio generations: persist Content Studio AI outputs
CREATE TABLE IF NOT EXISTS studio_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional',
  length TEXT NOT NULL DEFAULT 'medium',
  source_clip_ids UUID[] NOT NULL DEFAULT '{}',
  output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's generations (newest first)
CREATE INDEX idx_studio_generations_user ON studio_generations (user_id, created_at DESC);

-- RLS
ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generations"
  ON studio_generations FOR SELECT
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own generations"
  ON studio_generations FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own generations"
  ON studio_generations FOR DELETE
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
