export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { Shield, ShieldCheck } from 'lucide-react';

async function getUsers() {
  const { data, count } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('users')
    .select('id, auth_id, email, display_name, avatar_url, role, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(100);

  return { users: (data ?? []) as UserRow[], total: count ?? 0 };
}

interface UserRow {
  id: string;
  auth_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

async function getUserClipCounts() {
  const { data } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('clips')
    .select('user_id')
    .limit(5000);

  const counts: Record<string, number> = {};
  if (data) {
    for (const row of data as { user_id: string }[]) {
      counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
    }
  }
  return counts;
}

export default async function AdminUsersPage() {
  const [{ users, total }, clipCounts] = await Promise.all([
    getUsers(),
    getUserClipCounts(),
  ]);

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
        <table className="w-full min-w-[600px] text-sm">
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
                <td className="px-4 py-3 text-center tabular-nums text-foreground">
                  {(clipCounts[user.id] ?? 0).toLocaleString()}
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
