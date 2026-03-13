import type { Metadata } from 'next';
import { AlbumDetailClient } from './album-detail-client';

export const metadata: Metadata = {
  title: '앨범',
};

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return <AlbumDetailClient albumId={albumId} />;
}
