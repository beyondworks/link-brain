'use client';

import type { ClipData } from '@/types/database';
import { ClipList } from '@/components/clips/clip-list';
import { AddClipDialog } from '@/components/clips/add-clip-dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const MOCK_CLIPS: ClipData[] = [
  {
    id: '1',
    user_id: 'mock-user',
    url: 'https://www.youtube.com/watch?v=example1',
    title: 'Next.js 15 새로운 기능 완벽 정리',
    summary: 'Next.js 15의 주요 변경사항과 새로운 기능들을 상세히 알아봅니다.',
    image: null,
    platform: 'youtube',
    author: null,
    author_handle: null,
    author_avatar: null,
    read_time: null,
    ai_score: null,
    category_id: null,
    is_favorite: true,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    views: 0,
    likes_count: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user',
    url: 'https://twitter.com/vercel/status/example',
    title: 'Vercel이 발표한 AI 기반 배포 최적화 기능',
    summary: 'Vercel이 새로운 AI 기반 배포 최적화 기능을 발표했습니다.',
    image: null,
    platform: 'twitter',
    author: null,
    author_handle: null,
    author_avatar: null,
    read_time: null,
    ai_score: null,
    category_id: null,
    is_favorite: false,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    views: 0,
    likes_count: 0,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user',
    url: 'https://blog.naver.com/tech/example',
    title: 'TypeScript 5.5 새 기능 총정리',
    summary: 'TypeScript 5.5에서 추가된 타입 추론 개선, 유틸리티 타입 등을 정리했습니다.',
    image: null,
    platform: 'web',
    author: null,
    author_handle: null,
    author_avatar: null,
    read_time: null,
    ai_score: null,
    category_id: null,
    is_favorite: false,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    views: 0,
    likes_count: 0,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

type QuickFilter = 'all' | 'favorite' | 'readLater';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'favorite', label: '즐겨찾기' },
  { key: 'readLater', label: '나중에 읽기' },
];

export function DashboardClient() {
  const openModal = useUIStore((s) => s.openModal);
  const isFavoriteFilter = useUIStore((s) => s.filters.isFavorite);
  const setFilter = useUIStore((s) => s.setFilter);

  function getActiveFilter(): QuickFilter {
    if (isFavoriteFilter === true) return 'favorite';
    return 'all';
  }

  function handleFilterClick(key: QuickFilter) {
    if (key === 'favorite') {
      setFilter('isFavorite', true);
    } else {
      setFilter('isFavorite', null);
    }
  }

  const activeFilter = getActiveFilter();

  const filteredClips = MOCK_CLIPS.filter((clip) => {
    if (activeFilter === 'favorite') return clip.is_favorite;
    return true;
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            저장된 클립을 확인하고 관리하세요.
          </p>
        </div>
        <Button onClick={() => openModal('addClip')}>+ 클립 추가</Button>
      </div>

      <div className="mb-4 flex gap-2">
        {QUICK_FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            variant={activeFilter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <ClipList clips={filteredClips} />

      <AddClipDialog />
    </div>
  );
}
