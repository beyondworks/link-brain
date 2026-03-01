import type { Metadata } from 'next';
import { HighlightsClient } from './highlights-client';

export const metadata: Metadata = {
  title: '내 하이라이트',
};

export default function HighlightsPage() {
  return <HighlightsClient />;
}
