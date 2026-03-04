-- 008: Add 'threads', 'naver', 'pinterest' to clips platform CHECK constraint
-- Required for platform-specific fetchers that detect these platforms

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_platform_check;
ALTER TABLE clips ADD CONSTRAINT clips_platform_check
  CHECK (platform IN (
    'web', 'twitter', 'youtube', 'github',
    'medium', 'substack', 'reddit', 'linkedin',
    'instagram', 'tiktok', 'threads', 'naver', 'pinterest', 'other'
  ));
