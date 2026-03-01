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
  WEEKLY_DIGEST: false, // not yet implemented
  BROWSER_EXTENSION: false, // not yet implemented
  TEAM_WORKSPACE: false, // not yet implemented
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
