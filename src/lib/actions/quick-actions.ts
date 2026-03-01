/**
 * QuickActions 레지스트리
 *
 * 크로스 기능 퀵 액션 시스템. 컨텍스트에 따라 사용 가능한 액션을 필터링하여 반환합니다.
 */

import type { LucideIcon } from 'lucide-react';
import {
  PenLine,
  Search,
  FileText,
  FolderPlus,
  BookmarkPlus,
} from 'lucide-react';
import type { useRouter } from 'next/navigation';

export interface ActionContext {
  clipId?: string;
  clipIds?: string[];
  collectionId?: string;
  query?: string;
  router: ReturnType<typeof useRouter>;
}

export interface QuickAction {
  id: string;
  label: string;
  labelKo: string;
  icon: LucideIcon;
  category: 'clip' | 'collection' | 'studio' | 'search' | 'ai';
  handler: (context: ActionContext) => void;
  isAvailable?: (context: ActionContext) => boolean;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'clip-to-studio',
    label: 'Generate blog post',
    labelKo: '블로그 포스트 생성',
    icon: PenLine,
    category: 'studio',
    handler: (ctx) => ctx.router.push(`/studio?clipId=${ctx.clipId}`),
    isAvailable: (ctx) => !!ctx.clipId,
  },
  {
    id: 'find-similar',
    label: 'Find similar clips',
    labelKo: '유사한 클립 찾기',
    icon: Search,
    category: 'search',
    handler: (ctx) => ctx.router.push(`/dashboard?similar=${ctx.clipId}`),
    isAvailable: (ctx) => !!ctx.clipId,
  },
  {
    id: 'summarize-collection',
    label: 'Summarize collection',
    labelKo: '컬렉션 요약 생성',
    icon: FileText,
    category: 'studio',
    handler: (ctx) => ctx.router.push(`/studio?collectionId=${ctx.collectionId}`),
    isAvailable: (ctx) => !!ctx.collectionId,
  },
  {
    id: 'results-to-collection',
    label: 'Create collection from results',
    labelKo: '결과로 컬렉션 생성',
    icon: FolderPlus,
    category: 'collection',
    handler: (_ctx) => {
      // 검색 결과 → 컬렉션 생성 (향후 구현)
    },
    isAvailable: (ctx) => !!ctx.query,
  },
  {
    id: 'insight-to-clip',
    label: 'Save as clip',
    labelKo: '클립으로 저장',
    icon: BookmarkPlus,
    category: 'clip',
    handler: (_ctx) => {
      // AI 채팅 인사이트 → 클립 저장 (향후 구현)
    },
  },
];

/**
 * 컨텍스트에 따라 사용 가능한 액션을 필터링하여 반환합니다.
 */
export function getActionsForContext(context: ActionContext): QuickAction[] {
  return QUICK_ACTIONS.filter((action) =>
    action.isAvailable ? action.isAvailable(context) : true
  );
}

/**
 * 특정 액션을 실행합니다.
 */
export function executeAction(actionId: string, context: ActionContext): void {
  const action = QUICK_ACTIONS.find((a) => a.id === actionId);
  if (action) {
    action.handler(context);
  }
}
