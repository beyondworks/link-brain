import type { Metadata } from 'next';
import { ImagesClient } from './images-client';

export const metadata: Metadata = {
  title: '이미지',
};

export default function ImagesPage() {
  return <ImagesClient />;
}
