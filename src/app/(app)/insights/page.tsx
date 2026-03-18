import type { Metadata } from 'next';
import { InsightsClient } from './insights-client';

export const metadata: Metadata = {
  title: 'AI 인사이트',
  description: 'AI가 분석한 클립 인사이트를 확인하세요.',
};

export default function InsightsPage() {
  return <InsightsClient />;
}
