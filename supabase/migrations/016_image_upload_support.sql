-- 016: Image upload support
-- Adds image upload as a clip source type with OCR + PDF generation

-- 1. Add 'image' to platform CHECK constraint
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_platform_check;
ALTER TABLE clips ADD CONSTRAINT clips_platform_check CHECK (
  platform IS NULL OR platform IN (
    'web', 'twitter', 'youtube', 'github', 'medium', 'substack',
    'reddit', 'linkedin', 'instagram', 'tiktok', 'threads',
    'naver', 'pinterest', 'image', 'other'
  )
);

-- 2. Add source_type column to clips
ALTER TABLE clips ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'url'
  CHECK (source_type IN ('url', 'image_upload'));

-- 3. Create clip_images table
CREATE TABLE IF NOT EXISTS clip_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  original_filename TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  ocr_text TEXT,
  structured_data JSONB,
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by clip_id
CREATE INDEX IF NOT EXISTS idx_clip_images_clip_id ON clip_images(clip_id);

-- 4. RLS policies for clip_images
ALTER TABLE clip_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clip images"
  ON clip_images FOR SELECT
  USING (
    clip_id IN (
      SELECT id FROM clips WHERE user_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own clip images"
  ON clip_images FOR INSERT
  WITH CHECK (
    clip_id IN (
      SELECT id FROM clips WHERE user_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own clip images"
  ON clip_images FOR UPDATE
  USING (
    clip_id IN (
      SELECT id FROM clips WHERE user_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- 5. Storage buckets (run via Supabase dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('clip-uploads', 'clip-uploads', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('clip-pdfs', 'clip-pdfs', true) ON CONFLICT DO NOTHING;
