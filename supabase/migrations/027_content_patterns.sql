-- Aggregated content patterns from user clips (collective learning)
CREATE TABLE IF NOT EXISTS content_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  platform text,
  sample_count integer NOT NULL DEFAULT 0,
  avg_char_count integer,
  avg_paragraph_count integer,
  avg_heading_count integer,
  avg_title_length integer,
  intro_patterns jsonb DEFAULT '{}',
  structure_summary text,
  top_keywords jsonb DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, platform)
);
