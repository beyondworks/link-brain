// =============================================================================
// Plan & Credit Configuration — Single Source of Truth
// =============================================================================

export const CREDIT_COSTS = {
  AI_SUMMARY: 1,        // 클립 저장 시 AI 요약/태깅
  AI_CHAT: 1,           // 클립 채팅
  AI_STUDIO: 2,         // Content Studio 생성
  AI_INSIGHTS: 3,       // 인사이트 분석
  AI_EMBEDDING: 0,      // 임베딩 생성 (무료)
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const PLAN_LIMITS = {
  free: {
    maxClips: 100,
    maxCollections: 5,
    maxApiKeys: 0,
    monthlyAiCredits: 50,
    monthlyStudioGenerations: 10,
    features: ['basic_search', 'basic_ai', 'community'] as const,
  },
  pro: {
    maxClips: Infinity,
    maxCollections: Infinity,
    maxApiKeys: 5,
    monthlyAiCredits: 500,
    monthlyStudioGenerations: 100,
    features: [
      'basic_search', 'basic_ai', 'community',
      'semantic_search', 'knowledge_graph', 'annotations',
      'export', 'collection_sharing', 'mcp',
    ] as const,
  },
  master: {
    maxClips: Infinity,
    maxCollections: Infinity,
    maxApiKeys: 10,
    monthlyAiCredits: Infinity,
    monthlyStudioGenerations: Infinity,
    features: [
      'basic_search', 'basic_ai', 'community',
      'semantic_search', 'knowledge_graph', 'annotations',
      'export', 'collection_sharing', 'mcp',
      'team_workspace', 'priority_support', 'early_access',
    ] as const,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
export type Feature = (typeof PLAN_LIMITS)[PlanTier]['features'][number];

/** 플랜에 특정 기능이 포함되어 있는지 확인 */
export function hasFeature(tier: PlanTier, feature: Feature): boolean {
  return (PLAN_LIMITS[tier].features as readonly string[]).includes(feature);
}

/** JSON 직렬화 시 Infinity → -1 변환 */
export function serializeLimit(value: number): number {
  return value === Infinity ? -1 : value;
}

/** JSON 역직렬화 시 -1 → Infinity 변환 */
export function deserializeLimit(value: number): number {
  return value === -1 ? Infinity : value;
}
