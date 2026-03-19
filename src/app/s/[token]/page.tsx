/**
 * 공개 공유 클립 페이지
 *
 * URL: /s/[token]
 * 인증 불필요. share_token + is_public=true 인 클립을 퍼블릭으로 렌더링.
 */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { ClipData, ClipContent } from '@/types/database';
import { ExternalLink, Clock, Calendar, ArrowUpRight } from 'lucide-react';

const db = supabaseAdmin;

interface SharedClip extends ClipData {
  clip_contents: ClipContent[];
}

interface Props {
  params: Promise<{ token: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getSharedClip(token: string): Promise<SharedClip | null> {
  const { data, error } = await db
    .from('clips')
    .select('*, clip_contents(*)' as '*')
    .eq('share_token' as 'id', token)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  return data as unknown as SharedClip;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const clip = await getSharedClip(token);

  if (!clip) {
    return { title: '클립을 찾을 수 없습니다 — Linkbrain' };
  }

  const description = clip.summary ?? clip.title ?? 'Linkbrain에서 공유된 클립';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud';

  return {
    title: `${clip.title ?? '제목 없음'} — Linkbrain`,
    description,
    openGraph: {
      title: clip.title ?? '제목 없음',
      description,
      url: `${appUrl}/s/${token}`,
      siteName: 'Linkbrain',
      images: clip.image ? [{ url: clip.image, alt: clip.title ?? '' }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: clip.title ?? '제목 없음',
      description,
      images: clip.image ? [clip.image] : [],
    },
  };
}

export default async function SharedClipPage({ params }: Props) {
  const { token } = await params;
  const clip = await getSharedClip(token);

  if (!clip) {
    notFound();
  }

  const content = clip.clip_contents?.[0];
  const bodyText = content?.content_markdown ?? content?.raw_markdown ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image src="/linkbrain-logo.svg" alt="Linkbrain" width={108} height={18} />
          </Link>
          <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            공유된 클립
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">

        {/* OG image */}
        {clip.image && (
          <div className="mb-7 overflow-hidden rounded-2xl border border-border/60 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clip.image}
              alt={clip.title ?? ''}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Header card */}
        <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {clip.author && (
            <p className="mb-2 text-xs font-medium text-muted-foreground">{clip.author}</p>
          )}
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground">
            {clip.title ?? '제목 없음'}
          </h1>

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {clip.read_time != null && (
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {clip.read_time}분 읽기
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground" suppressHydrationWarning>
              <Calendar size={11} />
              {formatDate(clip.created_at)}
            </span>
          </div>
        </div>

        {/* AI 요약 */}
        {clip.summary && (
          <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              AI 요약
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{clip.summary}</p>
          </div>
        )}

        {/* 본문 */}
        {bodyText && (
          <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              본문
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {bodyText}
            </p>
          </div>
        )}

        {/* 원본 링크 */}
        <div className="flex items-center gap-3">
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40"
          >
            <ArrowUpRight size={14} className="text-primary" />
            원본 페이지 열기
          </a>
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={12} />
            {new URL(clip.url).hostname}
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-border/40 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            이 클립은{' '}
            <Link href="/" className="inline-flex items-center font-medium text-primary hover:underline">
              Linkbrain
            </Link>
            에서 공유되었습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
