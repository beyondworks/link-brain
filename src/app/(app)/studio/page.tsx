import type { Metadata } from 'next';
import { StudioClient } from './studio-client';

export const metadata: Metadata = {
  title: 'Content Studio',
};

export default function StudioPage() {
  return <StudioClient />;
}
