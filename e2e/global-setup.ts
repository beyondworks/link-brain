/**
 * Playwright Global Setup — Supabase admin session injection
 *
 * Creates a session via admin API, writes storage state JSON directly
 * (no browser needed in setup phase).
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucflmznygocgdwreoygc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hmu7Au_rKhi9BkPDZyHcKw_1EeyF3zk';
const TEST_EMAIL = 'beyondworks.br@gmail.com';
const AUTH_STATE_PATH = path.join(process.cwd(), 'e2e/.auth/state.json');
const PROJECT_REF = 'ucflmznygocgdwreoygc';
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

function loadServiceKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
    const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    return match?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

export default async function globalSetup() {
  const serviceKey = loadServiceKey();
  if (!serviceKey) {
    console.warn('[E2E Setup] No service key found');
    return;
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Generate magic link
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[E2E Setup] Link failed:', linkErr?.message);
    return;
  }

  // 2. Verify OTP to get real session
  const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyErr || !verifyData.session) {
    console.error('[E2E Setup] Verify failed:', verifyErr?.message);
    return;
  }

  console.log('[E2E Setup] Session created for', TEST_EMAIL);

  // 3. Build cookies + localStorage for Playwright storageState
  const session = verifyData.session;
  const cookieBase = {
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + 3600,
  };

  // Supabase SSR stores session across chunked cookies
  const sessionStr = JSON.stringify(session);
  const CHUNK_SIZE = 3000;
  const chunks = [];
  for (let i = 0; i < sessionStr.length; i += CHUNK_SIZE) {
    chunks.push(sessionStr.slice(i, i + CHUNK_SIZE));
  }

  const cookies = chunks.map((chunk, i) => ({
    name: chunks.length === 1 ? STORAGE_KEY : `${STORAGE_KEY}.${i}`,
    value: chunk,
    ...cookieBase,
  }));

  const storageState = {
    cookies,
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: STORAGE_KEY,
            value: JSON.stringify(session),
          },
        ],
      },
    ],
  };

  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(storageState, null, 2));
  console.log('[E2E Setup] State saved to', AUTH_STATE_PATH);
}
