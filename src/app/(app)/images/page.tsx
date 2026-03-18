import type { Metadata } from 'next';
import { ImagesClient } from './images-client';

export const metadata: Metadata = {
  title: '이미지',
  description: '클립에서 추출한 이미지를 갤러리로 탐색하세요.',
};

export default function ImagesPage() {
  return <ImagesClient />;
}
