export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { Shield, ShieldCheck } from 'lucide-react';

interface UserRow {
  id: string;
  auth_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  plan: string;
  created_at: string;
  updated_at: string;
  clip_count: number;
}

async function getUsers(): Promise<{ users: UserRow[]; total: number }> {
  const db = supabaseAdmin as never as typeof supabaseAdmin;

  const { data, count } = await db
    .from('users')
    .select('id, auth_id, email, display_name, avatar_url, role, plan, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(100);

  if (!data) return { users: [], total: 0 };

  // Fetch clip counts via server-side RPC aggregation (no row limit issue)
  const userIds = (data as { id: string }[]).map((u) => u.id);
  const { data: clipCountData } = await (db as never as typeof supabaseAdmin)
    .rpc('get_user_clip_counts' as never, { p_user_ids: userIds } as never);

  const clipCounts: Record<string, number> = {};
  if (clipCountData) {
    for (const row of clipCountData as { user_id: string; clip_count: number }[]) {
      clipCounts[row.user_id] = row.clip_count;
    }
  }

  const users: UserRow[] = (
    data as Omit<UserRow, 'clip_count'>[]
  ).map((u) => ({ ...u, clip_count: clipCounts[u.id] ?? 0 }));

  return { users, total: count ?? 0 };
}

const PLAN_STYLES: Record<string, string> = {
  pro: 'bg-violet-500/10 text-violet-500',
  master: 'bg-amber-500/10 text-amber-500',
  free: 'bg-muted text-muted-foreground',
};

export default async function AdminUsersPage() {
  const { users, total } = await getUsers();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            총 {total}명의 사용자
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  사용자
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  이메일
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  역할
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  플랜
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  클립 수
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  가입일
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/30 transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {(user.display_name ?? user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-foreground">
                        {user.display_name ?? user.email.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-500">
                        <ShieldCheck size={12} />
                        관리자
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Shield size={12} />
                        사용자
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PLAN_STYLES[user.plan] ?? PLAN_STYLES.free}`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground">
                    {user.clip_count.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
