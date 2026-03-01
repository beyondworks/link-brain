import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft, Heart } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface Props {
  params: Promise<{ clipId: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function getPublicClip(clipId: string) {
  const { data, error } = await db
    .from('clips')
    .select('*')
    .eq('id', clipId)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  return data as {
    id: string;
    title: string | null;
    url: string;
    summary: string | null;
    image: string | null;
    platform: string | null;
    author: string | null;
    likes_count: number;
    created_at: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clipId } = await params;
  const clip = await getPublicClip(clipId);

  if (!clip) {
    return { title: '클립을 찾을 수 없습니다 - Linkbrain' };
  }

  return {
    title: `${clip.title ?? clip.url} - Linkbrain`,
    description: clip.summary ?? `Linkbrain에서 저장한 클립`,
    openGraph: {
      title: clip.title ?? clip.url,
      description: clip.summary ?? undefined,
      images: clip.image ? [{ url: clip.image }] : undefined,
      type: 'article',
      siteName: 'Linkbrain',
    },
    twitter: {
      card: clip.image ? 'summary_large_image' : 'summary',
      title: clip.title ?? clip.url,
      description: clip.summary ?? undefined,
      images: clip.image ? [clip.image] : undefined,
    },
  };
}

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

export default async function PublicClipPage({ params }: Props) {
  const { clipId } = await params;
  const clip = await getPublicClip(clipId);

  if (!clip) notFound();

  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = GRADIENT_COLORS[clip.id.charCodeAt(0) % GRADIENT_COLORS.length];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold">
            Linkbrain
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          탐색으로 돌아가기
        </Link>

        {/* Hero image */}
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {clip.image ? (
            <Image
              src={clip.image}
              alt={clip.title ?? ''}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center bg-gradient-to-br',
                gradient
              )}
            >
              <span className="text-6xl font-bold text-white">
                {firstLetter}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold md:text-3xl">
          {clip.title ?? clip.url}
        </h1>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {clip.author && <span>{clip.author}</span>}
          {clip.platform && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              {clip.platform}
            </span>
          )}
          <span>{formatRelativeTime(clip.created_at)}</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {clip.likes_count}
          </span>
        </div>

        {/* Summary */}
        {clip.summary && (
          <p className="mt-6 text-muted-foreground leading-relaxed">
            {clip.summary}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <a
              href={clip.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              원문 보기
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/signup?clip=${clipId}`}>내 브레인에 추가</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
