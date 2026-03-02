'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GitGraph, Loader2 } from 'lucide-react';

const KnowledgeGraph = dynamic(
  () => import('@/components/graph/knowledge-graph').then((m) => ({ default: m.KnowledgeGraph })),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
);
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

  const availablePlatforms = useMemo(() => {
    const platforms = new Set(data.nodes.map((n) => n.platform ?? 'web'));
    return ['all', ...Array.from(platforms)];
  }, [data.nodes]);

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
    <div className="flex h-[calc(100vh-4rem)] flex-col animate-blur-in">
      {/* Control bar — glassmorphism */}
      <div className="bg-glass shrink-0 border-b border-border/60 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          {/* Left: title + filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="icon-glow relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                <GitGraph className="h-4 w-4 animate-breathe text-primary" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">지식 그래프</h1>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Platform filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">플랫폼</span>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="h-7 w-32 rounded-lg text-xs focus:ring-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availablePlatforms.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {PLATFORM_LABELS[p] ?? p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Similarity slider */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">유사도</span>
              <input
                type="range"
                min={0.7}
                max={0.99}
                step={0.01}
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                className="h-1.5 w-24 cursor-pointer accent-primary"
              />
              <span className="w-9 text-xs font-medium tabular-nums text-foreground">
                {Math.round(minSimilarity * 100)}%+
              </span>
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="rounded-lg border border-primary/20 bg-primary/10 text-xs px-2 py-0.5 text-primary font-medium"
            >
              클립 {stats.visibleClips}
              {stats.visibleClips !== stats.totalClips && `/${stats.totalClips}`}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-lg text-xs px-2 py-0.5"
            >
              연결 {stats.connections}
            </Badge>
          </div>
        </div>

        {/* Mobile similarity slider */}
        <div className="mt-2 flex sm:hidden items-center gap-1.5">
          <span className="text-xs text-muted-foreground">유사도</span>
          <input
            type="range"
            min={0.7}
            max={0.99}
            step={0.01}
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-9 text-xs font-medium tabular-nums text-foreground">
            {Math.round(minSimilarity * 100)}%+
          </span>
        </div>
      </div>

      {/* Graph area */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="bg-glass absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="card-glow card-inner-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">그래프 데이터를 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                <GitGraph className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-spring hover:bg-muted hover:text-foreground hover-lift"
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
