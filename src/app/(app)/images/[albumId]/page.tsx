import type { Metadata } from 'next';
import { AlbumDetailClient } from './album-detail-client';

export const metadata: Metadata = {
  title: '앨범',
  description: '앨범의 이미지를 확인하세요.',
};

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return <AlbumDetailClient albumId={albumId} />;
}
