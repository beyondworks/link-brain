'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  TrendingUp,
  Star,
  Clock,
  ExternalLink,
  Heart,
  BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ExploreTab = 'trending' | 'picks' | 'recent';

const TABS: { key: ExploreTab; label: string; icon: React.ElementType }[] = [
  { key: 'trending', label: '트렌딩', icon: TrendingUp },
  { key: 'picks', label: "에디터's 픽", icon: Star },
  { key: 'recent', label: '최신', icon: Clock },
];

// Placeholder data
const PLACEHOLDER_CLIPS = [
  {
    id: 'p1',
    title: 'Next.js 15에서 달라진 점 총정리',
    summary: 'App Router 개선, Turbopack 안정화, 캐싱 전략 변경 등 주요 변경사항을 정리합니다.',
    url: 'https://example.com/nextjs-15',
    image: null,
    platform: 'web',
    author: '김개발',
    likes_count: 42,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'p2',
    title: 'AI 시대의 프로덕트 매니저 역할',
    summary: 'LLM이 보편화된 시대에 PM은 어떤 역할을 해야 하는가?',
    url: 'https://example.com/ai-pm',
    image: null,
    platform: 'medium',
    author: '이매니저',
    likes_count: 38,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'p3',
    title: 'PostgreSQL 성능 튜닝 가이드',
    summary: '인덱스 전략, 쿼리 최적화, 커넥션 풀링까지 실전 가이드.',
    url: 'https://example.com/pg-tuning',
    image: null,
    platform: 'github',
    author: '박디비',
    likes_count: 56,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

function getGradient(id: string): string {
  const index = id.charCodeAt(0) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[index];
}

export function ExploreClient() {
  const [activeTab, setActiveTab] = useState<ExploreTab>('trending');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">탐색</h1>
        <p className="mt-2 text-muted-foreground">
          다른 사용자의 공개 클립을 발견하고 영감을 얻으세요.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="클립 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Clip Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_CLIPS.map((clip) => {
          const firstLetter = clip.title.charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);

          return (
            <Card
              key={clip.id}
              className="group overflow-hidden p-0 gap-0 transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <span className="text-3xl font-bold text-white">
                      {firstLetter}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40">
                    <Heart className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40">
                    <BookmarkPlus className="h-4 w-4" />
                  </button>
                  <Link
                    href={clip.url}
                    target="_blank"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                  {clip.title}
                </h3>
                {clip.summary && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                    {clip.summary}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{clip.author}</span>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {clip.likes_count}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      <div className="mt-8 text-center">
        <Button variant="outline">더 보기</Button>
      </div>
    </div>
  );
}
