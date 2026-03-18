import type { Metadata } from 'next';
import { CollectionDetailClient } from './collection-detail-client';

export const metadata: Metadata = {
  title: '컬렉션 상세',
  description: '컬렉션에 포함된 클립을 확인하세요.',
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  return <CollectionDetailClient collectionId={collectionId} />;
}
