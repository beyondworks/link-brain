'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useCredits } from '@/lib/hooks/use-credits';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { exportClips } from '@/lib/utils/export';

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

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [initialized, setInitialized] = useState(false);

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

  // API 키 상태
  const [apiKeys, setApiKeys] = useState<ApiKeyView[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // 프로필 및 언어 초기화
  useEffect(() => {
    if (user && !initialized) {
      setDisplayName(user.display_name ?? '');
      setBio(user.bio ?? '');
      setLanguage(user.language ?? 'ko');
      setInitialized(true);
    }
  }, [user, initialized]);

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
        .update({ language: value })
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

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName, bio, language })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', authUser?.id] });
      toast.success('프로필이 업데이트되었습니다');
    },
    onError: () => toast.error('프로필 업데이트 실패'),
  });

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

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                이메일
              </Label>
              <Input
                id="email"
                value={user?.email ?? ''}
                disabled
                className="rounded-xl bg-muted/50 text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                표시 이름
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="rounded-xl focus-visible:ring-primary/30 transition-spring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium text-foreground">
                소개
              </Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="간단한 자기소개"
                className="rounded-xl focus-visible:ring-primary/30 transition-spring"
              />
            </div>

            <div className="pt-1">
              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending}
                className="bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring"
              >
                {updateProfile.isPending ? '저장 중...' : '프로필 저장'}
              </Button>
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-200 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20">
              <Palette size={15} className="text-violet-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">외관</h2>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">테마</Label>
            <Select value={theme ?? 'system'} onValueChange={setTheme}>
              <SelectTrigger className="w-52 rounded-xl focus:ring-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="system">시스템</SelectItem>
                <SelectItem value="light">라이트</SelectItem>
                <SelectItem value="dark">다크</SelectItem>
              </SelectContent>
            </Select>
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
