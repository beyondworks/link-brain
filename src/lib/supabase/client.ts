import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/SSG, env vars may not exist — return a dummy-safe client
    // that will be replaced at runtime when env vars are available
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient<Database>(url, key);
}

export const supabase = getSupabaseClient();
