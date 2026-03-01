export const APP_NAME = 'LinkBrain';
export const APP_DESCRIPTION = 'AI-powered second brain for knowledge management';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud';

export const BRAND_COLOR = '#21DBA4';
export const BRAND_COLOR_HOVER = '#1BC290';

export const PLATFORMS = [
  'web',
  'youtube',
  'instagram',
  'threads',
  'twitter',
  'naver',
  'pinterest',
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, { en: string; ko: string }> = {
  web: { en: 'Web', ko: '웹' },
  youtube: { en: 'YouTube', ko: '유튜브' },
  instagram: { en: 'Instagram', ko: '인스타그램' },
  threads: { en: 'Threads', ko: '스레드' },
  twitter: { en: 'X (Twitter)', ko: 'X (트위터)' },
  naver: { en: 'Naver', ko: '네이버' },
  pinterest: { en: 'Pinterest', ko: '핀터레스트' },
};

export const VIEW_MODES = ['grid', 'list', 'headlines'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const SORT_OPTIONS = [
  { value: 'created_at', labelEn: 'Date Added', labelKo: '추가 날짜' },
  { value: 'updated_at', labelEn: 'Last Updated', labelKo: '최근 수정' },
  { value: 'title', labelEn: 'Title', labelKo: '제목' },
  { value: 'ai_score', labelEn: 'AI Score', labelKo: 'AI 점수' },
] as const;

export type SortBy = (typeof SORT_OPTIONS)[number]['value'];

export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

export const CONTENT_STUDIO_TYPES = [
  'blog_post',
  'sns_post',
  'newsletter',
  'email_draft',
  'executive_summary',
  'key_concepts',
  'quiz',
  'mind_map',
  'review_notes',
  'teach_back',
  'simplified_summary',
] as const;

export type ContentStudioType = (typeof CONTENT_STUDIO_TYPES)[number];
