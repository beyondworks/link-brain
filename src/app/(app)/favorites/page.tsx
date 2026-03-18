import type { Metadata } from 'next';
import { FavoritesClient } from './favorites-client';

export const metadata: Metadata = {
  title: '즐겨찾기',
  description: '즐겨찾기한 클립을 모아서 빠르게 찾아보세요.',
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
