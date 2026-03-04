'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useCredits } from '@/lib/hooks/use-credits';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  User,
  Palette,
  Globe,
  Settings,
  Bell,
  Database,
  Key,
  Trash2,
  Download,
  FileSpreadsheet,
  Copy,
  Plus,
  X,
  Gauge,
  Upload,
  Tags,
  Link2,
  LinkIcon,
  ChevronDown,
  ChevronUp,
  GitMerge,
  Check,
} from 'lucide-react';
import { exportClips } from '@/lib/utils/export';
import { importClips } from '@/lib/utils/import';
import { ProfileEditor } from '@/components/settings/profile-editor';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';
import { TagManager } from '@/components/settings/tag-manager';
import { WebhookManager } from '@/components/settings/webhook-manager';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { useDuplicates } from '@/lib/hooks/use-duplicates';
import type { DuplicateGroup } from '@/lib/hooks/use-duplicates';
import type { ClipData } from '@/types/database';

const NOTIF_STORAGE_KEY = 'linkbrain-notifications';

interface NotifSettings {
  emailNotif: boolean;
  aiNotif: boolean;
  followerNotif: boolean;
}

function loadNotifSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as NotifSettings;
  } catch {
    // localStorage 접근 불가 시 기본값 사용
  }
  return { emailNotif: true, aiNotif: true, followerNotif: false };
}

function saveNotifSettings(settings: NotifSettings) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

// API 키 뷰 타입 (key_hash 제외)
interface ApiKeyView {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  timestamp: string;
}

