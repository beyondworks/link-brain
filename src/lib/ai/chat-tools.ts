/**
 * AI Chat Tools — OpenAI function calling definitions + server-side executors
 *
 * Mirrors Linkbrain MCP server tools (read-only subset) for use in the
 * built-in AI chat. GPT decides which tools to call based on user queries.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { searchSimilarClips } from '@/lib/services/embedding-service';

const db = supabaseAdmin;

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
  {
    type: 'function' as const,
    function: {
      name: 'create_collection',
      description: '새 컬렉션을 생성합니다.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '컬렉션 이름' },
          description: { type: 'string', description: '컬렉션 설명 (선택)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_clip_notes',
      description: '클립에 메모를 추가하거나 수정합니다.',
      parameters: {
        type: 'object',
        properties: {
          clipId: { type: 'string', description: '클립 ID' },
          notes: { type: 'string', description: '메모 내용' },
        },
        required: ['clipId', 'notes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_duplicate_clips',
      description: '중복된 URL을 가진 클립을 찾습니다.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '결과 수 (기본 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_clip_stats',
      description: '사용자의 클립 통계 요약을 제공합니다. 총 클립 수, 카테고리별 분포, 최근 저장 추이 등.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_action',
      description: '클립에 대한 변경 작업을 제안합니다. 실제로 실행하지 않고, 사용자에게 확인을 요청합니다. 클립을 이동/아카이브/컬렉션 추가/태그 일괄 추가 등 변경 전에 반드시 이 도구를 먼저 호출하세요.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['move_to_category', 'add_to_collection', 'archive', 'unarchive', 'favorite', 'unfavorite', 'bulk_tag'],
            description: '수행할 작업 유형',
          },
          clipIds: {
            type: 'array',
            items: { type: 'string' },
            description: '대상 클립 ID 목록 (최대 50개)',
          },
          targetName: {
            type: 'string',
            description: '이동 대상 카테고리명 또는 컬렉션명 (move/collection 시)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '추가할 태그 목록 (bulk_tag 시)',
          },
          description: {
            type: 'string',
            description: '사용자에게 보여줄 작업 설명 (한국어)',
          },
        },
        required: ['action', 'clipIds', 'description'],
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
      case 'create_collection':
        return await execCreateCollection(userId, args);
      case 'update_clip_notes':
        return await execUpdateClipNotes(userId, args);
      case 'find_duplicate_clips':
        return await execFindDuplicateClips(userId, args);
      case 'get_clip_stats':
        return await execGetClipStats(userId);
      case 'propose_action':
        return await execProposeAction(userId, args);
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
  const escaped = query.replace(/[%_\\]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const escapedQuery = query.replace(/["\\]/g, '\\$&');
  const { data: fallback, error: fbErr } = await db
    .from('clips')
    .select('id, title, summary, url, platform, created_at, keywords')
    .eq('user_id', userId)
    .or(`title.ilike.${pattern},summary.ilike.${pattern},keywords.cs.{"${escapedQuery}"}`)
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
    .select('keywords' as 'id')
    .eq('user_id', userId)
    .not('keywords' as 'id', 'is', null)
    .limit(500);

  if (error) return JSON.stringify({ error: error.message });

  // Aggregate tags
  const tagMap = new Map<string, number>();
  for (const clip of (data ?? []) as unknown as Array<{ keywords: string[] | null }>) {
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

async function execCreateCollection(userId: string, args: ToolArgs): Promise<string> {
  const name = String(args.name ?? '').trim();
  if (!name) return JSON.stringify({ error: 'name is required' });

  const description = typeof args.description === 'string' ? args.description.trim() : null;

  const { data, error } = await db
    .from('collections')
    .insert({
      user_id: userId,
      name,
      ...(description ? { description } : {}),
    })
    .select('id, name, description, created_at')
    .single();

  if (error) return JSON.stringify({ error: error.message });

  return JSON.stringify({
    success: true,
    collection: data,
    message: `"${name}" 컬렉션을 생성했습니다.`,
  });
}

async function execUpdateClipNotes(userId: string, args: ToolArgs): Promise<string> {
  const clipId = String(args.clipId ?? '').trim();
  const notes = String(args.notes ?? '');

  if (!clipId) return JSON.stringify({ error: 'clipId is required' });

  // Verify ownership
  const { data: clip, error: findErr } = await db
    .from('clips')
    .select('id')
    .eq('id', clipId)
    .eq('user_id', userId)
    .single();

  if (findErr || !clip) return JSON.stringify({ error: '클립을 찾을 수 없거나 접근 권한이 없습니다.' });

  const { error } = await db
    .from('clips')
    .update({ notes } as never)
    .eq('id', clipId)
    .eq('user_id', userId);

  if (error) return JSON.stringify({ error: error.message });

  return JSON.stringify({
    success: true,
    clipId,
    message: '메모를 업데이트했습니다.',
  });
}

async function execFindDuplicateClips(userId: string, args: ToolArgs): Promise<string> {
  const limit = Math.min(Number(args.limit) || 10, 30);

  // Fetch all clips with URLs, then group in memory
  const { data, error } = await db
    .from('clips')
    .select('id, title, url, created_at')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .not('url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return JSON.stringify({ error: error.message });

  const urlMap = new Map<string, Array<{ id: string; title: string | null; created_at: string }>>();
  for (const clip of (data ?? []) as Array<{ id: string; title: string | null; url: string; created_at: string }>) {
    const normalized = clip.url.replace(/\/+$/, '').toLowerCase();
    const group = urlMap.get(normalized) ?? [];
    group.push({ id: clip.id, title: clip.title, created_at: clip.created_at });
    urlMap.set(normalized, group);
  }

  const duplicates = Array.from(urlMap.entries())
    .filter(([, group]) => group.length > 1)
    .slice(0, limit)
    .map(([url, clips]) => ({ url, count: clips.length, clips }));

  return JSON.stringify({
    duplicates,
    totalDuplicateGroups: duplicates.length,
    totalDuplicateClips: duplicates.reduce((sum, d) => sum + d.count, 0),
  });
}

async function execGetClipStats(userId: string): Promise<string> {
  // Total clips
  const { count: totalClips } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_archived', false);

  // Archived count
  const { count: archivedClips } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_archived', true);

  // Favorites count
  const { count: favoriteClips } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_favorite', true)
    .eq('is_archived', false);

  // Per category
  const { data: categories } = await db
    .from('categories')
    .select('name, clips(count)')
    .eq('user_id', userId)
    .order('name');

  const categoryStats = (categories ?? []).map((c: Record<string, unknown>) => {
    const counts = c.clips;
    const clipCount = Array.isArray(counts) ? (counts[0] as { count: number })?.count ?? 0 : 0;
    return { name: c.name as string, count: clipCount };
  }).filter((c) => c.count > 0);

  // Per platform
  const { data: platformData } = await db
    .from('clips')
    .select('platform')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .limit(2000);

  const platformMap = new Map<string, number>();
  for (const clip of (platformData ?? []) as Array<{ platform: string | null }>) {
    const p = clip.platform ?? 'unknown';
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
  }
  const platformStats = Array.from(platformMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({ platform, count }));

  // This week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: thisWeek } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString());

  // This month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const { count: thisMonth } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthAgo.toISOString());

  return JSON.stringify({
    total: totalClips ?? 0,
    archived: archivedClips ?? 0,
    favorites: favoriteClips ?? 0,
    thisWeek: thisWeek ?? 0,
    thisMonth: thisMonth ?? 0,
    byCategory: categoryStats,
    byPlatform: platformStats,
  });
}

async function execProposeAction(userId: string, args: ToolArgs): Promise<string> {
  const action = String(args.action ?? '');
  const clipIds = Array.isArray(args.clipIds) ? (args.clipIds as string[]).slice(0, 50) : [];
  const targetName = typeof args.targetName === 'string' ? args.targetName : undefined;
  const tags = Array.isArray(args.tags) ? (args.tags as string[]).slice(0, 20) : [];
  const description = String(args.description ?? '');

  if (!action || clipIds.length === 0 || !description) {
    return JSON.stringify({ error: 'action, clipIds, description are required' });
  }

  if (action === 'bulk_tag' && tags.length === 0) {
    return JSON.stringify({ error: 'bulk_tag action requires tags array' });
  }

  // Verify clip ownership and fetch titles
  const { data: ownedClips, error: clipErr } = await db
    .from('clips')
    .select('id, title, url')
    .eq('user_id', userId)
    .in('id', clipIds);

  if (clipErr) return JSON.stringify({ error: clipErr.message });

  const clips = ((ownedClips as Array<{ id: string; title: string | null; url: string }>) ?? []).map((c) => ({
    id: c.id,
    title: c.title ?? c.url,
  }));

  if (clips.length === 0) {
    return JSON.stringify({ error: '대상 클립을 찾을 수 없거나 접근 권한이 없습니다.' });
  }

  // Verify target exists for move/collection actions
  let targetId: string | null = null;
  let targetExists = true;

  if (action === 'move_to_category' && targetName) {
    const { data: cat } = await db
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', targetName)
      .limit(1)
      .single();
    if (cat) {
      targetId = (cat as { id: string }).id;
    } else {
      targetExists = false;
    }
  } else if (action === 'add_to_collection' && targetName) {
    const { data: col } = await db
      .from('collections')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', targetName)
      .limit(1)
      .single();
    if (col) {
      targetId = (col as { id: string }).id;
    } else {
      targetExists = false;
    }
  }

  return JSON.stringify({
    __type: 'pending_action',
    action,
    description,
    targetName: targetName ?? null,
    targetId,
    targetExists,
    ...(tags.length > 0 ? { tags } : {}),
    clips,
    clipCount: clips.length,
  });
}
