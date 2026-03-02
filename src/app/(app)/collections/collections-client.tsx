'use client';

import { useState } from 'react';
import { useCollections } from '@/lib/hooks/use-collections';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, FolderOpen, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function CollectionsClient() {
  const { data: collections, isLoading } = useCollections();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, name, description: description || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setOpen(false);
      setName('');
      setDescription('');
      toast.success('컬렉션이 생성되었습니다');
    },
    onError: () => toast.error('컬렉션 생성 실패'),
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-32 rounded-xl shimmer" />
          <Skeleton className="h-4 w-56 rounded-lg shimmer" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const staggerDelay = (i: number) => {
    const delays = ['', 'animation-delay-75', 'animation-delay-150', 'animation-delay-200', 'animation-delay-300', 'animation-delay-400'];
    return delays[Math.min(i, delays.length - 1)];
  };

  return (
    <div className="relative p-6 lg:p-8">
      {/* Decorative glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-20 -top-20 h-56 w-56 opacity-25" />
      </div>

      <div className="relative mb-8 flex items-start justify-between animate-blur-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">컬렉션</h1>
          <p className="mt-1 text-sm text-muted-foreground">클립을 주제별로 묶어 정리하세요</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-brand glow-brand-sm hover-scale rounded-xl font-semibold shadow-none transition-spring"
            >
              <Plus size={16} className="mr-1.5" />
              새 컬렉션
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">새 컬렉션 만들기</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="컬렉션 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl focus-visible:ring-primary/30"
              />
              <Input
                placeholder="설명 (선택)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl focus-visible:ring-primary/30"
              />
              <Button
                className="w-full bg-gradient-brand glow-brand rounded-xl font-semibold shadow-none transition-spring"
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '생성 중...' : '만들기'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!collections || collections.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-5 ring-1 ring-primary/15">
            <FolderOpen size={32} className="animate-float text-primary" />
          </div>
          <p className="relative text-base font-semibold text-foreground">컬렉션이 없습니다</p>
          <p className="relative mt-1.5 text-sm text-muted-foreground">클립을 주제별로 정리해보세요</p>
          <Button
            size="sm"
            className="relative mt-5 bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring"
            onClick={() => setOpen(true)}
          >
            <Plus size={15} className="mr-1.5" />
            첫 컬렉션 만들기
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col, i) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className={`group card-glow animate-fade-in-up ${staggerDelay(i)} relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-spring`}
            >
              {/* Color accent line */}
              <div
                className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-70"
                style={{
                  background: `linear-gradient(90deg, ${col.color ?? '#21DBA4'}, transparent)`,
                }}
              />
              <div className="flex items-start justify-between mb-3">
                {/* Color indicator with glow */}
                <div className="relative mt-0.5 flex-shrink-0">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: col.color ?? '#21DBA4' }}
                  />
                  <div
                    className="absolute inset-0 rounded-full blur-sm opacity-60"
                    style={{ backgroundColor: col.color ?? '#21DBA4' }}
                  />
                </div>
                {col.is_public ? (
                  <Globe size={13} className="text-muted-foreground" />
                ) : (
                  <Lock size={13} className="text-muted-foreground" />
                )}
              </div>
              <h3 className="font-semibold text-foreground transition-spring group-hover:text-primary">
                {col.name}
              </h3>
              {col.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                  {col.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
