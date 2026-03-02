import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 — Linkbrain',
  description: 'Linkbrain에 로그인하여 저장한 콘텐츠를 관리하세요.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://linkbrain.cloud/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
