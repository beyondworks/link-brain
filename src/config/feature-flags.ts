/**
 * Feature flags for gradual rollout and tier gating.
 * true = enabled for all users, false = disabled globally.
 * Tier-based gating is handled by use-feature-access hook.
 */
export const FEATURE_FLAGS = {
  // 정식 런칭 스코프에서 제외 — 코드는 보존, 재활성화 시 true로 변경
  KNOWLEDGE_GRAPH: false,
  ANNOTATIONS: true,
  READING_PROGRESS: true,
  SMART_AUTO_TAGGING: true,
  SEMANTIC_SEARCH: true,
  OMNI_SEARCH: true,
  CONTENT_STUDIO: true,
  // Future features — uncomment when implemented
  // WEEKLY_DIGEST: false,
  // BROWSER_EXTENSION: false,
  // TEAM_WORKSPACE: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
