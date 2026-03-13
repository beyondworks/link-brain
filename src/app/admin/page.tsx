import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

async function getStats() {
  const db = supabaseAdmin as never;

  const [
    usersResult,
    todayUsersResult,
    clipsResult,
    todayClipsResult,
    pendingResult,
    failedResult,
    platformResult,
  ] = await Promise.all([
    // Total users
    (db as typeof supabaseAdmin).from('users').select('id', { count: 'exact', head: true }),
    // Today's signups
    (db as typeof supabaseAdmin)
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    // Total clips
    (db as typeof supabaseAdmin).from('clips').select('id', { count: 'exact', head: true }),
    // Today's clips
    (db as typeof supabaseAdmin)
      .from('clips')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    // Pending/processing clips
    (db as typeof supabaseAdmin)
      .from('clips')
      .select('id', { count: 'exact', head: true })
      .in('processing_status', ['pending', 'processing']),
    // Failed clips
    (db as typeof supabaseAdmin)
      .from('clips')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'failed'),
    // Platform distribution (top 10)
    (db as typeof supabaseAdmin)
      .from('clips')
      .select('platform')
      .not('platform', 'is', null)
      .limit(1000),
  ]);

  // Aggregate platform counts
  const platformCounts: Record<string, number> = {};
  if (platformResult.data) {
    for (const row of platformResult.data as { platform: string }[]) {
      platformCounts[row.platform] = (platformCounts[row.platform] ?? 0) + 1;
    }
  }
  const platforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    totalUsers: usersResult.count ?? 0,
    todayUsers: todayUsersResult.count ?? 0,
    totalClips: clipsResult.count ?? 0,
    todayClips: todayClipsResult.count ?? 0,
    pendingClips: pendingResult.count ?? 0,
    failedClips: failedResult.count ?? 0,
    platforms,
  };
}

async function getRecentFailedClips() {
  const { data } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('clips')
    .select('id, url, platform, processing_error, updated_at')
    .eq('processing_status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(5);

  return (data ?? []) as {
    id: string;
    url: string;
    platform: string | null;
    processing_error: string | null;
    updated_at: string;
  }[];
}

async function getRecentUsers() {
  const { data } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('users')
    .select('id, email, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (data ?? []) as {
    id: string;
    email: string;
    display_name: string | null;
    created_at: string;
  }[];
}

export default async function AdminDashboard() {
  const [stats, failedClips, recentUsers] = await Promise.all([
    getStats(),
    getRecentFailedClips(),
    getRecentUsers(),
  ]);

  const statCards = [
    {
      label: '총 사용자',
      value: stats.totalUsers,
      sub: `오늘 +${stats.todayUsers}`,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: '총 클립',
      value: stats.totalClips,
      sub: `오늘 +${stats.todayClips}`,
      icon: FileText,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: '처리 대기',
      value: stats.pendingClips,
      sub: 'pending / processing',
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: '처리 실패',
      value: stats.failedClips,
      sub: '재처리 필요',
      icon: AlertTriangle,
      color: stats.failedClips > 0 ? 'text-red-500' : 'text-muted-foreground',
      bg: stats.failedClips > 0 ? 'bg-red-500/10' : 'bg-muted/50',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">관리자 대시보드</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Linkbrain 서비스 현황을 한눈에 확인합니다.
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <Icon size={18} className={card.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Platform distribution */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp size={16} className="text-emerald-500" />
            플랫폼별 클립
          </h2>
          <div className="mt-4 space-y-2">
            {stats.platforms.length === 0 && (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            )}
            {stats.platforms.map(([platform, count]) => {
              const maxCount = stats.platforms[0]?.[1] ?? 1;
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={platform} className="flex items-center gap-3">
                  <span className="w-20 truncate text-xs font-medium text-foreground">
                    {platform}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent signups */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Users size={16} className="text-blue-500" />
            최근 가입자
          </h2>
          <div className="mt-4 space-y-3">
            {recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            )}
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {u.display_name ?? u.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                <span
                  className="text-[11px] text-muted-foreground/60"
                  suppressHydrationWarning
                >
                  {new Date(u.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent failed clips */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle size={16} className="text-red-500" />
            최근 처리 실패 클립
          </h2>
          <div className="mt-4">
            {failedClips.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                처리 실패한 클립이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {failedClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-start justify-between gap-4 rounded-xl bg-red-500/5 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {clip.url}
                      </p>
                      <p className="mt-0.5 text-xs text-red-500">
                        {clip.processing_error ?? '알 수 없는 오류'}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      {clip.platform && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {clip.platform}
                        </span>
                      )}
                      <span
                        className="text-[10px] text-muted-foreground/60"
                        suppressHydrationWarning
                      >
                        {new Date(clip.updated_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit overview */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CreditCard size={16} className="text-violet-500" />
          크레딧 시스템
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          크레딧 상세 현황은 사용자 관리 페이지에서 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
