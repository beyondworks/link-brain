/**
 * Ensure a public.users row exists for the given auth UID.
 * Returns the public.users.id (app-level UUID).
 *
 * This handles users who signed up before the 007_user_creation_trigger
 * was applied — they have an auth.users row but no public.users row.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

/**
 * Look up public.users by auth_id. If missing, create the row
 * from auth.users metadata. Returns the public.users.id.
 */
export async function ensurePublicUser(authUid: string): Promise<string> {
  // 1. Try to find existing row
  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('auth_id', authUid)
    .single();

  if (existing) {
    return (existing as { id: string }).id;
  }

  // 2. Fetch auth user metadata to populate profile
  const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(authUid);

  const email = adminUser?.email ?? `${authUid}@unknown`;
  const meta = adminUser?.user_metadata ?? {};
  const displayName =
    meta.display_name ?? meta.full_name ?? meta.name ?? email.split('@')[0];
  const avatarUrl = meta.avatar_url ?? meta.picture ?? null;

  // 3. Insert public.users row
  const { data: newUser, error } = await db
    .from('users')
    .insert({
      auth_id: authUid,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select('id')
    .single();

  if (error) {
    // Race condition: another request may have created the row
    if (error.code === '23505') {
      const { data: retry } = await db
        .from('users')
        .select('id')
        .eq('auth_id', authUid)
        .single();
      if (retry) return (retry as { id: string }).id;
    }
    throw new Error(`Failed to create public user: ${error.message}`);
  }

  // 4. Create default credits & subscription rows (mirrors trigger logic)
  const userId = (newUser as { id: string }).id;
  await Promise.all([
    db.from('credits').insert({ user_id: userId }),
    db.from('subscriptions').insert({ user_id: userId }),
  ]);

  return userId;
}
