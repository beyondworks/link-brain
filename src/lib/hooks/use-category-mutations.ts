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
        .single();

      const nextOrder = existing ? existing.sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name, color, sort_order: nextOrder })
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
        .update(updates)
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

      const { error: clipError } = await supabase
        .from('clips')
        .update({ category_id: null })
        .eq('category_id', id)
        .eq('user_id', user.id);

      if (clipError) throw clipError;

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
    onError: (_err, _vars, context) => {
      if (user?.id && context?.previous !== undefined) {
        queryClient.setQueryData(['categories', user.id], context.previous);
      }
      toast.error('카테고리 삭제 실패');
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: ['categories', user.id] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('카테고리가 삭제되었습니다');
    },
  });
}
