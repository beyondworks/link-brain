/**
 * Feature flags for gradual rollout and tier gating.
 * true = enabled for all users, false = disabled globally.
 * Tier-based gating is handled by use-feature-access hook.
 */
export const FEATURE_FLAGS = {
  KNOWLEDGE_GRAPH: true,
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
