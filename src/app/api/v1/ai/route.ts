/**
 * POST /api/v1/ai - AI 액션 라우터
 *
 * action=generate (default) — 스트리밍 콘텐츠 생성
 *   Body: { action?: 'generate', clipIds, type, tone, length }
 * action=analyze — 클립 세트 구조 분석 (JSON 응답)
 *   Body: { action: 'analyze', url?, clipIds? }
 * action=ask — 클립 컨텍스트 기반 Q&A (JSON 응답)
 *   Body: { action: 'ask', message, clipIds?, language? }
 * action=insights — 읽기 패턴 인사이트 리포트 (JSON 응답)
 *   Body: { action: 'insights', period?, days?, language? }
 */

import { withAuth } from '@/lib/api/middleware';
import { errors, sendError, ErrorCodes } from '@/lib/api/response';
import { handleGenerate } from './handlers/generate';
import { handleAnalyze } from './handlers/analyze';
import { handleAsk } from './handlers/ask';
import { handleInsights } from './handlers/insights';

// ─── Export ──────────────────────────────────────────────────────────────────

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method !== 'POST') return errors.methodNotAllowed(['POST']);

    // Body 1회 파싱
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바른 JSON이 아닙니다.', 400);
    }

    const obj = rawBody as Record<string, unknown>;
    const action = typeof obj.action === 'string' ? obj.action : 'generate';

    switch (action) {
      case 'analyze':  return handleAnalyze(rawBody, auth);
      case 'ask':      return handleAsk(rawBody, auth);
      case 'insights': return handleInsights(rawBody, auth);
      default:         return handleGenerate(rawBody, auth);
    }
  },
  { allowedMethods: ['POST'], isAiEndpoint: true }
);

export const POST = routeHandler;
export const OPTIONS = routeHandler;
