/**
 * Model Resolver — Central AI config resolution
 *
 * Determines which provider/model/apiKey to use for AI calls.
 * If user has their own key configured, uses that (no credit deduction).
 * Otherwise falls back to server key (credit deduction applies).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/oauth/token-manager';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface ResolvedAIConfig {
  provider: 'openai' | 'google' | 'anthropic';
  apiKey: string;
  model: string;
  isUserKey: boolean; // true = skip credit deduction
  baseUrl?: string;   // for provider-specific endpoints
}

// Provider API base URLs
const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
};

// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash',
  anthropic: 'claude-sonnet-4-20250514',
};

function getServerDefault(): ResolvedAIConfig {
  return {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: 'gpt-4o-mini',
    isUserKey: false,
  };
}

type Feature = 'chat' | 'default';

/**
 * Resolve which AI provider/model/key to use for the given user and feature.
 *
 * 1. Check user_ai_config for preferences
 * 2. If chat feature and chat_provider is set, use chat-specific config
 * 3. Look up user_ai_keys for the resolved provider
 * 4. Decrypt the key
 * 5. If anything fails, fall back to server default
 */
export async function resolveAIConfig(
  userId: string,
  feature: Feature = 'default'
): Promise<ResolvedAIConfig> {
  try {
    // 1. Get user AI config
    const { data: config } = await db
      .from('user_ai_config')
      .select('default_provider, default_model, chat_provider, chat_model')
      .eq('user_id', userId)
      .single();

    if (!config) return getServerDefault();

    const cfg = config as {
      default_provider: string;
      default_model: string | null;
      chat_provider: string | null;
      chat_model: string | null;
    };

    // 2. Resolve provider and model based on feature
    let provider: string;
    let model: string | null;

    if (feature === 'chat' && cfg.chat_provider && cfg.chat_provider !== 'server') {
      provider = cfg.chat_provider;
      model = cfg.chat_model;
    } else {
      provider = cfg.default_provider;
      model = cfg.default_model;
    }

    // Server fallback
    if (provider === 'server' || !provider) {
      return getServerDefault();
    }

    // 3. Get user's API key for this provider
    const { data: keyRow } = await db
      .from('user_ai_keys')
      .select('encrypted_api_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (!keyRow) {
      console.warn(`[ModelResolver] No active key for ${provider}, falling back to server`);
      return getServerDefault();
    }

    // 4. Decrypt the key
    const encryptedKey = (keyRow as { encrypted_api_key: string }).encrypted_api_key;
    const apiKey = await decryptToken(encryptedKey);

    return {
      provider: provider as ResolvedAIConfig['provider'],
      apiKey,
      model: model ?? DEFAULT_MODELS[provider] ?? 'gpt-4o-mini',
      isUserKey: true,
      baseUrl: PROVIDER_URLS[provider],
    };
  } catch (err) {
    console.warn('[ModelResolver] Error resolving config, using server default:', err);
    return getServerDefault();
  }
}

/**
 * Available models per provider for the settings UI
 */
export const AVAILABLE_MODELS = {
  server: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '기본 (크레딧 차감)' },
  ],
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4 Pro', description: '최신 플래그십' },
    { id: 'gpt-5.4-thinking', name: 'GPT-5.4 Thinking', description: '고급 추론' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '빠른 응답' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: '초경량' },
    { id: 'gpt-4o', name: 'GPT-4o', description: '균형' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '경량' },
  ],
  google: [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: '최신 플래그십' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Thinking 지원' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '안정 버전' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '경량' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: '최고 성능' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '균형' },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', description: '경량' },
  ],
} as const;
