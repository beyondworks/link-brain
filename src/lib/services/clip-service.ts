// Clip processing service for Linkbrain v2
// Ported from v1 api/_lib/clip-service.ts
// Replaces Firebase with Supabase; adds embedding generation.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateChatCompletion } from '@/lib/ai/openai';
import { indexClipEmbedding } from '@/lib/ai/embeddings';
import { buildClipMetadataPrompt, buildUrlMetadataPrompt } from '@/lib/ai/prompts';
import type { Category, Tag } from '@/types/database';

// Raw client bypasses the Database generic for tables whose Insert types
// resolve to `never` due to @supabase/supabase-js v2.49 schema constraints.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ClipContentInput {
  url: string;
  sourceType: 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter';
  rawText?: string;       // Actual extracted text; never AI-generated
  htmlContent?: string;  // Actual HTML; never AI-generated
  images?: string[];     // Actual image URLs; never AI-generated
  userId: string;
  author?: string;
  authorAvatar?: string;
  authorHandle?: string;
  embeddedLinks?: Array<{ label: string; url: string }>;
}

export interface ClipMetadata {
  title: string;
  summary: string;
  detailedSummary?: string;
  keywords: string[];
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  type: 'article' | 'video' | 'image' | 'social_post' | 'website';
}

// ─── Utility helpers ───────────────────────────────────────────────────────────

export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const getYouTubeThumbnail = (videoId: string): string =>
  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const fallbackTitle = (url: string, rawText = ''): string => {
  if (rawText) {
    const firstLine = rawText.split('\n')[0].trim();
    if (firstLine.length > 0) return firstLine.substring(0, 100);
  }
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Untitled Link';
  }
};

const fallbackSummary = (rawText: string, language = 'KR'): string => {
  if (!rawText || rawText.trim().length === 0) {
    return language === 'KR'
      ? '원문 링크만 저장된 클립입니다.'
      : 'URL-only clip. Click to view original content.';
  }
  if (rawText.length <= 300) return rawText.trim();
  return rawText.substring(0, 300).trim() + '…';
};

// ─── Category helpers ──────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#F97316', '#14B8A6', '#6366F1',
  '#F43F5E', '#06B6D4', '#34D399', '#7C3AED',
];

const getOrCreateCategory = async (
  userId: string,
  categoryName: string
): Promise<string | null> => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('user_id', userId);

    if (existing) {
      const match = (existing as Pick<Category, 'id' | 'name'>[]).find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (match) {
        return match.id;
      }
    }

    const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];

    const { data: created, error } = await db
      .from('categories')
      .insert({ user_id: userId, name: categoryName, color, sort_order: 0 })
      .select('id')
      .single();

    if (error || !created) {
      console.error('[Category] Create error:', error);
      return null;
    }

    return (created as Pick<Category, 'id'>).id;
  } catch (err) {
    console.error('[Category] getOrCreateCategory failed:', err);
    return null;
  }
};

// ─── AI metadata generation ────────────────────────────────────────────────────

/**
 * Generate clip metadata using OpenAI.
 * Only called when rawText is non-empty.
 */
export const generateClipMetadata = async (
  rawText: string,
  url: string,
  platform: string,
  language = 'KR'
): Promise<ClipMetadata | null> => {
  if (!rawText || rawText.trim().length === 0) {
    return null;
  }

  try {
    const isYouTube =
      platform === 'youtube' ||
      url.includes('youtube.com') ||
      url.includes('youtu.be');

    const { system, user, maxTokens } = buildClipMetadataPrompt({
      url,
      platform,
      rawText,
      language,
    });

    const responseText = await generateChatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: isYouTube ? 0.3 : 0.1,
        maxTokens,
      }
    );

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[AI Metadata] No JSON in response');
      return null;
    }

    const aiData = JSON.parse(jsonMatch[0]) as Partial<ClipMetadata> & {
      detailedSummary?: string;
    };

    return {
      title: aiData.title || fallbackTitle(url, rawText),
      summary: aiData.summary || fallbackSummary(rawText, language),
      detailedSummary: isYouTube
        ? aiData.detailedSummary || aiData.summary || fallbackSummary(rawText, language)
        : undefined,
      keywords: Array.isArray(aiData.keywords) ? aiData.keywords.slice(0, 7) : [],
      category: aiData.category || 'Other',
      sentiment: aiData.sentiment || 'neutral',
      type: aiData.type || 'website',
    };
  } catch (error) {
    console.error('[AI Metadata] Generation failed:', error);
    return null;
  }
};

