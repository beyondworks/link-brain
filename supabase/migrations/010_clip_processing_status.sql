-- 010: Add processing status columns to clips table
-- Supports async clip pipeline: instant save + background extraction

-- Processing status columns
ALTER TABLE clips ADD COLUMN processing_status text NOT NULL DEFAULT 'pending'
  CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed'));
ALTER TABLE clips ADD COLUMN processing_error text;
ALTER TABLE clips ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE clips ADD COLUMN processed_at timestamptz;

-- Existing clips are already fully processed
UPDATE clips SET processing_status = 'ready', processed_at = updated_at;

-- Partial index for retry/processing queries
CREATE INDEX idx_clips_processing_status ON clips(processing_status)
  WHERE processing_status IN ('pending', 'failed');
