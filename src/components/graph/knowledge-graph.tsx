'use client';

/**
 * KnowledgeGraph
 *
 * @xyflow/react 기반 지식 그래프 시각화.
 * 노드: 클립(제목 + 플랫폼 뱃지), 엣지: 유사도 기반 연결(similarity > 0.7)
 */

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PLATFORM_LABELS_EN } from '@/config/constants';
import type { GraphNode, GraphEdge } from '@/app/api/v1/graph/route';

// ─── 플랫폼 색상 (Tailwind → hex, ReactFlow는 인라인 스타일 필요) ──────────

const PLATFORM_HEX: Record<string, string> = {
  twitter: '#38bdf8',
  youtube: '#ef4444',
  instagram: '#ec4899',
  tiktok: '#000000',
  linkedin: '#2563eb',
  github: '#1f2937',
  medium: '#374151',
  substack: '#f97316',
  reddit: '#ea580c',
  web: '#9ca3af',
  other: '#9ca3af',
};

// ─── 커스텀 노드 ──────────────────────────────────────────────────────────────

interface ClipNodeData extends Record<string, unknown> {
  title: string | null;
  platform: string | null;
  summary: string | null;
  clipId: string;
}

function ClipNode({ data }: NodeProps) {
  const nodeData = data as ClipNodeData;
  const platform = nodeData.platform ?? 'web';
  const color = PLATFORM_HEX[platform] ?? PLATFORM_HEX.web;
  const label = PLATFORM_LABELS_EN[platform] ?? platform;
  const title = nodeData.title ?? '제목 없음';

  return (
    <div
      className={cn(
        'min-w-[140px] max-w-[180px] rounded-lg border bg-background shadow-md',
        'cursor-pointer transition-shadow hover:shadow-lg'
      )}
      style={{ borderColor: color }}
    >
      {/* 플랫폼 뱃지 */}
      <div
        className="flex items-center gap-1 rounded-t-lg px-2 py-1 text-[10px] font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        <span>{label}</span>
      </div>

      {/* 제목 */}
      <div className="px-2 py-1.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
          {title}
        </p>
        {nodeData.summary && (
          <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
            {String(nodeData.summary)}
          </p>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { clip: ClipNode };

// ─── 초기 레이아웃: 원형 배치 ─────────────────────────────────────────────────

function computeInitialLayout(graphNodes: GraphNode[]): Node[] {
  const count = graphNodes.length;
  if (count === 0) return [];

  const radius = Math.max(200, count * 30);
  return graphNodes.map((gn, i) => {
    const angle = (2 * Math.PI * i) / count;
    return {
      id: gn.id,
      type: 'clip',
      position: {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      },
      data: {
        title: gn.title,
        platform: gn.platform,
        summary: gn.summary,
        clipId: gn.id,
      } satisfies ClipNodeData,
    };
  });
}

function computeEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((ge) => ({
    id: `${ge.source}-${ge.target}`,
    source: ge.source,
    target: ge.target,
    label: `${Math.round(ge.similarity * 100)}%`,
    labelStyle: { fontSize: 10 },
    style: {
      stroke: '#6b7280',
      strokeWidth: ge.similarity > 0.9 ? 2.5 : ge.similarity > 0.8 ? 1.5 : 1,
      opacity: 0.6 + ge.similarity * 0.4,
    },
    animated: ge.similarity > 0.85,
  }));
}

// ─── KnowledgeGraph Props ─────────────────────────────────────────────────────

export interface KnowledgeGraphProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  className?: string;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function KnowledgeGraph({ graphNodes, graphEdges, className }: KnowledgeGraphProps) {
  const router = useRouter();

  const initialNodes = useMemo(() => computeInitialLayout(graphNodes), [graphNodes]);
  const initialEdges = useMemo(() => computeEdges(graphEdges), [graphEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as ClipNodeData;
      router.push(`/clip/${data.clipId}`);
    },
    [router]
  );

  if (graphNodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">표시할 클립이 없습니다</p>
          <p className="mt-1 text-xs">클립을 저장하면 지식 그래프가 생성됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as ClipNodeData;
            return PLATFORM_HEX[data.platform ?? 'web'] ?? PLATFORM_HEX.web;
          }}
          maskColor="rgba(255,255,255,0.7)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
