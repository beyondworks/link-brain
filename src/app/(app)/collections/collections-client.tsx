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
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">컬렉션</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">컬렉션</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              새 컬렉션
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 컬렉션 만들기</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="컬렉션 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="설명 (선택)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button
                className="w-full"
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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">컬렉션이 없습니다</p>
          <p className="mt-1 text-sm">클립을 주제별로 정리해보세요</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: col.color ?? '#6366f1' }}
                />
                {col.is_public ? (
                  <Globe size={14} className="text-muted-foreground" />
                ) : (
                  <Lock size={14} className="text-muted-foreground" />
                )}
              </div>
              <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary">
                {col.name}
              </h3>
              {col.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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
