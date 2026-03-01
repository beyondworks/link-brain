import type { Metadata } from 'next';
import { ClipDetailClient } from './clip-detail-client';

export const metadata: Metadata = {
  title: '클립 상세',
};

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  return <ClipDetailClient clipId={clipId} />;
}
