export const CREDIT_COSTS = {
  AI_SUMMARY: 1,
  AI_CHAT: 1,
  AI_STUDIO: 2,
  AI_INSIGHTS: 3,
  AI_EMBEDDING: 0, // free - generated on clip creation
} as const;

export const PLAN_LIMITS = {
  free: {
    monthlyCredits: 50,
    maxClips: 200,
    maxCollections: 3,
    maxApiKeys: 0,
    features: ['basic_ai', 'basic_search'],
  },
  pro: {
    monthlyCredits: 1000,
    maxClips: Infinity,
    maxCollections: Infinity,
    maxApiKeys: 5,
    features: [
      'basic_ai',
      'advanced_ai',
      'basic_search',
      'semantic_search',
      'knowledge_graph',
      'annotations',
      'export',
      'offline',
      'mcp',
    ],
  },
  team: {
    monthlyCredits: 2000,
    maxClips: Infinity,
    maxCollections: Infinity,
    maxApiKeys: 20,
    features: [
      'basic_ai',
      'advanced_ai',
      'basic_search',
      'semantic_search',
      'knowledge_graph',
      'annotations',
      'export',
      'offline',
      'mcp',
      'team_workspace',
      'shared_collections',
    ],
  },
  master: {
    monthlyCredits: Infinity,
    maxClips: Infinity,
    maxCollections: Infinity,
    maxApiKeys: 50,
    features: [
      'basic_ai',
      'advanced_ai',
      'basic_search',
      'semantic_search',
      'knowledge_graph',
      'annotations',
      'export',
      'offline',
      'mcp',
      'team_workspace',
      'shared_collections',
      'priority_support',
      'custom_integrations',
    ],
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
export type Feature = (typeof PLAN_LIMITS)[PlanTier]['features'][number];
