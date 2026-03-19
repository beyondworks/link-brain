'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { toast } from 'sonner';
import type { Category } from '@/types/database';

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user?.id) throw new Error('인증이 필요합니다');

      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = existing ? existing.sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name, color, sort_order: nextOrder } as never)
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onMutate: async ({ name, color }) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: ['categories', user.id] });

      const previous = queryClient.getQueryData<Category[]>(['categories', user.id]);

      const optimistic: Category = {
        id: `optimistic-${Date.now()}`,
        user_id: user.id,
        name,
        color,
        sort_order: (previous?.length ?? 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Category[]>(['categories', user.id], (old) =>
        old ? [...old, optimistic] : [optimistic]
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user?.id && context?.previous !== undefined) {
        queryClient.setQueryData(['categories', user.id], context.previous);
      }
      toast.error('카테고리 생성 실패');
    },
    onSuccess: (_data) => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: ['categories', user.id] });
      toast.success('카테고리가 생성되었습니다');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const updates: Partial<Pick<Category, 'name' | 'color'>> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      if (!user?.id) throw new Error('인증이 필요합니다');

      const { error } = await supabase
        .from('categories')
        .update(updates as never)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ id, name, color }) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: ['categories', user.id] });

      const previous = queryClient.getQueryData<Category[]>(['categories', user.id]);

      queryClient.setQueryData<Category[]>(['categories', user.id], (old) =>
        old?.map((cat) =>
          cat.id === id
            ? { ...cat, ...(name !== undefined && { name }), ...(color !== undefined && { color }) }
            : cat
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user?.id && context?.previous !== undefined) {
        queryClient.setQueryData(['categories', user.id], context.previous);
      }
      toast.error('카테고리 수정 실패');
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: ['categories', user.id] });
      toast.success('카테고리가 수정되었습니다');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user?.id) throw new Error('인증이 필요합니다');

      // Check if any clips are assigned to this category
      const { count, error: countError } = await supabase
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('user_id', user.id);

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error(`이 카테고리에 ${count}개의 클립이 있습니다. 클립을 다른 카테고리로 이동한 후 삭제해주세요.`);
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: ['categories', user.id] });

      const previous = queryClient.getQueryData<Category[]>(['categories', user.id]);

      queryClient.setQueryData<Category[]>(['categories', user.id], (old) =>
        old?.filter((cat) => cat.id !== id)
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (user?.id && context?.previous !== undefined) {
        queryClient.setQueryData(['categories', user.id], context.previous);
      }
      toast.error(err instanceof Error ? err.message : '카테고리 삭제 실패');
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: ['categories', user.id] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('카테고리가 삭제되었습니다');
    },
  });
}
