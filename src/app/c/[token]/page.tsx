/**
 * 공개 공유 컬렉션 페이지
 *
 * URL: /c/[token]
 * 인증 불필요. share_token으로 컬렉션과 소속 클립을 퍼블릭으로 렌더링.
 */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { ClipData } from '@/types/database';
import { ExternalLink, Layers, Calendar } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  share_token: string | null;
}

interface SharedCollection extends CollectionRow {
  clips: ClipData[];
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

async function getSharedCollection(token: string): Promise<SharedCollection | null> {
  const { data: colData, error: colError } = await db
    .from('collections')
    .select('id, name, description, color, share_token')
    .eq('share_token', token)
    .single();

  if (colError || !colData) return null;

  const collection = colData as CollectionRow;

  // 컬렉션에 속한 클립 조회 (clip_collections 조인)
  const { data: clipRows, error: clipError } = await db
    .from('clip_collections')
    .select('clips(*)')
    .eq('collection_id', collection.id)
    .order('created_at', { ascending: false });

  if (clipError) return null;

  const clips: ClipData[] = ((clipRows as Array<{ clips: ClipData }>) ?? [])
    .map((row) => row.clips)
    .filter(Boolean);

  return { ...collection, clips };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const collection = await getSharedCollection(token);

  if (!collection) {
    return { title: '컬렉션을 찾을 수 없습니다 — Linkbrain' };
  }

  const description =
    collection.description ??
    `${collection.clips.length}개의 클립이 담긴 Linkbrain 컬렉션`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud';

  return {
    title: `${collection.name} — Linkbrain`,
    description,
    openGraph: {
      title: collection.name,
      description,
      url: `${appUrl}/c/${token}`,
      siteName: 'Linkbrain',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: collection.name,
      description,
    },
  };
}

export default async function SharedCollectionPage({ params }: Props) {
  const { token } = await params;
  const collection = await getSharedCollection(token);

  if (!collection) {
    notFound();
  }

  const accentColor = collection.color ?? '#21DBA4';

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkbrain-logo.svg" alt="Linkbrain" width={100} height={18} />
          </Link>
          <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            공유된 컬렉션
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        {/* Collection header */}
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />

          <div className="relative flex items-start gap-3">
            <div className="relative mt-1 flex-shrink-0">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <div
                className="absolute inset-0 rounded-full blur-md opacity-70"
                style={{ backgroundColor: accentColor }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {collection.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Layers size={12} />
                <span>{collection.clips.length}개의 클립</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clip list */}
        {collection.clips.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">이 컬렉션에 클립이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collection.clips.map((clip) => (
              <ClipItem key={clip.id} clip={clip} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-border/40 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            이 컬렉션은{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              Linkbrain
            </Link>
            에서 공유되었습니다.
          </p>
        </div>
      </main>
    </div>
  );
}

function ClipItem({ clip }: { clip: ClipData }) {
  let hostname = '';
  try {
    hostname = new URL(clip.url).hostname;
  } catch {
    hostname = clip.url;
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
    >
      {/* Favicon */}
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {clip.title ?? '제목 없음'}
        </p>
        {clip.summary && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {clip.summary}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <ExternalLink size={10} />
            {hostname}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <Calendar size={10} />
            {formatDate(clip.created_at)}
          </span>
        </div>
      </div>
    </a>
  );
}
