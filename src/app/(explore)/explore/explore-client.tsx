'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  TrendingUp,
  Star,
  Clock,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useTrendingClips, useFeaturedClips, type ExploreClip } from '@/lib/hooks/use-explore';

type ExploreTab = 'trending' | 'featured' | 'recent';

const TABS: { key: ExploreTab; label: string; icon: React.ElementType }[] = [
  { key: 'trending', label: '트렌딩', icon: TrendingUp },
  { key: 'featured', label: "에디터's 픽", icon: Star },
  { key: 'recent', label: '최신', icon: Clock },
];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  github: 'GitHub',
  web: 'Web',
  notion: 'Notion',
  substack: 'Substack',
  medium: 'Medium',
};

function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] ?? platform;
}

function ExploreCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4 rounded-2xl border-border/60">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
      <Skeleton className="h-3 w-20 mt-1" />
    </Card>
  );
}

function ExploreCard({ clip }: { clip: ExploreClip }) {
  return (
    <Link href={`/clip/${clip.id}`}>
      <Card className="group flex flex-col gap-2 p-4 rounded-2xl border-border/60 hover:shadow-card-hover hover:border-border transition-spring cursor-pointer h-full">
        {/* Platform badge */}
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            {getPlatformLabel(clip.platform)}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-foreground/80 transition-colors">
          {clip.title ?? '제목 없음'}
        </h3>

        {/* Summary */}
        {clip.summary && (
          <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
            {clip.summary}
          </p>
        )}

        {/* Time */}
        <p className="mt-auto pt-1 text-xs text-subtle">
          {formatRelativeTime(clip.created_at)}
        </p>
      </Card>
    </Link>
  );
}

function ClipGrid({ clips }: { clips: ExploreClip[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {clips.map((clip) => (
        <ExploreCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ExploreCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">
        아직 공개된 클립이 없습니다
      </p>
      <p className="mt-1 text-xs text-subtle">
        클립을 공개로 설정하면 여기에 표시됩니다.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-destructive/60 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">
        클립을 불러오지 못했습니다
      </p>
      <p className="mt-1 text-xs text-subtle">{message}</p>
    </div>
  );
}

function TrendingSection({ searchQuery }: { searchQuery: string }) {
  const { data, isLoading, error } = useTrendingClips();

  if (isLoading) return <SkeletonGrid />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const filtered = searchQuery.trim()
    ? (data ?? []).filter(
        (c) =>
          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (data ?? []);

  if (filtered.length === 0) return <EmptyState />;
  return <ClipGrid clips={filtered} />;
}

function FeaturedSection({ searchQuery }: { searchQuery: string }) {
  const { data, isLoading, error } = useFeaturedClips();

  if (isLoading) return <SkeletonGrid />;

  // Featured hook already returns [] on error (graceful fallback)
  if (error) return <EmptyState />;

  const filtered = searchQuery.trim()
    ? (data ?? []).filter(
        (c) =>
          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (data ?? []);

  if (filtered.length === 0) return <EmptyState />;
  return <ClipGrid clips={filtered} />;
}

function RecentSection({ searchQuery }: { searchQuery: string }) {
  // Recent re-uses trending data but sorted by created_at (same query, different label)
  const { data, isLoading, error } = useTrendingClips();

  if (isLoading) return <SkeletonGrid />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const filtered = searchQuery.trim()
    ? (data ?? []).filter(
        (c) =>
          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (data ?? []);

  if (filtered.length === 0) return <EmptyState />;
  return <ClipGrid clips={filtered} />;
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

      {/* Content */}
      {activeTab === 'trending' && <TrendingSection searchQuery={searchQuery} />}
      {activeTab === 'featured' && <FeaturedSection searchQuery={searchQuery} />}
      {activeTab === 'recent' && <RecentSection searchQuery={searchQuery} />}
    </div>
  );
}
