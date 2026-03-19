// ─── 공유 타입 ────────────────────────────────────────────────────────────────

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
  length: string;
}

export interface ClipRow {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  clip_contents: { content_markdown: string | null; raw_markdown: string | null } | null;
}
