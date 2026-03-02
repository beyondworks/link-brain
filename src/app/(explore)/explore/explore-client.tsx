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
import { useUIStore } from '@/stores/ui-store';
import { ClipPeekPanel } from '@/components/clips/clip-peek-panel';

type ExploreTab = 'trending' | 'picks' | 'recent';

const TABS: { key: ExploreTab; label: string; icon: React.ElementType }[] = [
  { key: 'trending', label: '트렌딩', icon: TrendingUp },
  { key: 'picks', label: "에디터's 픽", icon: Star },
  { key: 'recent', label: '최신', icon: Clock },
];

// Use seed clips as explore placeholder data (peek panel recognizes seed-* IDs)
import { SEED_CLIPS } from '@/config/seed-clips';
const PLACEHOLDER_CLIPS = SEED_CLIPS.map((clip) => ({
  id: clip.id,
  title: clip.title ?? '',
  summary: clip.summary ?? '',
  url: clip.url,
  image: clip.image,
  platform: clip.platform ?? 'web',
  author: clip.author ?? '',
  likes_count: clip.likes_count,
  created_at: clip.created_at,
}));

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
  const openClipPeek = useUIStore((s) => s.openClipPeek);

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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {PLACEHOLDER_CLIPS.map((clip) => {
          const firstLetter = clip.title.charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);

          return (
            <Card
              key={clip.id}
              onClick={() => openClipPeek(clip.id)}
              className="card-glow group h-full flex flex-col cursor-pointer overflow-hidden p-0 gap-0 rounded-2xl border-border/60 hover:shadow-card-hover transition-spring"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
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
              <div className="flex-1 p-4">
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

      {/* Clip peek panel (side/center/full modes) */}
      <ClipPeekPanel />
    </div>
  );
}
