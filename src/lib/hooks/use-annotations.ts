'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ClipAnnotation } from '@/types/database';

// ─── Query ────────────────────────────────────────────────────────────────────

export function useAnnotations(clipId: string) {
  return useQuery({
    queryKey: ['annotations', clipId],
    queryFn: async (): Promise<ClipAnnotation[]> => {
      const { data, error } = await supabase
        .from('clip_annotations')
        .select('*')
        .eq('clip_id', clipId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as ClipAnnotation[]) ?? [];
    },
    enabled: Boolean(clipId),
  });
}

// ─── Create Mutation ──────────────────────────────────────────────────────────

interface CreateAnnotationInput {
  clipId: string;
  type: 'highlight' | 'note' | 'bookmark';
  selected_text?: string | null;
  note_text?: string | null;
  position_data?: {
    startOffset: number;
    endOffset: number;
    startPath: string;
    endPath: string;
  } | null;
  color?: string;
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAnnotationInput): Promise<ClipAnnotation> => {
      const { clipId, type, selected_text, note_text, position_data, color } = input;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('인증이 필요합니다.');

      const { data, error } = await supabase
        .from('clip_annotations')
        .insert({
          clip_id: clipId,
          user_id: user.id,
          type,
          selected_text: selected_text ?? null,
          note_text: note_text ?? null,
          position_data: (position_data ?? null) as Record<string, unknown> | null,
          color: color ?? 'yellow',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClipAnnotation;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['annotations', input.clipId] });

      const previous = queryClient.getQueryData<ClipAnnotation[]>([
        'annotations',
        input.clipId,
      ]);

      // optimistic annotation (임시 id)
      const optimistic: ClipAnnotation = {
        id: `optimistic-${Date.now()}`,
        clip_id: input.clipId,
        user_id: '',
        type: input.type,
        selected_text: input.selected_text ?? null,
        note_text: input.note_text ?? null,
        position_data: (input.position_data ?? null) as Record<string, unknown> | null,
        color: input.color ?? 'yellow',
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ClipAnnotation[]>(
        ['annotations', input.clipId],
        (old) => [...(old ?? []), optimistic]
      );

      return { previous };
    },
    onError: (_err, input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['annotations', input.clipId], context.previous);
      }
      toast.error('하이라이트 저장 실패');
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', input.clipId] });
      queryClient.invalidateQueries({ queryKey: ['all-annotations'] });
    },
  });
}

// ─── Delete Mutation ──────────────────────────────────────────────────────────

interface DeleteAnnotationInput {
  annotationId: string;
  clipId: string;
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId }: DeleteAnnotationInput) => {
      const { error } = await supabase
        .from('clip_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;
      return annotationId;
    },
    onMutate: async ({ annotationId, clipId }) => {
      await queryClient.cancelQueries({ queryKey: ['annotations', clipId] });

      const previous = queryClient.getQueryData<ClipAnnotation[]>(['annotations', clipId]);

      queryClient.setQueryData<ClipAnnotation[]>(
        ['annotations', clipId],
        (old) => (old ?? []).filter((a) => a.id !== annotationId)
      );

      return { previous };
    },
    onError: (_err, { clipId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['annotations', clipId], context.previous);
      }
      toast.error('하이라이트 삭제 실패');
    },
    onSuccess: (_data, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', clipId] });
      queryClient.invalidateQueries({ queryKey: ['all-annotations'] });
      toast.success('하이라이트가 삭제되었습니다');
    },
  });
}

// ─── All Annotations Query (하이라이트 페이지용) ──────────────────────────────

export interface AnnotationWithClip extends ClipAnnotation {
  clip_title: string | null;
  clip_url: string | null;
}

export function useAllAnnotations(colorFilter?: string) {
  return useQuery({
    queryKey: ['all-annotations', colorFilter],
    queryFn: async (): Promise<AnnotationWithClip[]> => {
      let query = supabase
        .from('clip_annotations')
        .select('*, clips(title, url)')
        .order('created_at', { ascending: false });

      if (colorFilter && colorFilter !== 'all') {
        query = query.eq('color', colorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data as Array<ClipAnnotation & { clips: { title: string | null; url: string | null } | null }>) ?? []).map(
        (row) => ({
          ...row,
          clip_title: row.clips?.title ?? null,
          clip_url: row.clips?.url ?? null,
        })
      );
    },
  });
}
