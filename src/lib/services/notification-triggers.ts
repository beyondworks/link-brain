/**
 * Notification Triggers
 *
 * High-level functions that check user preferences before sending push notifications.
 * All functions are async, fire-and-forget safe, and catch errors internally.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from './push-service';

interface NotificationPrefs {
  clip_analyzed: boolean;
  reminder: boolean;
  insights_ready: boolean;
  collaboration: boolean;
  unread_clips: boolean;
  credit_low: boolean;
  credit_granted: boolean;
  updates: boolean;
}

interface UserIdRow {
  user_id: string;
  updates: boolean;
}

// notification_preferences is not yet in generated types
const db = supabaseAdmin as never as typeof supabaseAdmin;

async function getPrefs(userId: string): Promise<NotificationPrefs | null> {
  const { data } = await db
    .from('notification_preferences' as never)
    .select(
      'clip_analyzed, reminder, insights_ready, collaboration, unread_clips, credit_low, credit_granted, updates'
    )
    .eq('user_id', userId)
    .single() as unknown as { data: NotificationPrefs | null };
  return data;
}

// ---------------------------------------------------------------------------

export async function notifyClipAnalyzed(
  userId: string,
  clipId: string,
  clipTitle: string
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.clip_analyzed) return;

    await sendPushNotification(userId, {
      title: 'AI 분석 완료',
      body: `"${clipTitle}" 클립 분석이 완료되었습니다.`,
      data: { type: 'clip_analyzed', clipId },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyClipAnalyzed error:', err);
  }
}

export async function notifyInsightsReady(userId: string): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.insights_ready) return;

    await sendPushNotification(userId, {
      title: '인사이트 준비 완료',
      body: '이번 주 클립 인사이트가 생성되었습니다.',
      data: { type: 'insights_ready' },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyInsightsReady error:', err);
  }
}

export async function notifyCreditLow(
  userId: string,
  remaining: number,
  limit: number
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.credit_low) return;

    await sendPushNotification(userId, {
      title: '크레딧 부족',
      body: `이번 달 크레딧이 ${remaining}/${limit}개 남았습니다.`,
      data: { type: 'credit_low', remaining: String(remaining), limit: String(limit) },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyCreditLow error:', err);
  }
}

export async function notifyCreditGranted(
  userId: string,
  amount: number
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.credit_granted) return;

    await sendPushNotification(userId, {
      title: '크레딧 충전',
      body: `${amount}개의 AI 크레딧이 충전되었습니다.`,
      data: { type: 'credit_granted', amount: String(amount) },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyCreditGranted error:', err);
  }
}

export async function notifyCollaboration(
  userId: string,
  actorName: string,
  clipTitle: string,
  collectionName: string
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.collaboration) return;

    await sendPushNotification(userId, {
      title: '컬렉션 활동',
      body: `${actorName}님이 "${collectionName}"에 "${clipTitle}"을 추가했습니다.`,
      data: { type: 'collaboration', actorName, clipTitle, collectionName },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyCollaboration error:', err);
  }
}

export async function notifyUnreadClips(
  userId: string,
  count: number
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.unread_clips) return;

    await sendPushNotification(userId, {
      title: '읽지 않은 클립',
      body: `저장한 클립 ${count}개가 아직 읽지 않은 상태입니다.`,
      data: { type: 'unread_clips', count: String(count) },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyUnreadClips error:', err);
  }
}

export async function notifyReminder(
  userId: string,
  clipId: string,
  clipTitle: string
): Promise<void> {
  try {
    const prefs = await getPrefs(userId);
    if (prefs && !prefs.reminder) return;

    await sendPushNotification(userId, {
      title: '읽기 알림',
      body: `"${clipTitle}" 클립을 읽을 시간입니다.`,
      data: { type: 'reminder', clipId },
    });
  } catch (err) {
    console.error('[notification-triggers] notifyReminder error:', err);
  }
}

export async function notifyUpdate(title: string, body: string): Promise<void> {
  try {
    // Fetch all users who have updates enabled
    const { data: allPrefs } = await db
      .from('notification_preferences' as never)
      .select('user_id, updates')
      .eq('updates', true) as unknown as { data: UserIdRow[] | null };

    if (!allPrefs || allPrefs.length === 0) return;

    await Promise.allSettled(
      allPrefs.map(({ user_id }) =>
        sendPushNotification(user_id, {
          title,
          body,
          data: { type: 'update' },
        })
      )
    );
  } catch (err) {
    console.error('[notification-triggers] notifyUpdate error:', err);
  }
}
