import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, sendSuccess, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';
import { callOpenAI } from '../helpers/openai-stream';

const db = supabaseAdmin;

// ─── Insights 핸들러 ─────────────────────────────────────────────────────────

export async function handleInsights(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_INSIGHTS');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const obj = rawBody as Record<string, unknown>;
  const period = typeof obj.period === 'string' ? obj.period : 'week';
  const days = typeof obj.days === 'number' ? Math.min(Math.max(obj.days, 1), 365) : null;
  const language = obj.language === 'en' ? 'en' : 'ko';

  // Calculate date range
  const now = new Date();
  let fromDate: Date;
  if (period === 'custom' && days) {
    fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === 'quarter') {
    fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const { data: clips, error: dbErr } = await db
    .from('clips')
    .select('id, title, summary, platform, category_id, created_at, categories(name)')
    .eq('user_id', auth.publicUserId)
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: false });

  if (dbErr) {
    console.error('[API v1 AI Insights] DB error:', dbErr);
    return errors.internalError();
  }

  const clipRows = (clips as Array<Record<string, unknown>>) ?? [];
  const totalClips = clipRows.length;

  if (totalClips === 0) {
    return sendSuccess({
      action: 'insights',
      period,
      totalClips: 0,
      summary: language === 'en'
        ? 'No clips saved in this period.'
        : '해당 기간에 저장된 클립이 없습니다.',
      platformBreakdown: {},
      topCategories: [],
      aiAnalysis: null,
    });
  }

  // Compute basic stats
  const platformCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};

  for (const clip of clipRows) {
    const platform = typeof clip.platform === 'string' ? clip.platform : 'web';
    platformCount[platform] = (platformCount[platform] ?? 0) + 1;

    const catName = (clip.categories as { name?: string } | null)?.name;
    if (catName) categoryCount[catName] = (categoryCount[catName] ?? 0) + 1;
  }

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Fetch content summaries for AI analysis
  const clipIdsForContent = clipRows.slice(0, 30).map((c) => c.id as string);
  let contentSummaries = '';
  if (clipIdsForContent.length > 0) {
    const { data: clipContents } = await db
      .from('clips')
      .select('title, summary, clip_contents(content_markdown)')
      .in('id', clipIdsForContent);

    if (clipContents) {
      contentSummaries = (clipContents as Array<{ title: string | null; summary: string | null; clip_contents: { content_markdown: string | null } | null }>)
        .map((c, i) => {
          const content = c.clip_contents?.content_markdown?.substring(0, 300) ?? c.summary ?? '';
          return `${i + 1}. ${c.title ?? '제목 없음'}: ${content}`;
        })
        .join('\n');
    }
  }

  // Check reading debt (saved but never read)
  const { count: unreadCount } = await db
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.publicUserId)
    .eq('is_read', false)
    .eq('is_archived', false);

  // Build summary text for AI
  const statsSummary =
    `기간: ${period === 'custom' ? `${days}일` : period}\n` +
    `총 클립: ${totalClips}개\n` +
    `플랫폼 분포: ${Object.entries(platformCount).map(([k, v]) => `${k}(${v})`).join(', ')}\n` +
    `상위 카테고리: ${topCategories.map((c) => `${c.name}(${c.count})`).join(', ')}\n` +
    `미읽은 클립: ${unreadCount ?? 0}개\n\n` +
    `클립 콘텐츠 요약:\n${contentSummaries}`;

  try {
    const lang = language === 'en' ? 'English' : '한국어';
    const systemPrompt =
      `당신은 지식 관리 및 학습 패턴 분석 전문가입니다. 사용자의 저장된 콘텐츠를 깊이 분석하여 인사이트를 제공하세요. ${lang}로 답변하세요.\n\n` +
      `다음 JSON 형식으로 응답하세요:\n` +
      `{\n` +
      `  "summary": "전체 요약 (2-3문장)",\n` +
      `  "trends": ["트렌드1", "트렌드2", "트렌드3"],\n` +
      `  "recommendations": ["추천사항1", "추천사항2"],\n` +
      `  "topicFocus": "주된 관심 주제",\n` +
      `  "knowledgeClusters": [{"name": "클러스터명", "clipCount": 3, "description": "설명"}],\n` +
      `  "readingDebt": {"count": ${unreadCount ?? 0}, "suggestion": "읽기 부채 해소 제안"},\n` +
      `  "actionItems": ["행동 제안1", "행동 제안2"]\n` +
      `}\n` +
      `반드시 유효한 JSON만 응답하세요.`;

    const aiContent = await callOpenAI(systemPrompt, statsSummary, aiConfig.apiKey, aiConfig.model);

    let aiAnalysis: unknown;
    try {
      aiAnalysis = JSON.parse(aiContent);
    } catch {
      aiAnalysis = { raw: aiContent };
    }

    return sendSuccess({
      action: 'insights',
      period,
      totalClips,
      platformBreakdown: platformCount,
      topCategories,
      aiAnalysis,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'OpenAI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Insights] Error:', err);
    return errors.internalError();
  }
}
