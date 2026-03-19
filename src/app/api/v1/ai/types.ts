// ─── 공유 타입 ────────────────────────────────────────────────────────────────

export type ContentStudioType =
  | 'blog_post'
  | 'sns_post'
  | 'newsletter'
  | 'email_draft'
  | 'executive_summary'
  | 'key_concepts'
  | 'review_notes'
  | 'teach_back'
  | 'quiz'
  | 'mind_map'
  | 'simplified_summary';

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
