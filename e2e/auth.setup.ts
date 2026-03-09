/**
 * Playwright auth setup — logs in via Supabase and saves storageState.
 *
 * Requires E2E_EMAIL and E2E_PASSWORD env vars.
 * Usage: set `storageState` in playwright.config.ts or use in test beforeAll.
 */
import { chromium, type BrowserContext } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ucflmznygocgdwreoygc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Hmu7Au_rKhi9BkPDZyHcKw_1EeyF3zk';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string };
}

export async function getSupabaseSession(email: string, password: string): Promise<AuthSession | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    user: { id: data.user.id, email: data.user.email },
  };
}

/**
 * Inject Supabase session into browser localStorage so the app picks it up.
 */
export async function injectSession(context: BrowserContext, session: AuthSession): Promise<void> {
  const storageKey = `sb-ucflmznygocgdwreoygc-auth-token`;
  const storageValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    token_type: 'bearer',
    user: session.user,
  });

  // Add localStorage entry to the context before navigation
  await context.addInitScript((args: { key: string; value: string }) => {
    window.localStorage.setItem(args.key, args.value);
  }, { key: storageKey, value: storageValue });
}

/**
 * Login via the UI as a fallback.
 */
export async function loginViaUI(context: BrowserContext, email: string, password: string): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await page.close();
    return true;
  } catch {
    await page.close();
    return false;
  }
}
