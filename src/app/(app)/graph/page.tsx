import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/config/feature-flags';
import { GraphClient } from './graph-client';

export default function GraphPage() {
  if (!isFeatureEnabled('KNOWLEDGE_GRAPH')) {
    notFound();
  }
  return <GraphClient />;
}
