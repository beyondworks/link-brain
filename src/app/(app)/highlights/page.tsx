import type { Metadata } from 'next';
import { HighlightsClient } from './highlights-client';

export const metadata: Metadata = {
  title: '내 하이라이트',
  description: '저장한 하이라이트를 모아서 확인하세요.',
};

export default function HighlightsPage() {
  return <HighlightsClient />;
}
