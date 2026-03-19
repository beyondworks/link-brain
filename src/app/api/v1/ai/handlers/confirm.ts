import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';

const db = supabaseAdmin;

// ─── PendingAction type ──────────────────────────────────────────────────────

interface PendingAction {
  __type: 'pending_action';
  action: string;
  description: string;
  targetName: string | null;
  targetId: string | null;
  targetExists: boolean;
  tags?: string[];
  clips: Array<{ id: string; title: string }>;
  clipCount: number;
}

// ─── Confirm handler ─────────────────────────────────────────────────────────

export async function handleConfirm(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'chat');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_CHAT');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const obj = rawBody as Record<string, unknown>;
  const pending = obj.pendingAction as PendingAction | undefined;
  const conversationId = typeof obj.conversationId === 'string' ? obj.conversationId : null;

  if (!pending || pending.__type !== 'pending_action' || !Array.isArray(pending.clips)) {
    return errors.invalidRequest('pendingAction이 올바르지 않습니다.');
  }

  const clipIds = pending.clips.map((c) => c.id).slice(0, 50);
  if (clipIds.length === 0) {
    return errors.invalidRequest('대상 클립이 없습니다.');
  }

  // Verify clip ownership
  const { data: ownedClips, error: ownershipErr } = await db
    .from('clips')
    .select('id')
    .eq('user_id', auth.publicUserId)
    .in('id', clipIds);

  if (ownershipErr) {
    return errors.internalError();
  }

  const ownedIds = ((ownedClips as Array<{ id: string }>) ?? []).map((c) => c.id);
  if (ownedIds.length === 0) {
    return errors.accessDenied();
  }

  try {
    const invalidate: string[] = ['clips'];
    let resultMessage = '';

    switch (pending.action) {
      case 'archive': {
        const { error } = await db
          .from('clips')
          .update({ is_archived: true })
          .in('id', ownedIds)
          .eq('user_id', auth.publicUserId);
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립을 아카이브했습니다.`;
        invalidate.push('nav-counts');
        break;
      }

      case 'unarchive': {
        const { error } = await db
          .from('clips')
          .update({ is_archived: false })
          .in('id', ownedIds)
          .eq('user_id', auth.publicUserId);
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립의 아카이브를 해제했습니다.`;
        invalidate.push('nav-counts');
        break;
      }

      case 'favorite': {
        const { error } = await db
          .from('clips')
          .update({ is_favorite: true })
          .in('id', ownedIds)
          .eq('user_id', auth.publicUserId);
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립을 즐겨찾기에 추가했습니다.`;
        invalidate.push('nav-counts');
        break;
      }

      case 'unfavorite': {
        const { error } = await db
          .from('clips')
          .update({ is_favorite: false })
          .in('id', ownedIds)
          .eq('user_id', auth.publicUserId);
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립의 즐겨찾기를 해제했습니다.`;
        invalidate.push('nav-counts');
        break;
      }

      case 'move_to_category': {
        if (!pending.targetId) {
          return errors.invalidRequest('대상 카테고리를 찾을 수 없습니다.');
        }
        // Verify category ownership
        const { data: cat, error: catErr } = await db
          .from('categories')
          .select('id')
          .eq('id', pending.targetId)
          .eq('user_id', auth.publicUserId)
          .single();
        if (catErr || !cat) {
          return errors.notFound('Category');
        }
        const { error } = await db
          .from('clips')
          .update({ category_id: pending.targetId })
          .in('id', ownedIds)
          .eq('user_id', auth.publicUserId);
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립을 "${pending.targetName}" 카테고리로 이동했습니다.`;
        invalidate.push('categories');
        break;
      }

      case 'add_to_collection': {
        if (!pending.targetId) {
          return errors.invalidRequest('대상 컬렉션을 찾을 수 없습니다.');
        }
        // Verify collection ownership
        const { data: col, error: colErr } = await db
          .from('collections')
          .select('id')
          .eq('id', pending.targetId)
          .eq('user_id', auth.publicUserId)
          .single();
        if (colErr || !col) {
          return errors.notFound('Collection');
        }
        const rows = ownedIds.map((clipId) => ({
          clip_id: clipId,
          collection_id: pending.targetId as string,
        }));
        const { error } = await db
          .from('clip_collections')
          .upsert(rows, { onConflict: 'clip_id,collection_id', ignoreDuplicates: true });
        if (error) throw error;
        resultMessage = `${ownedIds.length}개 클립을 "${pending.targetName}" 컬렉션에 추가했습니다.`;
        invalidate.push('collections');
        break;
      }

      case 'bulk_tag': {
        const tags = Array.isArray(pending.tags) ? pending.tags.slice(0, 20) : [];
        if (tags.length === 0) {
          return errors.invalidRequest('추가할 태그가 없습니다.');
        }
        // Append tags to existing keywords (deduplicated)
        for (const clipId of ownedIds) {
          const { data: clip } = await db
            .from('clips')
            .select('keywords')
            .eq('id', clipId)
            .single();
          const existing = Array.isArray((clip as unknown as { keywords: string[] | null } | null)?.keywords)
            ? (clip as unknown as { keywords: string[] }).keywords
            : [];
          const merged = [...new Set([...existing, ...tags])];
          const { error: updateErr } = await db
            .from('clips')
            .update({ keywords: merged } as never)
            .eq('id', clipId)
            .eq('user_id', auth.publicUserId);
          if (updateErr) throw updateErr;
        }
        resultMessage = `${ownedIds.length}개 클립에 태그 [${tags.join(', ')}]를 추가했습니다.`;
        break;
      }

      default:
        return errors.invalidRequest(`지원하지 않는 작업: ${pending.action}`);
    }

    // Save assistant message to conversation
    if (conversationId) {
      await db.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: resultMessage,
      });
    }

    return NextResponse.json({
      success: true,
      message: resultMessage,
      invalidate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
