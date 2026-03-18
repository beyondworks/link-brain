import type { Metadata } from 'next';
import { ArchiveClient } from './archive-client';

export const metadata: Metadata = {
  title: '아카이브',
  description: '아카이브된 클립을 확인하세요.',
};

export default function ArchivePage() {
  return <ArchiveClient />;
}
