import { createBrowserClient } from '@supabase/ssr';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/SSG, env vars may not exist — return a dummy-safe client
    // that will be replaced at runtime when env vars are available
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = getSupabaseClient();
