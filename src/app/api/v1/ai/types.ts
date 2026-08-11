// ─── 공유 타입 ────────────────────────────────────────────────────────────────

import type { StudioLength } from '@/lib/ai/studio-formats';

export type ContentStudioType =
  | 'blog_post'
  | 'threads_post'
  | 'instagram_feed'
  | 'newsletter'
  | 'executive_summary'
  | 'key_concepts'
  | 'presentation_text'
  | 'youtube_script';

export interface AiRequestBody {
  clipIds: string[];
  type: ContentStudioType;
  tone: string;
  length: StudioLength;
  /** 결과물 말미에 '참고한 클립' 섹션을 붙일지 (기본 true) */
  includeSources: boolean;
}

export interface ClipRow {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  platform?: string | null;
  created_at?: string | null;
  clip_contents: { content_markdown: string | null; raw_markdown: string | null } | null;
}
