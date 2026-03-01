import type { Metadata } from 'next';
import { CollectionsClient } from './collections-client';

export const metadata: Metadata = {
  title: '컬렉션',
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
