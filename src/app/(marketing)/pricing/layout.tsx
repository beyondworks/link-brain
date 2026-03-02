import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '요금제 — Linkbrain',
  description: '무료부터 Master까지, 당신에게 맞는 요금제를 선택하세요. 14일 무료 체험, 카드 등록 불필요.',
  openGraph: {
    title: '요금제 — Linkbrain',
    description: '무료부터 Master까지, 당신에게 맞는 요금제를 선택하세요.',
    url: 'https://linkbrain.cloud/pricing',
  },
  alternates: { canonical: 'https://linkbrain.cloud/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
