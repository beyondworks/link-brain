'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/get-error-message';
import { hapticLight, hapticWarning } from '@/lib/native/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkTagVars {
  clipIds: string[];
  tagIds: string[];
}

interface BulkCollectionVars {
  clipIds: string[];
  collectionId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchBulkTags(
  method: 'POST' | 'DELETE',
  vars: BulkTagVars
): Promise<void> {
  const res = await fetch('/api/v1/clips/bulk/tags', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? '태그 일괄 처리에 실패했습니다.');
  }
}

async function fetchBulkCollection(
  method: 'POST' | 'DELETE',
  vars: BulkCollectionVars
): Promise<void> {
  const res = await fetch('/api/v1/clips/bulk/collection', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? '컬렉션 일괄 처리에 실패했습니다.');
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBulkAddTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: BulkTagVars) => fetchBulkTags('POST', vars),
    onMutate: () => { hapticLight(); },
    onSuccess: (_data, { clipIds, tagIds }) => {
      toast.success(
        `${clipIds.length}개 클립에 태그 ${tagIds.length}개가 추가되었습니다.`
      );
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, '태그 일괄 추가에 실패했습니다.'));
    },
  });
}

export function useBulkRemoveTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: BulkTagVars) => fetchBulkTags('DELETE', vars),
    onMutate: () => { hapticLight(); },
    onSuccess: (_data, { clipIds, tagIds }) => {
      toast.success(
        `${clipIds.length}개 클립에서 태그 ${tagIds.length}개가 제거되었습니다.`
      );
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, '태그 일괄 제거에 실패했습니다.'));
    },
  });
}

export function useBulkMoveToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: BulkCollectionVars) => fetchBulkCollection('POST', vars),
    onMutate: () => { hapticLight(); },
    onSuccess: (_data, { clipIds }) => {
      toast.success(`${clipIds.length}개 클립이 컬렉션에 추가되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, '컬렉션 일괄 추가에 실패했습니다.'));
    },
  });
}

export function useBulkRemoveFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: BulkCollectionVars) => fetchBulkCollection('DELETE', vars),
    onMutate: () => { hapticWarning(); },
    onSuccess: (_data, { clipIds }) => {
      toast.success(`${clipIds.length}개 클립이 컬렉션에서 제거되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, '컬렉션 일괄 제거에 실패했습니다.'));
    },
  });
}
