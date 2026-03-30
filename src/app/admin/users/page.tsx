export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminUsersClient, type UserRow } from './admin-users-client';

async function getUsers(): Promise<UserRow[]> {
  const db = supabaseAdmin as never as typeof supabaseAdmin;

  const { data } = await db
    .from('users')
    .select('id, auth_id, email, display_name, avatar_url, role, plan, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (!data) return [];

  const users = data as { id: string; auth_id: string }[];
  const userIds = users.map((u) => u.id);

  // Clip counts + auth users (parallel)
  const [clipCountResult, authListResult] = await Promise.all([
    (db as never as typeof supabaseAdmin)
      .rpc('get_user_clip_counts' as never, { p_user_ids: userIds } as never),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const clipCounts: Record<string, number> = {};
  if (clipCountResult.data) {
    for (const row of clipCountResult.data as { user_id: string; clip_count: number }[]) {
      clipCounts[row.user_id] = row.clip_count;
    }
  }

  const lastSignIns: Record<string, string | null> = {};
  if (authListResult.data?.users) {
    for (const au of authListResult.data.users) {
      lastSignIns[au.id] = au.last_sign_in_at ?? null;
    }
  }

  return (data as Omit<UserRow, 'clip_count' | 'last_active'>[]).map((u) => ({
    ...u,
    clip_count: clipCounts[u.id] ?? 0,
    last_active: lastSignIns[u.auth_id] ?? null,
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();
  return <AdminUsersClient users={users} />;
}