/**
 * Generate minimal metadata from URL when no raw text is available.
 */
const generateMetadataFromUrl = async (
  url: string,
  platform: string,
  language = 'KR'
): Promise<ClipMetadata | null> => {
  try {
    const { system, user } = buildUrlMetadataPrompt({ url, platform, language });

    const responseText = await generateChatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { model: 'gpt-4o-mini', temperature: 0, maxTokens: 300 }
    );

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const aiData = JSON.parse(jsonMatch[0]) as Partial<ClipMetadata>;

    return {
      title: aiData.title || fallbackTitle(url),
      summary: aiData.summary || `${platform} link saved for later.`,
      keywords: Array.isArray(aiData.keywords) ? aiData.keywords.slice(0, 5) : [],
      category: aiData.category || 'Other',
      sentiment: aiData.sentiment || 'neutral',
      type: aiData.type || 'website',
    };
  } catch (error) {
    console.error('[AI Metadata] URL-based generation failed:', error);
    return null;
  }
};

// ─── Auto-tagging ──────────────────────────────────────────────────────────────

/**
 * Match keywords to existing tags in Supabase; create new tags if needed.
 * Returns tag IDs that were linked to the clip.
 */
export const autoTagClip = async (
  clipId: string,
  keywords: string[]
): Promise<string[]> => {
  if (keywords.length === 0) return [];

  try {
    const { data: allTags } = await supabaseAdmin
      .from('tags')
      .select('id, name');

    const tagMap = new Map<string, string>(
      ((allTags ?? []) as Pick<Tag, 'id' | 'name'>[]).map((t) => [t.name.toLowerCase(), t.id])
    );

    const tagIds: string[] = [];

    for (const keyword of keywords) {
      const lc = keyword.toLowerCase().trim();
      if (!lc) continue;

      let tagId = tagMap.get(lc);

      if (!tagId) {
        const { data: newTag, error } = await db
          .from('tags')
          .insert({ name: lc })
          .select('id')
          .single();

        if (error || !newTag) {
          console.warn(`[AutoTag] Could not create tag "${lc}":`, error);
          continue;
        }
        tagId = (newTag as Pick<Tag, 'id'>).id;
        tagMap.set(lc, tagId);
      }

      tagIds.push(tagId);
    }

    if (tagIds.length > 0) {
      const rows = tagIds.map((tag_id) => ({ clip_id: clipId, tag_id }));
      const { error } = await db
        .from('clip_tags')
        .upsert(rows, { onConflict: 'clip_id,tag_id' });

      if (error) {
        console.error('[AutoTag] clip_tags insert error:', error);
      }
    }

    return tagIds;
  } catch (err) {
    console.error('[AutoTag] autoTagClip failed:', err);
    return [];
  }
};

// ─── generateEmbedding re-export ──────────────────────────────────────────────

export { generateEmbedding } from '@/lib/ai/embeddings';

// ─── Main service function ─────────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 100_000;
const MAX_IMAGES = 10;
const ENABLE_YT_DETAILED_SUMMARY_PREPEND =
  process.env.ENABLE_YT_DETAILED_SUMMARY_PREPEND === 'true';

export interface ProcessNewClipResult {
  clipId: string;
  title: string;
  summary: string;
  keywords: string[];
  categoryId: string | null;
}

/**
 * Main entry point: process a new clip from raw content.
 *
 * Steps:
 * 1. Generate AI metadata from rawText (or URL as fallback)
 * 2. Get or create category
 * 3. Insert clip row into Supabase `clips`
 * 4. Insert `clip_contents` row (heavy content)
 * 5. Auto-tag from keywords
 * 6. Generate and store embedding (fire-and-forget, non-blocking)
 */
