import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft, Eye } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getGradient } from '@/config/constants';
import { ImportClipButton } from '@/components/explore/import-clip-button';

interface Props {
  params: Promise<{ clipId: string }>;
}

const db = supabaseAdmin;

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
    views: number;
    created_at: string;
  };
}

/**
 * 조회수는 이 공개 페이지가 열릴 때만 올라간다 (탐색 카드 → /p/{id} 진입 포함).
 * 응답을 막지 않도록 after()로 미룬다. 실패해도 페이지는 정상 렌더링.
 */
function countView(clipId: string): void {
  after(async () => {
    // ponytail: read-then-write increment — view counts are approximate by
    // nature; swap to the increment_clip_views RPC once migration 034 lands.
    const { data } = await db
      .from('clips')
      .select('views')
      .eq('id', clipId)
      .eq('is_public', true)
      .single();
    if (!data) return;
    const { error } = await db
      .from('clips')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', clipId)
      .eq('is_public', true);
    if (error) console.error('[PublicClipPage] View count failed:', error);
  });
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

export default async function PublicClipPage({ params }: Props) {
  const { clipId } = await params;
  const clip = await getPublicClip(clipId);

  if (!clip) notFound();

  countView(clip.id);

  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: clip.title ?? clip.url,
            description: clip.summary ?? undefined,
            image: clip.image ?? undefined,
            author: clip.author ? { '@type': 'Person', name: clip.author } : undefined,
            datePublished: clip.created_at,
            publisher: {
              '@type': 'Organization',
              name: 'Linkbrain',
              url: 'https://linkbrain.cloud',
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://linkbrain.cloud/p/${clip.id}`,
            },
          }),
        }}
      />
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image src="/linkbrain-logo.svg" alt="Linkbrain" width={120} height={20} />
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
          <span suppressHydrationWarning>{formatRelativeTime(clip.created_at)}</span>
          {clip.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {clip.views}
            </span>
          )}
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
          <ImportClipButton
            clipId={clipId}
            size="default"
            variant="outline"
            signedOutFallback={
              <Button variant="outline" asChild>
                <Link href={`/signup?clip=${clipId}`}>내 브레인에 추가</Link>
              </Button>
            }
          />
        </div>
      </main>
    </div>
  );
}
