'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
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
import { toast } from 'sonner';
import { User, Palette, Globe, Settings, Bell, Database, Key, Trash2, Download, Shield } from 'lucide-react';
import type { ClipData } from '@/types/database';

export function SettingsClient() {
  const { user, isLoading } = useCurrentUser();
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

  // 내보내기 로딩 상태
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setDisplayName(user.display_name ?? '');
      setBio(user.bio ?? '');
      setInitialized(true);
    }
  }, [user, initialized]);

  function handleNotifChange(
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    value: boolean,
  ) {
    setter(value);
    toast.success('알림 설정이 변경되었습니다');
  }

  function handleLanguageChange(value: string) {
    setLanguage(value);
    toast.success('언어가 변경되었습니다');
  }

  async function fetchAllClips(): Promise<ClipData[]> {
    if (!user) return [];
    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ClipData[];
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportJson() {
    setExportingJson(true);
    try {
      const clips = await fetchAllClips();
      const json = JSON.stringify(clips, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      downloadBlob(blob, 'linkbrain-clips.json');
      toast.success(`클립 ${clips.length}개를 JSON으로 내보냈습니다`);
    } catch {
      toast.error('내보내기에 실패했습니다');
    } finally {
      setExportingJson(false);
    }
  }

  async function handleExportMarkdown() {
    setExportingMd(true);
    try {
      const clips = await fetchAllClips();
      const md = clips
        .map((clip) => {
          const title = clip.title ?? '제목 없음';
          const summary = clip.summary ?? '';
          const url = clip.url ?? '';
          return `# ${title}\n\n${summary}\n\n${url}`;
        })
        .join('\n\n---\n\n');
      const blob = new Blob([md], { type: 'text/markdown' });
      downloadBlob(blob, 'linkbrain-clips.md');
      toast.success(`클립 ${clips.length}개를 마크다운으로 내보냈습니다`);
    } catch {
      toast.error('내보내기에 실패했습니다');
    } finally {
      setExportingMd(false);
    }
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName, bio })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
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
            <Select value={language} onValueChange={handleLanguageChange}>
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
                onCheckedChange={(v) => handleNotifChange(setEmailNotif, v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI 분석 완료</p>
                <p className="text-xs text-muted-foreground">클립 AI 분석이 완료되면 알림</p>
              </div>
              <Switch
                checked={aiNotif}
                onCheckedChange={(v) => handleNotifChange(setAiNotif, v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">팔로워 활동</p>
                <p className="text-xs text-muted-foreground">새 팔로워 및 좋아요 알림</p>
              </div>
              <Switch
                checked={followerNotif}
                onCheckedChange={(v) => handleNotifChange(setFollowerNotif, v)}
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
            <h2 className="text-base font-semibold text-foreground">데이터</h2>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={handleExportJson}
              disabled={exportingJson}
            >
              <Download size={15} />
              {exportingJson ? '내보내는 중...' : '클립 데이터 내보내기 (JSON)'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={handleExportMarkdown}
              disabled={exportingMd}
            >
              <Download size={15} />
              {exportingMd ? '내보내는 중...' : '마크다운으로 내보내기'}
            </Button>
          </div>
        </section>

        {/* API Key section */}
        <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-600 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 ring-1 ring-cyan-500/20">
              <Key size={15} className="text-cyan-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">API 키</h2>
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            외부 앱이나 자동화에서 LinkBrain API를 사용할 수 있습니다.
          </p>
          <Button
            variant="outline"
            className="gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
            onClick={() => toast.info('API 키 생성은 Pro 플랜에서 사용 가능합니다.')}
          >
            <Shield size={15} />
            API 키 생성
          </Button>
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
    </div>
  );
}
