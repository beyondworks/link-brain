import type { Metadata } from 'next';
import { CollectionDetailClient } from './collection-detail-client';

export const metadata: Metadata = {
  title: '컬렉션 상세',
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  return <CollectionDetailClient collectionId={collectionId} />;
}
