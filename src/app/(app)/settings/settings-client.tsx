'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';

export function SettingsClient() {
  const { user, isLoading } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Sync form state with user data once loaded
  if (user && !initialized) {
    setDisplayName(user.display_name ?? '');
    setBio(user.bio ?? '');
    setInitialized(true);
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
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-2xl font-bold">설정</h1>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-8 text-2xl font-bold">설정</h1>

      {/* Profile section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">프로필</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              disabled
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="displayName">표시 이름</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1"
              placeholder="이름을 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="bio">소개</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1"
              placeholder="간단한 자기소개"
            />
          </div>
          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? '저장 중...' : '프로필 저장'}
          </Button>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">외관</h2>
        <div>
          <Label>테마</Label>
          <Select value={theme ?? 'system'} onValueChange={setTheme}>
            <SelectTrigger className="mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">시스템</SelectItem>
              <SelectItem value="light">라이트</SelectItem>
              <SelectItem value="dark">다크</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Language */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">언어</h2>
        <div>
          <Label>인터페이스 언어</Label>
          <Select defaultValue="ko">
            <SelectTrigger className="mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}
