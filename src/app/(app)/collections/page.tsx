import type { Metadata } from 'next';
import { CollectionsClient } from './collections-client';

export const metadata: Metadata = {
  title: '컬렉션',
  description: '클립을 컬렉션으로 분류하고 관리하세요.',
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
