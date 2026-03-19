/**
 * API v1 - Knowledge Graph
 *
 * GET /api/v1/graph
 * 사용자 클립과 임베딩 유사도 기반 그래프 데이터를 반환합니다.
 * 최대 100개 클립, similarity > 0.7인 엣지만 포함합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { checkFeatureAccess } from '@/lib/services/plan-service';
import type { ClipData } from '@/types/database';

const db = supabaseAdmin;

export interface GraphNode {
  id: string;
  title: string | null;
  url: string;
  platform: string | null;
  summary: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

async function handleGet(_req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const featureCheck = await checkFeatureAccess(auth.publicUserId, 'knowledge_graph');
  if (!featureCheck.allowed) {
    return errors.featureNotAvailable('knowledge_graph');
  }

  // 1. 사용자 클립 최대 100개 조회 (아카이브 제외)
  const { data: clipsData, error: clipsErr } = await db
    .from('clips')
    .select('id, title, url, platform, summary')
    .eq('user_id', auth.publicUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (clipsErr) {
    console.error('[API v1 Graph] Clips fetch error:', clipsErr);
    return errors.internalError();
  }

  const clips = ((clipsData as Array<Pick<ClipData, 'id' | 'title' | 'url' | 'platform' | 'summary'>>) ?? []);

  if (clips.length === 0) {
    return sendSuccess<GraphData>({ nodes: [], edges: [] });
  }

  const nodes: GraphNode[] = clips.map((clip) => ({
    id: clip.id,
    title: clip.title,
    url: clip.url,
    platform: clip.platform,
    summary: clip.summary,
  }));

  // 2. pgvector RPC로 각 클립의 관련 클립을 조회하여 엣지 구성
  // 중복 엣지 방지를 위해 Set 사용 (source < target 정렬)
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  const clipIds = new Set(clips.map((c) => c.id));

  // 클립이 많을 경우 모든 조합을 다 조회하면 느리므로 상위 30개에 대해서만 RPC 호출
  const sampleClips = clips.slice(0, 30);

  await Promise.allSettled(
    sampleClips.map(async (clip) => {
      try {
        const { data: rpcData, error: rpcErr } = await db.rpc('find_related_clips', {
          p_clip_id: clip.id,
          p_user_id: auth.publicUserId,
          p_limit: 10,
          p_min_similarity: 0.7,
        });

        if (rpcErr || !rpcData || !Array.isArray(rpcData)) return;

        for (const row of rpcData as Array<{ clip_id: string; similarity: number }>) {
          // 그래프 내 노드인지 확인
          if (!clipIds.has(row.clip_id)) continue;

          // 중복 엣지 방지
          const [a, b] = clip.id < row.clip_id ? [clip.id, row.clip_id] : [row.clip_id, clip.id];
          const key = `${a}::${b}`;
          if (edgeSet.has(key)) continue;

          edgeSet.add(key);
          edges.push({
            source: clip.id,
            target: row.clip_id,
            similarity: row.similarity,
          });
        }
      } catch {
        // 개별 RPC 실패는 무시하고 계속 진행
      }
    })
  );

  return sendSuccess<GraphData>({ nodes, edges });
}

const routeHandler = withAuth(
  async (req, auth) => handleGet(req, auth),
  { allowedMethods: ['GET'] }
);

export const GET = routeHandler;
export const OPTIONS = routeHandler;
