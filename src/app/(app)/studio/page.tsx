import type { Metadata } from 'next';
import { StudioClient } from './studio-client';

export const metadata: Metadata = {
  title: 'Content Studio',
  description: 'AI로 클립을 기반으로 콘텐츠를 생성하세요.',
};

export default function StudioPage() {
  return <StudioClient />;
}
