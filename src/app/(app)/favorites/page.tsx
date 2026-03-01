import type { Metadata } from 'next';
import { FavoritesClient } from './favorites-client';

export const metadata: Metadata = {
  title: '즐겨찾기',
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
