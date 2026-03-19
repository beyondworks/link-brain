/**
 * GET  /api/v1/ai-config — 사용자 AI 설정 + 등록된 키 목록 조회
 * PUT  /api/v1/ai-config — 기본 모델/채팅 모델 설정 변경
 * POST /api/v1/ai-config/keys — API 키 등록
 * DELETE /api/v1/ai-config/keys?id= — API 키 삭제
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth } from '@/lib/api/middleware';
import { errors, sendSuccess, sendError, ErrorCodes } from '@/lib/api/response';
import { encryptToken } from '@/lib/oauth/token-manager';
import { AVAILABLE_MODELS } from '@/lib/ai/model-resolver';

const db = supabaseAdmin;

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') {
      // Get user config + registered keys (prefix only, not the actual key)
      const { data: config } = await db
        .from('user_ai_config')
        .select('*')
        .eq('user_id', auth.publicUserId)
        .single();

      const { data: keys } = await db
        .from('user_ai_keys')
        .select('id, provider, name, key_prefix, is_active, created_at, last_used_at')
        .eq('user_id', auth.publicUserId)
        .order('created_at', { ascending: false });

      return sendSuccess({
        config: config ?? { default_provider: 'server', default_model: null, chat_provider: null, chat_model: null },
        keys: keys ?? [],
        availableModels: AVAILABLE_MODELS,
      });
    }

    if (req.method === 'PUT') {
      let body: Record<string, unknown>;
      try { body = await req.json() as Record<string, unknown>; } catch {
        return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바르지 않습니다.', 400);
      }

      const defaultProvider = typeof body.defaultProvider === 'string' ? body.defaultProvider : undefined;
      const defaultModel = typeof body.defaultModel === 'string' ? body.defaultModel : undefined;
      const chatProvider = typeof body.chatProvider === 'string' ? body.chatProvider : undefined;
      const chatModel = typeof body.chatModel === 'string' ? body.chatModel : undefined;

      const upsertData: Record<string, unknown> = {
        user_id: auth.publicUserId,
        updated_at: new Date().toISOString(),
      };
      if (defaultProvider !== undefined) upsertData.default_provider = defaultProvider;
      if (defaultModel !== undefined) upsertData.default_model = defaultModel;
      if (chatProvider !== undefined) upsertData.chat_provider = chatProvider;
      if (chatModel !== undefined) upsertData.chat_model = chatModel;

      const { error } = await db
        .from('user_ai_config')
        .upsert(upsertData as { user_id: string; default_provider: string }, { onConflict: 'user_id' });

      if (error) {
        console.error('[AI Config] Update error:', error);
        return errors.internalError();
      }

      return sendSuccess({ updated: true });
    }

    if (req.method === 'POST') {
      // Register a new API key
      let body: Record<string, unknown>;
      try { body = await req.json() as Record<string, unknown>; } catch {
        return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바르지 않습니다.', 400);
      }

      const provider = typeof body.provider === 'string' ? body.provider : '';
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey : '';
      const name = typeof body.name === 'string' ? body.name : `${provider} key`;

      if (!['openai', 'google', 'anthropic'].includes(provider)) {
        return sendError(ErrorCodes.INVALID_REQUEST, 'provider는 openai, google, anthropic 중 하나여야 합니다.', 400);
      }
      if (!apiKey || apiKey.length < 10) {
        return sendError(ErrorCodes.INVALID_REQUEST, 'API 키가 올바르지 않습니다.', 400);
      }

      // Deactivate existing keys for this provider
      await db
        .from('user_ai_keys')
        .update({ is_active: false })
        .eq('user_id', auth.publicUserId)
        .eq('provider', provider)
        .eq('is_active', true);

      // Encrypt and store
      const encrypted = await encryptToken(apiKey);
      const keyPrefix = apiKey.substring(0, 8) + '...';

      const { data: newKey, error } = await db
        .from('user_ai_keys')
        .insert({
          user_id: auth.publicUserId,
          provider,
          name,
          encrypted_api_key: encrypted,
          key_prefix: keyPrefix,
        })
        .select('id, provider, name, key_prefix, is_active, created_at')
        .single();

      if (error) {
        console.error('[AI Config] Key insert error:', error);
        return errors.internalError();
      }

      return sendSuccess({ key: newKey }, 201);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const keyId = url.searchParams.get('id');
      if (!keyId) {
        return sendError(ErrorCodes.INVALID_REQUEST, 'id 파라미터가 필요합니다.', 400);
      }

      const { error } = await db
        .from('user_ai_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', auth.publicUserId);

      if (error) {
        console.error('[AI Config] Key delete error:', error);
        return errors.internalError();
      }

      return sendSuccess({ deleted: true });
    }

    return errors.methodNotAllowed(['GET', 'PUT', 'POST', 'DELETE']);
  },
  { allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'] }
);

export const GET = routeHandler;
export const PUT = routeHandler;
export const POST = routeHandler;
export const DELETE = routeHandler;
export const OPTIONS = routeHandler;