export function SettingsClient() {
  const { user, authUser, isLoading } = useCurrentUser();
  const { data: credits, isLoading: creditsLoading } = useCredits();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // 알림 상태
  const [emailNotif, setEmailNotif] = useState(true);
  const [aiNotif, setAiNotif] = useState(true);
  const [followerNotif, setFollowerNotif] = useState(false);

  // 언어 상태
  const [language, setLanguage] = useState('ko');
  const [languagePending, setLanguagePending] = useState(false);

  // 내보내기 로딩 상태
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // 가져오기 상태
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // API 키 상태
  const [apiKeys, setApiKeys] = useState<ApiKeyView[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // 중복 클립 상태
  const { groups: duplicateGroups, isLoading: duplicatesLoading, totalDuplicates, refetch: refetchDuplicates } = useDuplicates();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [archivingGroup, setArchivingGroup] = useState<string | null>(null);

  // 언어 초기화
  useEffect(() => {
    if (user) {
      setLanguage(user.language ?? 'ko');
    }
  }, [user]);

  // 알림 설정 localStorage 초기화
  useEffect(() => {
    const saved = loadNotifSettings();
    setEmailNotif(saved.emailNotif);
    setAiNotif(saved.aiNotif);
    setFollowerNotif(saved.followerNotif);
  }, []);

  // API 키 목록 로드
  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch('/api/v1/keys');
      if (!res.ok) throw new Error('Failed to load API keys');
      const json = (await res.json()) as { success: boolean; data: ApiKeyView[] };
      if (json.success) setApiKeys(json.data);
    } catch {
      toast.error('API 키 목록을 불러오지 못했습니다');
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  function handleNotifChange(
    key: keyof NotifSettings,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    value: boolean,
  ) {
    setter(value);
    const current = loadNotifSettings();
    saveNotifSettings({ ...current, [key]: value });
    toast.success('알림 설정이 변경되었습니다');
  }

  async function handleLanguageChange(value: string) {
    setLanguage(value);
    if (!user) return;
    setLanguagePending(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ language: value } as never)
        .eq('id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user', authUser?.id] });
      toast.success('언어가 변경되었습니다');
    } catch {
      toast.error('언어 변경에 실패했습니다');
    } finally {
      setLanguagePending(false);
    }
  }

  async function handleExportJson() {
    setExportingJson(true);
    try {
      await exportClips('json');
      toast.success('클립 데이터가 다운로드되었습니다');
    } catch {
      toast.error('내보내기에 실패했습니다');
    } finally {
      setExportingJson(false);
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      await exportClips('csv');
      toast.success('클립 데이터가 다운로드되었습니다');
    } catch {
      toast.error('내보내기에 실패했습니다');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again
    e.target.value = '';

    setImporting(true);
    try {
      const result = await importClips(file);
      const parts: string[] = [];
      if (result.imported > 0) parts.push(`${result.imported}개 가져옴`);
      if (result.skipped > 0) parts.push(`${result.skipped}개 건너뜀`);
      if (result.errors > 0) parts.push(`${result.errors}개 오류`);
      toast.success(parts.length > 0 ? parts.join(', ') : '가져올 클립이 없습니다');
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    } catch {
      toast.error('가져오기에 실패했습니다');
    } finally {
      setImporting(false);
    }
  }

  async function handleCreateKey() {
    const name = newKeyName.trim();
    if (!name) {
      toast.error('키 이름을 입력해 주세요');
      return;
    }
    setCreatingKey(true);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { key: string; id: string; keyPrefix: string };
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error?.message ?? 'API 키 생성에 실패했습니다');
        return;
      }
      setRevealedKey(json.data.key);
      setRevealDialogOpen(true);
      setNewKeyName('');
      await loadApiKeys();
    } catch {
      toast.error('API 키 생성에 실패했습니다');
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    setDeletingKeyId(keyId);
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('API 키 삭제에 실패했습니다');
        return;
      }
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success('API 키가 삭제되었습니다');
    } catch {
      toast.error('API 키 삭제에 실패했습니다');
    } finally {
      setDeletingKeyId(null);
    }
  }

  function handleCopyKey() {
    if (!revealedKey) return;
    void navigator.clipboard.writeText(revealedKey);
    toast.success('클립보드에 복사되었습니다');
  }

  function formatDate(iso: string | null) {
    if (!iso) return '사용 없음';
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function toggleGroupExpanded(normalizedUrl: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedUrl)) {
        next.delete(normalizedUrl);
      } else {
        next.add(normalizedUrl);
      }
      return next;
    });
  }

  async function handleKeepClip(keepClip: ClipData, group: DuplicateGroup) {
    setArchivingGroup(group.normalizedUrl);
    const toArchive = group.clips.filter((c) => c.id !== keepClip.id);
    try {
      await Promise.all(
        toArchive.map((clip) =>
          supabase
            .from('clips')
            .update({ is_archived: true } as never)
            .eq('id', clip.id)
        )
      );
      toast.success(`${toArchive.length}개 클립이 아카이브되었습니다`);
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      refetchDuplicates();
    } catch {
      toast.error('아카이브 처리에 실패했습니다');
    } finally {
      setArchivingGroup(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Skeleton className="mb-2 h-8 w-24 shimmer" />
        <Skeleton className="mb-8 h-4 w-48 shimmer" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl shimmer" />
          <Skeleton className="h-28 w-full rounded-2xl shimmer" />
          <Skeleton className="h-28 w-full rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 md:px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-16 -top-16 h-48 w-48 opacity-20" />
      </div>

      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumbs items={[{ label: '설정', href: undefined }]} />
      </div>

      {/* Page header */}
      <div className="relative mb-8 animate-blur-in">
        <div className="flex items-center gap-3">
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 ring-1 ring-primary/20">
            <Settings size={20} className="animate-breathe text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">설정</h1>
            <p className="text-sm text-muted-foreground">계정 및 앱 환경설정을 관리합니다.</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-4">

        {/* Profile section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-100 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <User size={15} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">프로필</h2>
          </div>

          <ProfileEditor />
        </section>

        {/* Connected Accounts section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-150 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 ring-1 ring-teal-500/20">
              <LinkIcon size={15} className="text-teal-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">연결된 계정</h2>
          </div>

          <ConnectedAccounts />
        </section>

        {/* Appearance section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-200 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20">
              <Palette size={15} className="text-violet-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">외관</h2>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">테마</Label>
            <div className="flex gap-3">
              {(
                [
                  { value: 'light', label: '라이트' },
                  { value: 'dark', label: '다크' },
                  { value: 'system', label: '시스템' },
                ] as const
              ).map(({ value, label }) => {
                const active = (theme ?? 'system') === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      document.documentElement.classList.add('transitioning');
                      window.setTimeout(() => document.documentElement.classList.remove('transitioning'), 320);
                      setTheme(value);
                    }}
                    className={[
                      'group flex flex-col items-center gap-2 rounded-xl border p-3 transition-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border hover:border-border-hover hover:bg-accent/40',
                    ].join(' ')}
                    aria-pressed={active}
                    aria-label={`${label} 테마`}
                  >
                    {/* Mini preview */}
                    <span
                      className={[
                        'flex h-12 w-20 overflow-hidden rounded-lg border',
                        value === 'light'
                          ? 'border-gray-200 bg-white'
                          : value === 'dark'
                            ? 'border-zinc-700 bg-zinc-900'
                            : 'border-border bg-gradient-to-br from-white to-zinc-900',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {/* Sidebar strip */}
                      <span
                        className={[
                          'flex h-full w-4 flex-col gap-1 p-1',
                          value === 'light'
                            ? 'bg-gray-100'
                            : value === 'dark'
                              ? 'bg-zinc-800'
                              : 'bg-gradient-to-b from-gray-100 to-zinc-800',
                        ].join(' ')}
                      >
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className={[
                              'h-1 rounded-full',
                              i === 0 ? 'w-full' : 'w-3/4',
                              value === 'light'
                                ? 'bg-gray-300'
                                : value === 'dark'
                                  ? 'bg-zinc-600'
                                  : 'bg-gray-400',
                            ].join(' ')}
                          />
                        ))}
                      </span>
                      {/* Content area */}
                      <span className="flex flex-1 flex-col gap-1 p-1 pt-1.5">
                        <span
                          className={[
                            'h-1.5 w-full rounded',
                            value === 'light'
                              ? 'bg-gray-200'
                              : value === 'dark'
                                ? 'bg-zinc-700'
                                : 'bg-gray-300',
                          ].join(' ')}
                        />
                        <span
                          className={[
                            'h-1 w-3/4 rounded',
                            value === 'light'
                              ? 'bg-gray-100'
                              : value === 'dark'
                                ? 'bg-zinc-800'
                                : 'bg-gray-200',
                          ].join(' ')}
                        />
                        <span
                          className="mt-0.5 h-3 w-full rounded"
                          style={{ background: '#21DBA4', opacity: 0.7 }}
                        />
                      </span>
                    </span>
                    <span
                      className={[
                        'flex items-center gap-1.5 text-xs font-medium',
                        active ? 'text-primary' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {active && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] text-white font-bold">
                          ✓
                        </span>
                      )}
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Language section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-300 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
              <Globe size={15} className="text-blue-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">언어</h2>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">인터페이스 언어</Label>
            <Select value={language} onValueChange={handleLanguageChange} disabled={languagePending}>
              <SelectTrigger className="w-52 rounded-xl focus:ring-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Notifications section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-400 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/20">
              <Bell size={15} className="text-amber-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">알림</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">이메일 알림</p>
                <p className="text-xs text-muted-foreground">주간 인사이트 요약 이메일</p>
              </div>
              <Switch
                checked={emailNotif}
                onCheckedChange={(v) => handleNotifChange('emailNotif', setEmailNotif, v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI 분석 완료</p>
                <p className="text-xs text-muted-foreground">클립 AI 분석이 완료되면 알림</p>
              </div>
              <Switch
                checked={aiNotif}
                onCheckedChange={(v) => handleNotifChange('aiNotif', setAiNotif, v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">팔로워 활동</p>
                <p className="text-xs text-muted-foreground">새 팔로워 및 좋아요 알림</p>
              </div>
              <Switch
                checked={followerNotif}
                onCheckedChange={(v) => handleNotifChange('followerNotif', setFollowerNotif, v)}
              />
            </div>
          </div>
        </section>

        {/* Data & Export section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-500 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 ring-1 ring-emerald-500/20">
              <Database size={15} className="text-emerald-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">데이터 관리</h2>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={() => void handleExportJson()}
              disabled={exportingJson}
            >
              <Download size={15} />
              {exportingJson ? '내보내는 중...' : '클립 내보내기 (JSON)'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={() => void handleExportCsv()}
              disabled={exportingCsv}
            >
              <FileSpreadsheet size={15} />
              {exportingCsv ? '내보내는 중...' : '클립 내보내기 (CSV)'}
            </Button>

            {/* 구분선 */}
            <div className="border-t border-border/50 pt-1" />

            {/* 가져오기 */}
            <input
              ref={importFileRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => void handleImportFile(e)}
            />
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
            >
              <Upload size={15} />
              {importing ? '가져오는 중...' : '클립 가져오기 (JSON / CSV)'}
            </Button>
            <p className="text-xs text-muted-foreground">
              JSON 배열 또는 CSV 파일을 업로드하면 중복 URL은 자동으로 건너뜁니다.
            </p>
          </div>
        </section>

        {/* Usage section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-550 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <Gauge size={15} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">사용량</h2>
          </div>

          {creditsLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 shimmer" />
                <Skeleton className="h-2 w-full rounded-full shimmer" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 shimmer" />
                <Skeleton className="h-2 w-full rounded-full shimmer" />
              </div>
            </div>
          ) : credits ? (
            <div className="space-y-5">
              {/* 크레딧 사용량 header */}
              <p className="text-xs text-muted-foreground">
                크레딧 사용량 — 이번 달 AI 기능 사용 횟수입니다.
              </p>

              {/* 크레딧 (analyze + AI generate 통합) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">크레딧 사용량</span>
                  <span className="text-xs text-muted-foreground">
                    {credits.creditsLimit === -1
                      ? `${credits.creditsUsed} / 무제한`
                      : `${credits.creditsUsed} / ${credits.creditsLimit}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width:
                        credits.creditsLimit === -1
                          ? '0%'
                          : `${Math.min(100, (credits.creditsUsed / credits.creditsLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 다음 초기화 */}
              <p className="text-xs text-muted-foreground">
                다음 초기화:{' '}
                {new Date(credits.resetAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              {/* 업그레이드 CTA — free 플랜에서만 표시 */}
              {credits.creditsLimit !== -1 && (
                <div className="pt-1">
                  <Button
                    asChild
                    variant="outline"
                    className="gap-2 rounded-xl border-primary/40 text-primary transition-spring hover:bg-primary/10 hover:border-primary/60"
                  >
                    <a href="/pricing">Pro로 업그레이드하여 무제한 사용</a>
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Tag management section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-575 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 ring-1 ring-rose-500/20">
              <Tags size={15} className="text-rose-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">태그 관리</h2>
          </div>

          <TagManager />
        </section>

        {/* API Key section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-600 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 ring-1 ring-cyan-500/20">
              <Key size={15} className="text-cyan-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">API 키</h2>
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            외부 앱이나 자동화에서 Linkbrain API를 사용할 수 있습니다. Free 플랜 최대 2개, Pro 플랜 최대 5개.
          </p>

          {/* 키 목록 */}
          {apiKeysLoading ? (
            <div className="mb-4 space-y-2">
              <Skeleton className="h-10 w-full rounded-xl shimmer" />
              <Skeleton className="h-10 w-full rounded-xl shimmer" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="mb-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                API 키가 없습니다. 외부 앱 연동을 위해 키를 생성하세요.
              </p>
            </div>
          ) : (
            <div className="mb-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">이름</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">프리픽스</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">마지막 사용</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((apiKey) => (
                    <tr
                      key={apiKey.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">{apiKey.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{apiKey.key_prefix}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(apiKey.last_used_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-spring"
                          disabled={deletingKeyId === apiKey.id}
                          onClick={() => void handleDeleteKey(apiKey.id)}
                          aria-label="API 키 삭제"
                        >
                          <X size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 키 생성 폼 */}
          <div className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="키 이름 (예: iPhone Shortcuts)"
              className="rounded-xl focus-visible:ring-primary/30 transition-spring"
              maxLength={64}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateKey();
              }}
            />
            <Button
              onClick={() => void handleCreateKey()}
              disabled={creatingKey || !newKeyName.trim()}
              className="shrink-0 gap-1.5 rounded-xl bg-gradient-brand glow-brand shadow-none transition-spring hover-scale font-semibold"
            >
              <Plus size={14} />
              {creatingKey ? '생성 중...' : '생성'}
            </Button>
          </div>
        </section>

        {/* Duplicate clips section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-625 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 ring-1 ring-orange-500/20">
                <GitMerge size={15} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">중복 클립 관리</h2>
                {!duplicatesLoading && totalDuplicates > 0 && (
                  <p className="text-xs text-muted-foreground">
                    중복 클립 {totalDuplicates}개 발견
                  </p>
                )}
              </div>
            </div>
          </div>

          {duplicatesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl shimmer" />
              <Skeleton className="h-12 w-full rounded-xl shimmer" />
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <Check size={20} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">중복 클립이 없습니다</p>
              <p className="mt-1 text-xs text-muted-foreground">
                저장된 모든 클립의 URL이 고유합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {duplicateGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.normalizedUrl);
                const isArchiving = archivingGroup === group.normalizedUrl;
                return (
                  <div
                    key={group.normalizedUrl}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    {/* 그룹 헤더 */}
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      onClick={() => toggleGroupExpanded(group.normalizedUrl)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-mono text-muted-foreground">
                          {group.normalizedUrl}
                        </p>
                        <p className="mt-0.5 text-xs text-orange-500">
                          {group.clips.length}개 중복
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {/* 그룹 내 클립 목록 */}
                    {isExpanded && (
                      <div className="border-t border-border/50 bg-muted/10">
                        {group.clips.map((clip) => (
                          <div
                            key={clip.id}
                            className="flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {clip.title ?? clip.url}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(clip.created_at)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isArchiving}
                              className="shrink-0 gap-1.5 rounded-lg border-primary/40 text-xs text-primary transition-spring hover:bg-primary/10 hover:border-primary/60"
                              onClick={() => void handleKeepClip(clip, group)}
                            >
                              <Check size={12} />
                              이 클립 유지
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Webhook section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-650 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 ring-1 ring-indigo-500/20">
              <Link2 size={15} className="text-indigo-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">웹훅 관리</h2>
          </div>

          <WebhookManager />
        </section>

        {/* Danger zone */}
        <section className="animate-fade-in-up animation-delay-700 rounded-2xl border border-destructive/30 bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 ring-1 ring-destructive/20">
              <Trash2 size={15} className="text-destructive" />
            </div>
            <h2 className="text-base font-semibold text-foreground">위험 구역</h2>
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            계정을 삭제하면 모든 클립, 컬렉션, 설정이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-destructive/40 text-destructive transition-spring hover:bg-destructive/10 hover:border-destructive/60"
            onClick={() => toast.error('계정 삭제는 고객센터에 문의해 주세요.')}
          >
            <Trash2 size={15} />
            계정 삭제
          </Button>
        </section>

      </div>

      {/* Raw key 공개 Dialog */}
      <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Key size={16} className="text-cyan-500" />
              API 키가 생성되었습니다
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              이 키는 다시 볼 수 없습니다. 지금 복사해 안전한 곳에 보관하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
            <p className="break-all font-mono text-xs text-foreground select-all">{revealedKey}</p>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1 gap-2 rounded-xl bg-gradient-brand glow-brand shadow-none transition-spring hover-scale font-semibold"
              onClick={handleCopyKey}
            >
              <Copy size={14} />
              복사
            </Button>
            <Button
              variant="outline"
              className="rounded-xl transition-spring"
              onClick={() => {
                setRevealDialogOpen(false);
                setRevealedKey(null);
              }}
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
