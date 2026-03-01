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
    description: 'Next.js 15의 주요 변경사항과 새로운 기능들을 상세히 알아봅니다. React 19 지원, 캐싱 변경사항 등을 다룹니다.',
    thumbnail_url: null,
    favicon_url: null,
    platform: 'youtube',
    content_type: 'video',
    category_id: null,
    collection_id: null,
    is_favorite: true,
    is_archived: false,
    is_public: false,
    view_count: 0,
    processing_status: 'done',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user',
    url: 'https://twitter.com/vercel/status/example',
    title: 'Vercel이 발표한 AI 기반 배포 최적화 기능',
    description: 'Vercel이 새로운 AI 기반 배포 최적화 기능을 발표했습니다. 빌드 시간을 최대 40% 단축할 수 있습니다.',
    thumbnail_url: null,
    favicon_url: null,
    platform: 'twitter',
    content_type: 'social_post',
    category_id: null,
    collection_id: null,
    is_favorite: false,
    is_archived: false,
    is_public: false,
    view_count: 0,
    processing_status: 'done',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user',
    url: 'https://blog.naver.com/tech/example',
    title: 'TypeScript 5.5 새 기능 총정리',
    description: 'TypeScript 5.5에서 추가된 타입 추론 개선, 새로운 유틸리티 타입, 성능 향상 등을 정리했습니다.',
    thumbnail_url: null,
    favicon_url: null,
    platform: 'web',
    content_type: 'article',
    category_id: null,
    collection_id: null,
    is_favorite: false,
    is_archived: false,
    is_public: false,
    view_count: 0,
    processing_status: 'done',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    user_id: 'mock-user',
    url: 'https://www.instagram.com/p/example',
    title: 'UI 디자인 트렌드 2026',
    description: '2026년 UI/UX 디자인 트렌드를 정리한 인포그래픽. 글래스모피즘, 뉴모피즘 이후 새로운 트렌드를 소개합니다.',
    thumbnail_url: null,
    favicon_url: null,
    platform: 'instagram',
    content_type: 'image',
    category_id: null,
    collection_id: null,
    is_favorite: true,
    is_archived: false,
    is_public: false,
    view_count: 0,
    processing_status: 'done',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '5',
    user_id: 'mock-user',
    url: 'https://github.com/vercel/next.js/discussions/example',
    title: 'App Router에서 서버 액션 Best Practice',
    description: 'Next.js App Router에서 서버 액션을 효과적으로 사용하는 패턴과 주의사항을 정리한 GitHub 토론입니다.',
    thumbnail_url: null,
    favicon_url: null,
    platform: 'web',
    content_type: 'article',
    category_id: null,
    collection_id: null,
    is_favorite: false,
    is_archived: false,
    is_public: false,
    view_count: 0,
    processing_status: 'done',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 259200000).toISOString(),
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
