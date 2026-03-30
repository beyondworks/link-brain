'use client';

import { useState, useMemo } from 'react';
import { Shield, ShieldCheck, Search, ArrowUpDown } from 'lucide-react';

export interface UserRow {
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

type SortField = 'name' | 'created_at' | 'clip_count' | 'plan' | 'role';
type SortDir = 'asc' | 'desc';

const PLAN_STYLES: Record<string, string> = {
  pro: 'bg-violet-500/10 text-violet-500',
  master: 'bg-amber-500/10 text-amber-500',
  free: 'bg-muted text-muted-foreground',
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'created_at', label: '가입일순' },
  { field: 'name', label: '이름순' },
  { field: 'clip_count', label: '클립수순' },
  { field: 'plan', label: '플랜순' },
  { field: 'role', label: '역할순' },
];

export function AdminUsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.display_name?.toLowerCase().includes(q) ?? false)
      );
    }

    if (planFilter !== 'all') {
      result = result.filter((u) => u.plan === planFilter);
    }

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'clip_count':
          cmp = a.clip_count - b.clip_count;
          break;
        case 'plan': {
          const planOrder: Record<string, number> = { free: 0, pro: 1, master: 2 };
          cmp = (planOrder[a.plan] ?? 0) - (planOrder[b.plan] ?? 0);
          break;
        }
        case 'role':
          cmp = a.role.localeCompare(b.role);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [users, search, planFilter, roleFilter, sortField, sortDir]);

  const plans = [...new Set(users.map((u) => u.plan))].sort();

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          총 {users.length}명 중 {filtered.length}명 표시
        </p>
      </div>

      {/* Filters — horizontal scroll on mobile */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 rounded-lg border border-border/60 bg-background py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="shrink-0 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">전체 플랜</option>
          {plans.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="shrink-0 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">전체 역할</option>
          <option value="admin">관리자</option>
          <option value="user">사용자</option>
        </select>

        <select
          value={sortField}
          onChange={(e) => {
            const f = e.target.value as SortField;
            setSortField(f);
            setSortDir(f === 'name' ? 'asc' : 'desc');
          }}
          className="shrink-0 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.field} value={o.field}>{o.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <ArrowUpDown size={12} />
          {sortDir === 'asc' ? '오름차순' : '내림차순'}
        </button>
      </div>

      {/* Table */}
      <div className="mt-2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSortField('name')}
                >
                  사용자 {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  이메일
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSortField('role')}
                >
                  역할 {sortField === 'role' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSortField('plan')}
                >
                  플랜 {sortField === 'plan' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSortField('clip_count')}
                >
                  클립 {sortField === 'clip_count' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSortField('created_at')}
                >
                  가입일 {sortField === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    조건에 맞는 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                    <td className="max-w-[120px] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {(user.display_name ?? user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate text-sm font-medium text-foreground">
                          {user.display_name ?? user.email.split('@')[0]}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[160px] truncate whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                          <ShieldCheck size={11} />관리자
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Shield size={11} />사용자
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_STYLES[user.plan] ?? PLAN_STYLES.free}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center tabular-nums text-sm text-foreground">
                      {user.clip_count.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-muted-foreground" suppressHydrationWarning>
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
