import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '요금제 — Linkbrain',
  description: '무료부터 프로까지, 나에게 맞는 요금제를 선택하세요. AI 요약, 시맨틱 검색, Content Studio 등 모든 기능을 합리적인 가격에.',
  openGraph: {
    title: '요금제 — Linkbrain',
    description: '무료부터 프로까지, Linkbrain 요금제를 비교해보세요.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