export const processNewClip = async (
  input: ClipContentInput,
  options?: { language?: string }
): Promise<ProcessNewClipResult> => {
  const {
    url,
    sourceType,
    rawText,
    htmlContent,
    images,
    userId,
    author,
    authorAvatar,
    authorHandle,
  } = input;
  const language = options?.language ?? 'KR';

  const rawMarkdown = rawText ?? '';
  const contentHtml = htmlContent ?? '';

  let clipImages = [...(images ?? [])];
  if (sourceType === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      const thumb = getYouTubeThumbnail(videoId);
      if (!clipImages.includes(thumb)) clipImages.unshift(thumb);
    }
  }
  clipImages = clipImages.slice(0, MAX_IMAGES);

  let metadata: ClipMetadata | null = null;
  if (rawMarkdown.trim().length > 0) {
    metadata = await generateClipMetadata(rawMarkdown, url, sourceType, language);
  }
  if (!metadata) {
    metadata = await generateMetadataFromUrl(url, sourceType, language);
  }

  const title = metadata?.title ?? fallbackTitle(url, rawMarkdown);
  const summary = metadata?.summary ?? fallbackSummary(rawMarkdown, language);
  const detailedSummary = metadata?.detailedSummary?.trim() ?? '';
  const keywords = metadata?.keywords ?? [];
  const categoryName = metadata?.category ?? 'Other';

  let displayMarkdown = rawMarkdown;
  if (sourceType === 'web' && !displayMarkdown.trim()) {
    displayMarkdown = summary;
  }
  if (
    sourceType === 'youtube' &&
    ENABLE_YT_DETAILED_SUMMARY_PREPEND &&
    detailedSummary
  ) {
    const summaryTitle =
      language === 'KR' ? '### 영상 상세 요약' : '### Detailed Video Summary';
    const sourceTitle =
      language === 'KR' ? '### 추출 원문' : '### Extracted Source';
    displayMarkdown = [summaryTitle, detailedSummary, '---', sourceTitle, rawMarkdown || summary]
      .filter(Boolean)
      .join('\n\n');
  }

  const truncRaw =
    rawMarkdown.length > MAX_CONTENT_LENGTH
      ? rawMarkdown.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]'
      : rawMarkdown;
  const truncDisplay =
    displayMarkdown.length > MAX_CONTENT_LENGTH
      ? displayMarkdown.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]'
      : displayMarkdown;
  const truncHtml =
    contentHtml.length > MAX_CONTENT_LENGTH
      ? contentHtml.substring(0, MAX_CONTENT_LENGTH)
      : contentHtml;

  const thumbnailImage = clipImages[0] ?? null;
  const categoryId = await getOrCreateCategory(userId, categoryName);

  // Map sourceType to DB-allowed platform values
  const platformMap: Record<string, string> = {
    instagram: 'instagram',
    threads: 'other',
    youtube: 'youtube',
    web: 'web',
    twitter: 'twitter',
  };
  const platform = platformMap[sourceType] ?? 'other';

  const { data: clipRow, error: clipError } = await db
    .from('clips')
    .insert({
      user_id: userId,
      url,
      title,
      summary,
      image: thumbnailImage,
      platform,
      author: author ?? null,
      author_handle: authorHandle ?? null,
      author_avatar: authorAvatar ?? null,
      is_favorite: false,
      is_read_later: false,
      is_archived: false,
      is_public: false,
      category_id: categoryId,
      views: 0,
      likes_count: 0,
    })
    .select('id')
    .single();

  if (clipError || !clipRow) {
    console.error('[ClipService] Insert clip error:', clipError);
    throw new Error(`Failed to create clip: ${clipError?.message}`);
  }

  const clipId = (clipRow as { id: string }).id;

  const { error: contentError } = await db
    .from('clip_contents')
    .insert({
      clip_id: clipId,
      html_content: truncHtml || null,
      content_markdown: truncDisplay || null,
      raw_markdown: truncRaw || null,
    });

  if (contentError) {
    console.error('[ClipService] clip_contents insert error:', contentError);
  }

  // Auto-tag asynchronously (non-fatal)
  autoTagClip(clipId, keywords).catch((err) =>
    console.error('[ClipService] autoTagClip failed:', err)
  );

  // Generate embedding asynchronously (non-fatal, fire-and-forget)
  indexClipEmbedding({
    clipId,
    title,
    summary,
    rawText: truncRaw,
  }).catch((err) => console.error('[ClipService] Embedding failed:', err));

  return { clipId, title, summary, keywords, categoryId };
};
