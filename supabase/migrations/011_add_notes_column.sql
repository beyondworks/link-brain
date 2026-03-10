-- Add notes column to clips table for user memos
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS notes TEXT;
