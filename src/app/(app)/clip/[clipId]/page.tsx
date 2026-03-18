import type { Metadata } from 'next';
import { ClipDetailClient } from './clip-detail-client';

export const metadata: Metadata = {
  title: '클립 상세',
  description: '클립의 상세 내용을 확인하세요.',
};

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  return <ClipDetailClient clipId={clipId} />;
}
