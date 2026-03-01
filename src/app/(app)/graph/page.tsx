'use client';

/**
 * 지식 그래프 페이지
 *
 * 사용자 클립 간 임베딩 유사도 기반 그래프를 시각화합니다.
 * 플랫폼별 필터와 유사도 임계값 슬라이더를 제공합니다.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { GitGraph, Loader2 } from 'lucide-react';
import { KnowledgeGraph } from '@/components/graph/knowledge-graph';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GraphNode, GraphEdge } from '@/app/api/v1/graph/route';

const PLATFORM_LABELS: Record<string, string> = {
  all: '전체 플랫폼',
  twitter: 'Twitter',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  medium: 'Medium',
  substack: 'Substack',
  reddit: 'Reddit',
  web: 'Web',
  other: '기타',
};

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });

  // 필터 상태
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [minSimilarity, setMinSimilarity] = useState<number>(0.7);

  useEffect(() => {
    async function fetchGraph() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/graph');
        if (!res.ok) throw new Error('그래프 데이터를 불러오지 못했습니다');
        const json = (await res.json()) as { success: boolean; data: GraphData };
        if (!json.success) throw new Error('그래프 데이터를 불러오지 못했습니다');
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    }
    void fetchGraph();
  }, []);

  // 플랫폼 목록 (실제 데이터 기준)
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(data.nodes.map((n) => n.platform ?? 'web'));
    return ['all', ...Array.from(platforms)];
  }, [data.nodes]);

  // 필터 적용
  const filteredNodes = useMemo(() => {
    if (platformFilter === 'all') return data.nodes;
    return data.nodes.filter((n) => (n.platform ?? 'web') === platformFilter);
  }, [data.nodes, platformFilter]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    return data.edges.filter(
      (e) =>
        filteredNodeIds.has(e.source) &&
        filteredNodeIds.has(e.target) &&
        e.similarity >= minSimilarity
    );
  }, [data.edges, filteredNodeIds, minSimilarity]);

  const stats = {
    totalClips: data.nodes.length,
    visibleClips: filteredNodes.length,
    connections: filteredEdges.length,
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <GitGraph className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">지식 그래프</h1>
        </div>

        {/* 통계 뱃지 */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            클립 {stats.visibleClips}
            {stats.visibleClips !== stats.totalClips && ` / ${stats.totalClips}`}개
          </Badge>
          <Badge variant="outline" className="text-xs">
            연결 {stats.connections}개
          </Badge>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="flex shrink-0 items-center gap-4 border-b bg-muted/30 px-4 py-2">
        {/* 플랫폼 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">플랫폼</span>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePlatforms.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {PLATFORM_LABELS[p] ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 유사도 임계값 슬라이더 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">유사도</span>
          <input
            type="range"
            min={0.7}
            max={0.99}
            step={0.01}
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
            className="h-1.5 w-28 cursor-pointer accent-primary"
          />
          <span className="w-10 text-xs font-medium tabular-nums text-foreground">
            {Math.round(minSimilarity * 100)}%+
          </span>
        </div>
      </div>

      {/* 그래프 영역 */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">그래프 데이터를 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs underline hover:no-underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <KnowledgeGraph
            graphNodes={filteredNodes}
            graphEdges={filteredEdges}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
