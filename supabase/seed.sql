-- =============================================================================
-- seed.sql - Development seed data
-- =============================================================================
-- Run after migrations to populate development data.
-- NOTE: In development, create a user via Supabase Auth first,
-- then the trigger will create the public.users row automatically.

-- Default tags for new users
INSERT INTO public.tags (name) VALUES
  ('tech'),
  ('design'),
  ('business'),
  ('science'),
  ('health'),
  ('finance'),
  ('education'),
  ('entertainment'),
  ('news'),
  ('tutorial')
ON CONFLICT (name) DO NOTHING;
