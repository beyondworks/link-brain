'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, User } from 'lucide-react';

function getInitials(name: string | null, email: string): string {
  if (name && name.trim().length > 0) {
    return name.trim().slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function ProfileEditor() {
  const { user, authUser, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(
    () => user?.display_name ?? authUser?.user_metadata?.display_name ?? authUser?.user_metadata?.full_name ?? ''
  );
  const [avatarUrl, setAvatarUrl] = useState(() => user?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const email = authUser?.email ?? user?.email ?? '';

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!authUser) throw new Error('인증되지 않은 사용자입니다');

      // Supabase Auth user_metadata 업데이트
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl },
      });
      if (authError) throw authError;

      // users 테이블이 존재하면 함께 업데이트
      if (user) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ display_name: displayName, avatar_url: avatarUrl } as never)
          .eq('id', user.id);
        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', authUser?.id] });
      toast.success('프로필이 저장되었습니다');
    },
    onError: () => toast.error('프로필 저장에 실패했습니다'),
  });

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !authUser) return;

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      toast.error('파일 크기는 2MB 이하여야 합니다');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다');
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${authUser.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // Storage 버킷 미설정 시 URL 입력 안내
        toast.error('스토리지 업로드 실패. 아바타 URL을 직접 입력해 주세요.');
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // 캐시 버스팅
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);
      toast.success('아바타가 업로드되었습니다. 저장 버튼을 눌러 적용하세요.');
    } catch {
      toast.error('아바타 업로드에 실패했습니다');
    } finally {
      setAvatarUploading(false);
    }
  }

  if (isLoading) return null;

  const initials = getInitials(displayName || null, email);

  return (
    <div className="space-y-5">
      {/* 아바타 */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={avatarUrl || undefined} alt={displayName || email} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="아바타 변경"
            disabled={avatarUploading}
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-spring hover:border-primary/50 hover:bg-muted disabled:opacity-50"
          >
            {avatarUploading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            ) : (
              <Camera size={11} className="text-muted-foreground" />
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => void handleAvatarFileChange(e)}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{displayName || email}</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WEBP · 최대 2MB</p>
        </div>
      </div>

      {/* 아바타 URL 직접 입력 */}
      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl" className="text-sm font-medium text-foreground">
          아바타 URL <span className="text-xs font-normal text-muted-foreground">(선택)</span>
        </Label>
        <Input
          id="avatarUrl"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="rounded-xl focus-visible:ring-primary/30 transition-spring"
        />
      </div>

      {/* 표시 이름 */}
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

      {/* 이메일 (읽기 전용) */}
      <div className="space-y-1.5">
        <Label htmlFor="profileEmail" className="text-sm font-medium text-foreground">
          이메일
        </Label>
        <Input
          id="profileEmail"
          value={email}
          disabled
          className="rounded-xl bg-muted/50 text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          이메일 변경은 보안상 별도 절차가 필요합니다.
        </p>
      </div>

      {/* 저장 버튼 */}
      <div className="pt-1">
        <Button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
          className="bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring"
        >
          <User size={14} className="mr-1.5" />
          {updateProfile.isPending ? '저장 중...' : '프로필 저장'}
        </Button>
      </div>
    </div>
  );
}
