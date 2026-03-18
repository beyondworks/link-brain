import type { Metadata } from 'next';
import { ReadLaterClient } from './read-later-client';

export const metadata: Metadata = {
  title: '나중에 읽기',
  description: '나중에 읽을 클립을 정리하고 관리하세요.',
};

export default function ReadLaterPage() {
  return <ReadLaterClient />;
}
