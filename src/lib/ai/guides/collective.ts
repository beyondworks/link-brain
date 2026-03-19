/**
 * Collective Learning — loads aggregated content patterns and similar clips
 * to enrich content generation prompts.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { searchSimilarClips } from '@/lib/services/embedding-service';

const db = supabaseAdmin;

export async function loadCollectivePatterns(
  category: string,
  sourceClipIds: string[],
  userId: string
): Promise<string> {
  // 1. Load aggregated patterns for this category
  // content_patterns table not yet in generated types — cast to bypass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pattern } = await (db.from as (t: string) => any)('content_patterns')
    .select('*')
    .eq('category', category.toLowerCase())
    .is('platform', null)
    .maybeSingle();

  // 2. Find similar popular clips via embedding search
  let similarStructures = '';
  if (sourceClipIds.length > 0) {
    try {
      // Fetch the source clip title to use as search query
      const { data: sourceClip } = await db
        .from('clips')
        .select('title, summary')
        .eq('id', sourceClipIds[0])
        .single();

      const query = (sourceClip as { title: string | null; summary: string | null } | null)?.title
        ?? (sourceClip as { title: string | null; summary: string | null } | null)?.summary
        ?? '';

      if (query) {
        const similar = await searchSimilarClips(userId, query, 3);
        if (similar.length > 0) {
          // Fetch titles for the similar clips
          const similarIds = similar.map((s) => s.clipId);
          const { data: similarClips } = await db
            .from('clips')
            .select('id, title')
            .in('id', similarIds);

          const titleMap = new Map(
            ((similarClips as Array<{ id: string; title: string | null }>) ?? []).map((c) => [c.id, c.title])
          );

          similarStructures = similar
            .map((s) => {
              const title = titleMap.get(s.clipId) ?? '(제목 없음)';
              return `- "${title}" (유사도 ${Math.round(s.similarity * 100)}%)`;
            })
            .join('\n');
        }
      }
    } catch {
      /* embedding not available — skip silently */
    }
  }

  if (!pattern && !similarStructures) return '';

  let result = '\n[집단 학습 데이터 — 실제 유저 클립 패턴 분석]\n';

  if (pattern) {
    const p = pattern as Record<string, unknown>;
    result += `분석 샘플: ${p.sample_count}개 클립\n`;
    result += `평균 글자수: ${p.avg_char_count}자\n`;
    result += `평균 단락수: ${p.avg_paragraph_count}개\n`;
    result += `평균 소제목수: ${p.avg_heading_count}개\n`;
    result += `평균 제목길이: ${p.avg_title_length}자\n`;

    const intro = p.intro_patterns as Record<string, number> | null;
    if (intro && Object.keys(intro).length > 0) {
      const sorted = Object.entries(intro).sort((a, b) => b[1] - a[1]);
      result += `도입부 패턴: ${sorted.map(([t, r]) => `${t} ${Math.round(r * 100)}%`).join(', ')}\n`;
    }

    const keywords = p.top_keywords as string[] | null;
    if (keywords && keywords.length > 0) {
      result += `인기 키워드: ${keywords.slice(0, 5).join(', ')}\n`;
    }
  }

  if (similarStructures) {
    result += `\n참고할 유사 인기 클립:\n${similarStructures}\n`;
  }

  return result;
}
