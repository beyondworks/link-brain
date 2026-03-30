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

  const userIds = (data as { id: string }[]).map((u) => u.id);
  const { data: clipCountData } = await (db as never as typeof supabaseAdmin)
    .rpc('get_user_clip_counts' as never, { p_user_ids: userIds } as never);

  const clipCounts: Record<string, number> = {};
  if (clipCountData) {
    for (const row of clipCountData as { user_id: string; clip_count: number }[]) {
      clipCounts[row.user_id] = row.clip_count;
    }
  }

  return (data as Omit<UserRow, 'clip_count'>[]).map((u) => ({
    ...u,
    clip_count: clipCounts[u.id] ?? 0,
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();
  return <AdminUsersClient users={users} />;
}
