/**
 * AI Chat Tools — OpenAI function calling definitions + server-side executors
 *
 * Mirrors Linkbrain MCP server tools (read-only subset) for use in the
 * built-in AI chat. GPT decides which tools to call based on user queries.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { searchSimilarClips } from '@/lib/services/embedding-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── OpenAI Tool Definitions ────────────────────────────────────────────────

export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_clips',
      description: '키워드로 클립을 검색합니다. 제목, 요약, 콘텐츠에서 전문 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 키워드' },
          limit: { type: 'number', description: '결과 수 (기본 10, 최대 20)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_similar_clips',
      description: '의미적으로 유사한 클립을 임베딩 벡터로 검색합니다. 키워드 매칭이 아닌 의미 기반 검색입니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색할 내용 또는 주제' },
          limit: { type: 'number', description: '결과 수 (기본 8)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_clip_content',
      description: '특정 클립의 전체 원문 콘텐츠를 가져옵니다. 클립 ID가 필요합니다.',
      parameters: {
        type: 'object',
        properties: {
          clipId: { type: 'string', description: '클립 ID' },
        },
        required: ['clipId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_clips',
      description: '클립 목록을 조회합니다. 카테고리, 플랫폼, 즐겨찾기, 날짜 등으로 필터링할 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '카테고리 이름으로 필터' },
          platform: { type: 'string', description: '플랫폼 필터 (youtube, twitter, instagram, threads, web)' },
          isFavorite: { type: 'boolean', description: '즐겨찾기만 표시' },
          isReadLater: { type: 'boolean', description: '나중에 읽기만 표시' },
          limit: { type: 'number', description: '결과 수 (기본 10, 최대 20)' },
          sort: { type: 'string', enum: ['created_at', 'title'], description: '정렬 기준' },
          order: { type: 'string', enum: ['asc', 'desc'], description: '정렬 순서' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_collections',
      description: '사용자의 모든 컬렉션(폴더) 목록과 각 컬렉션의 클립 수를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_categories',
      description: '사용자의 모든 카테고리 목록과 각 카테고리의 클립 수를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_tags',
      description: '사용자의 클립에 사용된 태그(키워드) 목록을 빈도순으로 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '최대 태그 수 (기본 30)' },
        },
      },
    },
  },
] as const;

// ─── Tool Executors ─────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

export async function executeTool(
  toolName: string,
  args: ToolArgs,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'search_clips':
        return await execSearchClips(userId, args);
      case 'find_similar_clips':
        return await execFindSimilar(userId, args);
      case 'get_clip_content':
        return await execGetClipContent(userId, args);
      case 'list_clips':
        return await execListClips(userId, args);
      case 'list_collections':
        return await execListCollections(userId);
      case 'list_categories':
        return await execListCategories(userId);
      case 'list_tags':
        return await execListTags(userId, args);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return JSON.stringify({ error: message });
  }
}

// ─── Individual Executors ───────────────────────────────────────────────────

async function execSearchClips(userId: string, args: ToolArgs): Promise<string> {
  const query = String(args.query ?? '');
  const limit = Math.min(Number(args.limit) || 10, 20);

  // Try FTS first, fall back to ilike if FTS fails or returns empty
  const { data, error } = await db
    .from('clips')
    .select('id, title, summary, url, platform, created_at, keywords')
    .eq('user_id', userId)
    .textSearch('fts', query, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error && data && data.length > 0) {
    return JSON.stringify({ clips: data, count: data.length });
  }

  // Fallback: ilike search on title, summary, and keywords array
  const pattern = `%${query}%`;
  const { data: fallback, error: fbErr } = await db
    .from('clips')
    .select('id, title, summary, url, platform, created_at, keywords')
    .eq('user_id', userId)
    .or(`title.ilike.${pattern},summary.ilike.${pattern},keywords.cs.{"${query}"}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fbErr) return JSON.stringify({ error: fbErr.message });
  return JSON.stringify({ clips: fallback ?? [], count: (fallback ?? []).length });
}

async function execFindSimilar(userId: string, args: ToolArgs): Promise<string> {
  const query = String(args.query ?? '');
  const limit = Math.min(Number(args.limit) || 8, 15);

  const results = await searchSimilarClips(userId, query, limit);
  if (results.length === 0) {
    return JSON.stringify({ clips: [], count: 0, note: 'No similar clips found' });
  }

  // Fetch clip details
  const clipIds = results.map((r) => r.clipId);
  const { data: clips } = await db
    .from('clips')
    .select('id, title, summary, url, platform')
    .in('id', clipIds);

  const enriched = results.map((r) => {
    const clip = (clips ?? []).find((c: { id: string }) => c.id === r.clipId);
    return { ...clip, similarity: r.similarity };
  });

  return JSON.stringify({ clips: enriched, count: enriched.length });
}

async function execGetClipContent(userId: string, args: ToolArgs): Promise<string> {
  const clipId = String(args.clipId ?? '');

  const { data: clip, error } = await db
    .from('clips')
    .select('id, title, summary, url, clip_contents(content_markdown, raw_markdown)')
    .eq('id', clipId)
    .eq('user_id', userId)
    .single();

  if (error || !clip) return JSON.stringify({ error: 'Clip not found' });

  const row = clip as {
    id: string;
    title: string | null;
    summary: string | null;
    url: string;
    clip_contents: { content_markdown: string | null; raw_markdown: string | null } | null;
  };

  const content = row.clip_contents?.content_markdown ?? row.clip_contents?.raw_markdown ?? '';

  return JSON.stringify({
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary,
    content: content.substring(0, 4000), // Limit to avoid token overflow
  });
}

async function execListClips(userId: string, args: ToolArgs): Promise<string> {
  const limit = Math.min(Number(args.limit) || 10, 20);
  const sort = String(args.sort || 'created_at');
  const order = String(args.order || 'desc');

  let query = db
    .from('clips')
    .select('id, title, summary, url, platform, created_at, is_favorite, is_read_later, keywords, categories(name)')
    .eq('user_id', userId)
    .eq('is_archived', false);

  if (args.category) {
    // Join through categories
    const { data: cats } = await db
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${String(args.category)}%`);
    if (cats && cats.length > 0) {
      query = query.in('category_id', (cats as Array<{ id: string }>).map((c) => c.id));
    }
  }
  if (args.platform) query = query.eq('platform', String(args.platform));
  if (args.isFavorite) query = query.eq('is_favorite', true);
  if (args.isReadLater) query = query.eq('is_read_later', true);

  query = query.order(sort, { ascending: order === 'asc' }).limit(limit);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });

  return JSON.stringify({ clips: data ?? [], count: (data ?? []).length });
}

async function execListCollections(userId: string): Promise<string> {
  const { data, error } = await db
    .from('collections')
    .select('id, name, color, created_at, clip_collections(count)')
    .eq('user_id', userId)
    .order('name');

  if (error) return JSON.stringify({ error: error.message });

  const collections = (data ?? []).map((c: Record<string, unknown>) => {
    const counts = c.clip_collections;
    const clipCount = Array.isArray(counts) ? (counts[0] as { count: number })?.count ?? 0 : 0;
    return { id: c.id, name: c.name, color: c.color, clipCount };
  });

  return JSON.stringify({ collections, count: collections.length });
}

async function execListCategories(userId: string): Promise<string> {
  const { data, error } = await db
    .from('categories')
    .select('id, name, color, clips(count)')
    .eq('user_id', userId)
    .order('name');

  if (error) return JSON.stringify({ error: error.message });

  const categories = (data ?? []).map((c: Record<string, unknown>) => {
    const counts = c.clips;
    const clipCount = Array.isArray(counts) ? (counts[0] as { count: number })?.count ?? 0 : 0;
    return { id: c.id, name: c.name, color: c.color, clipCount };
  });

  return JSON.stringify({ categories, count: categories.length });
}

async function execListTags(userId: string, args: ToolArgs): Promise<string> {
  const limit = Math.min(Number(args.limit) || 30, 100);

  const { data, error } = await db
    .from('clips')
    .select('keywords')
    .eq('user_id', userId)
    .not('keywords', 'is', null)
    .limit(500);

  if (error) return JSON.stringify({ error: error.message });

  // Aggregate tags
  const tagMap = new Map<string, number>();
  for (const clip of (data ?? []) as Array<{ keywords: string[] | null }>) {
    if (!clip.keywords) continue;
    for (const tag of clip.keywords) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const tags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

  return JSON.stringify({ tags, count: tags.length });
}
