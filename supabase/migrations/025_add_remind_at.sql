-- Add remind_at column for clip reminders
ALTER TABLE clips ADD COLUMN IF NOT EXISTS remind_at timestamptz;

-- Index for efficient reminder queries (finding due reminders)
CREATE INDEX IF NOT EXISTS idx_clips_remind_at
  ON clips (remind_at)
  WHERE remind_at IS NOT NULL;
