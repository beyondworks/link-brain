import { supabaseAdmin } from '@/lib/supabase/admin';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface ClipRow {
  id: string;
  url: string;
  title: string | null;
  platform: string | null;
  processing_status: string;
  processing_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

async function getClipProcessingStats() {
  const db = supabaseAdmin as never as typeof supabaseAdmin;

  const [ready, pending, processing, failed] = await Promise.all([
    db.from('clips').select('id', { count: 'exact', head: true }).eq('processing_status', 'ready'),
    db.from('clips').select('id', { count: 'exact', head: true }).eq('processing_status', 'pending'),
    db.from('clips').select('id', { count: 'exact', head: true }).eq('processing_status', 'processing'),
    db.from('clips').select('id', { count: 'exact', head: true }).eq('processing_status', 'failed'),
  ]);

  return {
    ready: ready.count ?? 0,
    pending: pending.count ?? 0,
    processing: processing.count ?? 0,
    failed: failed.count ?? 0,
  };
}

async function getFailedClips() {
  const { data } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('clips')
    .select('id, url, title, platform, processing_status, processing_error, retry_count, created_at, updated_at')
    .eq('processing_status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(20);

  return (data ?? []) as ClipRow[];
}

async function getPendingClips() {
  const { data } = await (supabaseAdmin as never as typeof supabaseAdmin)
    .from('clips')
    .select('id, url, title, platform, processing_status, processing_error, retry_count, created_at, updated_at')
    .in('processing_status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(20);

  return (data ?? []) as ClipRow[];
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  ready: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '완료' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '대기' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: '처리 중' },
  failed: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: '실패' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${config.color} ${config.bg}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function ClipTable({ clips, title }: { clips: ClipRow[]; title: string }) {
  if (clips.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/50 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">URL / 제목</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">플랫폼</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">상태</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">재시도</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">에러</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">시간</th>
            </tr>
          </thead>
          <tbody>
            {clips.map((clip) => (
              <tr key={clip.id} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                <td className="max-w-[300px] px-4 py-2.5">
                  <p className="truncate font-medium text-foreground">
                    {clip.title ?? clip.url}
                  </p>
                  {clip.title && (
                    <p className="truncate text-[11px] text-muted-foreground/60">{clip.url}</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {clip.platform ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {clip.platform}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <StatusBadge status={clip.processing_status} />
                </td>
                <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                  {clip.retry_count}/3
                </td>
                <td className="max-w-[200px] px-4 py-2.5">
                  {clip.processing_error ? (
                    <p className="truncate text-xs text-red-500">{clip.processing_error}</p>
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60" suppressHydrationWarning>
                  {new Date(clip.updated_at).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminClipsPage() {
  const [stats, failedClips, pendingClips] = await Promise.all([
    getClipProcessingStats(),
    getFailedClips(),
    getPendingClips(),
  ]);

  const total = stats.ready + stats.pending + stats.processing + stats.failed;
  const successRate = total > 0 ? Math.round((stats.ready / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">클립 처리 모니터</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        클립 처리 파이프라인 상태를 모니터링합니다.
      </p>

      {/* Status overview */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: '전체', value: total, color: 'text-foreground' },
          { label: '완료', value: stats.ready, color: 'text-emerald-500' },
          { label: '대기', value: stats.pending, color: 'text-amber-500' },
          { label: '처리 중', value: stats.processing, color: 'text-blue-500' },
          { label: '실패', value: stats.failed, color: 'text-red-500' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <p className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Success rate bar */}
      <div className="mt-4 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">처리 성공률</span>
          <span className="text-sm font-bold text-emerald-500">{successRate}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Tables */}
      <div className="mt-8 space-y-6">
        <ClipTable clips={pendingClips} title={`대기/처리 중 클립 (${stats.pending + stats.processing})`} />
        <ClipTable clips={failedClips} title={`실패 클립 (${stats.failed})`} />
      </div>
    </div>
  );
}
