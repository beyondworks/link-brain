import type { Metadata } from 'next';
import { ReadLaterClient } from './read-later-client';

export const metadata: Metadata = {
  title: '나중에 읽기',
};

export default function ReadLaterPage() {
  return <ReadLaterClient />;
}
