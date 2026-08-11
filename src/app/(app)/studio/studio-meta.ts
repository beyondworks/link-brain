import {
  FileText,
  AtSign,
  Camera,
  Mail,
  BarChart2,
  Lightbulb,
  Presentation,
  Youtube,
} from 'lucide-react';
import type { ContentStudioType } from '@/config/constants';

export type StudioTypeMeta = {
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  description: string;
};

export const STUDIO_META: Record<ContentStudioType, StudioTypeMeta> = {
  blog_post: {
    label: '블로그 포스트',
    icon: FileText,
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
    description: 'SEO 최적 아티클',
  },
  threads_post: {
    label: 'Threads 포스트',
    icon: AtSign,
    gradient: 'from-sky-500/20 to-sky-500/5',
    iconColor: 'text-sky-500',
    description: '훅 + 연속 스레드',
  },
  instagram_feed: {
    label: '인스타그램 피드',
    icon: Camera,
    gradient: 'from-pink-500/20 to-pink-500/5',
    iconColor: 'text-pink-500',
    description: '캐러셀 슬라이드',
  },
  newsletter: {
    label: '뉴스레터',
    icon: Mail,
    gradient: 'from-violet-500/20 to-violet-500/5',
    iconColor: 'text-violet-500',
    description: '제목 A/B + 섹션',
  },
  executive_summary: {
    label: '요약 보고서',
    icon: BarChart2,
    gradient: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-500',
    description: '결론 선행 브리핑',
  },
  key_concepts: {
    label: '핵심 포인트',
    icon: Lightbulb,
    gradient: 'from-yellow-500/20 to-yellow-500/5',
    iconColor: 'text-yellow-500',
    description: '개념 + 개념 지도',
  },
  presentation_text: {
    label: '발표용 텍스트',
    icon: Presentation,
    gradient: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
    description: '슬라이드+발표 노트',
  },
  youtube_script: {
    label: '유튜브 대본',
    icon: Youtube,
    gradient: 'from-red-500/20 to-red-500/5',
    iconColor: 'text-red-500',
    description: '훅 + 타임스탬프',
  },
};

export const TONE_OPTIONS = [
  { value: 'professional', label: '전문적' },
  { value: 'casual', label: '친근한' },
  { value: 'academic', label: '학술적' },
  { value: 'creative', label: '창의적' },
  { value: 'concise', label: '간결한' },
];
