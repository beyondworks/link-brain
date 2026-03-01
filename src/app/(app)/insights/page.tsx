import type { Metadata } from 'next';
import { InsightsClient } from './insights-client';

export const metadata: Metadata = {
  title: 'AI 인사이트',
};

export default function InsightsPage() {
  return <InsightsClient />;
}
