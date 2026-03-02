import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원가입 — Linkbrain',
  description: '무료로 가입하고 AI 세컨드 브레인을 시작하세요. 100개 클립까지 영구 무료.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://linkbrain.cloud/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
