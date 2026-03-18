// Clip processing service for Linkbrain v2
// Ported from v1 api/_lib/clip-service.ts
// Replaces Firebase with Supabase; adds embedding generation.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateChatCompletion } from '@/lib/ai/openai';
import { indexClipEmbedding } from '@/lib/ai/embeddings';
import { buildClipMetadataPrompt, buildUrlMetadataPrompt } from '@/lib/ai/prompts';
import { fetchTopicImage } from '@/lib/services/unsplash-service';
import { extractYouTubeVideoId } from '@/lib/utils/clip-content';
import { CATEGORY_COLORS } from '@/config/constants';
import type { Category, Tag } from '@/types/database';

// Raw client bypasses the Database generic for tables whose Insert types
// resolve to `never` due to @supabase/supabase-js v2.49 schema constraints.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ClipContentInput {
  url: string;
  sourceType: 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter';
  /** Detected platform for DB storage (e.g. 'threads', 'github', 'naver'). Falls back to sourceType mapping. */
  platform?: string;
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

// extractYouTubeVideoId is imported from @/lib/utils/clip-content (single source of truth)
export { extractYouTubeVideoId };

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
    const missingNames: string[] = [];

    for (const keyword of keywords) {
      const lc = keyword.toLowerCase().trim();
      if (!lc) continue;

      const tagId = tagMap.get(lc);
      if (tagId) {
        tagIds.push(tagId);
      } else {
        missingNames.push(lc);
      }
    }

    // Batch-insert all missing tags at once (N+1 → 1 query)
    if (missingNames.length > 0) {
      const { error } = await db
        .from('tags')
        .upsert(
          missingNames.map((name) => ({ name })),
          { onConflict: 'name', ignoreDuplicates: true },
        );

      if (error) {
        console.warn('[AutoTag] batch tag upsert error:', error);
      }

      // Re-query to get IDs for newly created tags
      const { data: newTags } = await db
        .from('tags')
        .select('id, name')
        .in('name', missingNames);

      for (const t of (newTags ?? []) as Pick<Tag, 'id' | 'name'>[]) {
        tagIds.push(t.id);
        tagMap.set(t.name.toLowerCase(), t.id);
      }
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

// ─── Platform helpers ─────────────────────────────────────────────────────────

const PLATFORM_FALLBACK: Record<string, string> = {
  instagram: 'instagram',
  threads: 'threads',
  youtube: 'youtube',
  web: 'web',
  twitter: 'twitter',
};

const DB_VALID_PLATFORMS = new Set([
  'web', 'twitter', 'youtube', 'github', 'medium', 'substack',
  'reddit', 'linkedin', 'instagram', 'tiktok', 'threads', 'naver', 'pinterest', 'image', 'other',
]);

/** Resolve a detected platform string to a DB-safe value */
export const resolveDbPlatform = (
  detectedPlatform: string | undefined,
  sourceType: string
): string => {
  const raw = detectedPlatform ?? PLATFORM_FALLBACK[sourceType] ?? 'other';
  return DB_VALID_PLATFORMS.has(raw) ? raw : 'other';
};

// ─── Content preparation helpers ──────────────────────────────────────────────

// Skip likely profile pictures and low-res thumbnails (Instagram/Threads CDN patterns)
// Ref: Linkbrain v1 filterClipImages() — s150x150, p150x150, profile pics, avatars
const isLowQualityThumb = (u: string) => {
  const lower = u.toLowerCase();
  // Size-based patterns in path (/s150x150/) or query params (_s150x150_)
  if (/[/_]s\d{2,3}x\d{2,3}[/_]/.test(u)) return true;
  if (/[/_]p\d{2,3}x\d{2,3}[/_]/.test(u)) return true;
  // Profile picture path (Instagram/Threads CDN)
  if (/t51\.2885-19/.test(u)) return true;
  // Keyword-based (v1 BLOCKED_KEYWORDS)
  if (lower.includes('profile') || lower.includes('avatar')) return true;
  // Format-based
  if (lower.endsWith('.svg') || lower.endsWith('.ico')) return true;
  return false;
};

/** Prepare images, content, and thumbnail from raw input */
function prepareClipContent(input: ClipContentInput, metadata: ClipMetadata | null, language: string) {
  const { url, sourceType, rawText, htmlContent, images } = input;
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
  // Filter out profile pictures and low-quality thumbnails before gallery (v1 filterClipImages logic)
  clipImages = clipImages.filter((u) => !isLowQualityThumb(u));
  // Deduplicate by URL path (ignore query params)
  const seenPaths = new Set<string>();
  clipImages = clipImages.filter((u) => {
    const path = u.split('?')[0];
    if (seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
  clipImages = clipImages.slice(0, MAX_IMAGES);

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

  if (clipImages.length > 1) {
    displayMarkdown += `\n\n<!-- CLIP_GALLERY:${clipImages.join('|')} -->`;
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

  // After filtering, first image is the best candidate for thumbnail
  const thumbnailImage = clipImages[0] ?? null;

  return { title, summary, keywords, categoryName, thumbnailImage, truncRaw, truncDisplay, truncHtml };
}

// ─── Enrichment function (for background processing) ─────────────────────────

export interface EnrichClipContentInput {
  clipId: string;
  url: string;
  sourceType: 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter';
  platform?: string;
  rawText?: string;
  htmlContent?: string;
  images?: string[];
  userId: string;
  author?: string;
  authorAvatar?: string;
  authorHandle?: string;
  embeddedLinks?: Array<{ label: string; url: string }>;
}

/**
 * Enrich an existing clip with AI metadata + content.
 * Used by the background processing pipeline.
 *
 * Steps:
 * 1. Generate AI metadata from rawText (or URL fallback)
 * 2. Get or create category
 * 3. UPDATE clips row (title, summary, image, category, status)
 * 4. INSERT clip_contents row
 * 5. Auto-tag + embedding (fire-and-forget)
 */
export const enrichClipContent = async (
  input: EnrichClipContentInput,
  options?: { language?: string }
): Promise<ProcessNewClipResult> => {
  const { clipId, url, sourceType, userId } = input;
  const language = options?.language ?? 'KR';
  const rawMarkdown = input.rawText ?? '';
  const aiPlatform = input.platform || sourceType;

  // AI metadata
  let metadata: ClipMetadata | null = null;
  if (rawMarkdown.trim().length > 0) {
    metadata = await generateClipMetadata(rawMarkdown, url, aiPlatform, language);
  }
  if (!metadata) {
    metadata = await generateMetadataFromUrl(url, aiPlatform, language);
  }

  const prepared = prepareClipContent(
    { ...input, url, sourceType, userId },
    metadata,
    language
  );

  // Unsplash fallback: if no content image, fetch a topic-related photo
  let thumbnailImage: string | null = prepared.thumbnailImage;
  if (!thumbnailImage && prepared.keywords.length > 0) {
    thumbnailImage = await fetchTopicImage(prepared.keywords);
  }

  const categoryId = await getOrCreateCategory(userId, prepared.categoryName);

  // UPDATE existing clip row with enriched data
  const { error: updateError } = await db
    .from('clips')
    .update({
      title: prepared.title,
      summary: prepared.summary,
      image: thumbnailImage,
      category_id: categoryId,
      author: input.author ?? null,
      author_handle: input.authorHandle ?? null,
      author_avatar: input.authorAvatar ?? null,
      processing_status: 'ready',
      processing_error: null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', clipId);

  if (updateError) {
    console.error('[ClipService] Enrich update error:', updateError);
    throw new Error(`Failed to enrich clip: ${updateError.message}`);
  }

  // INSERT clip_contents
  const { error: contentError } = await db
    .from('clip_contents')
    .insert({
      clip_id: clipId,
      html_content: prepared.truncHtml || null,
      content_markdown: prepared.truncDisplay || null,
      raw_markdown: prepared.truncRaw || null,
    });

  if (contentError) {
    console.error('[ClipService] clip_contents insert error:', contentError);
  }

  // Auto-tag (non-fatal)
  autoTagClip(clipId, prepared.keywords).catch((err) =>
    console.error('[ClipService] autoTagClip failed:', err)
  );

  // Embedding (non-fatal, fire-and-forget)
  indexClipEmbedding({
    clipId,
    title: prepared.title,
    summary: prepared.summary,
    rawText: prepared.truncRaw,
  }).catch((err) => console.error('[ClipService] Embedding failed:', err));

  return {
    clipId,
    title: prepared.title,
    summary: prepared.summary,
    keywords: prepared.keywords,
    categoryId,
  };
};

// ─── Legacy main entry point (backward-compatible) ───────────────────────────

/**
 * Main entry point: process a new clip from raw content.
 * Creates a new clip row + enriches it in one call.
 * Kept for backward compatibility.
 */
export const processNewClip = async (
  input: ClipContentInput,
  options?: { language?: string }
): Promise<ProcessNewClipResult> => {
  const { url, sourceType, rawText, userId, author, authorAvatar, authorHandle } = input;
  const language = options?.language ?? 'KR';

  const rawMarkdown = rawText ?? '';
  const aiPlatform = input.platform || sourceType;

  // AI metadata
  let metadata: ClipMetadata | null = null;
  if (rawMarkdown.trim().length > 0) {
    metadata = await generateClipMetadata(rawMarkdown, url, aiPlatform, language);
  }
  if (!metadata) {
    metadata = await generateMetadataFromUrl(url, aiPlatform, language);
  }

  const prepared = prepareClipContent(input, metadata, language);

  // Unsplash fallback: if no content image, fetch a topic-related photo
  let thumbnailImage: string | null = prepared.thumbnailImage;
  if (!thumbnailImage && prepared.keywords.length > 0) {
    thumbnailImage = await fetchTopicImage(prepared.keywords);
  }

  const categoryId = await getOrCreateCategory(userId, prepared.categoryName);
  const platform = resolveDbPlatform(input.platform, sourceType);

  const { data: clipRow, error: clipError } = await db
    .from('clips')
    .insert({
      user_id: userId,
      url,
      title: prepared.title,
      summary: prepared.summary,
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
      processing_status: 'ready',
      processed_at: new Date().toISOString(),
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
      html_content: prepared.truncHtml || null,
      content_markdown: prepared.truncDisplay || null,
      raw_markdown: prepared.truncRaw || null,
    });

  if (contentError) {
    console.error('[ClipService] clip_contents insert error:', contentError);
  }

  // Auto-tag asynchronously (non-fatal)
  autoTagClip(clipId, prepared.keywords).catch((err) =>
    console.error('[ClipService] autoTagClip failed:', err)
  );

  // Generate embedding asynchronously (non-fatal, fire-and-forget)
  indexClipEmbedding({
    clipId,
    title: prepared.title,
    summary: prepared.summary,
    rawText: prepared.truncRaw,
  }).catch((err) => console.error('[ClipService] Embedding failed:', err));

  return { clipId, title: prepared.title, summary: prepared.summary, keywords: prepared.keywords, categoryId };
};
