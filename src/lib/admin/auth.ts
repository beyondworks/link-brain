import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

interface AdminUser {
  authId: string;
  publicUserId: string;
  email: string;
}

/**
 * Verify admin access: DB role = 'admin' AND email in ADMIN_EMAILS.
 * Redirects to /dashboard if not admin.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/dashboard');

  const email = user.email.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) redirect('/dashboard');

  const { data: dbUser } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser || (dbUser as { role: string }).role !== 'admin') redirect('/dashboard');

  return { authId: user.id, publicUserId: (dbUser as { id: string }).id, email };
}

/**
 * Check admin status without redirect (for API routes).
 * Returns null if not admin.
 */
export async function checkAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;

  const { data: dbUser } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser || (dbUser as { role: string }).role !== 'admin') return null;

  return { authId: user.id, publicUserId: (dbUser as { id: string }).id, email };
}
