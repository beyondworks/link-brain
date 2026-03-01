import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 하이라이트',
};

export default function HighlightsPage() {
  return (
    <div className="flex flex-col items-center justify-center p-6 py-20 text-muted-foreground">
      <p className="text-lg font-medium">내 하이라이트</p>
      <p className="mt-1 text-sm">
        클립에서 하이라이트한 텍스트가 여기에 모입니다. Phase 5에서 구현됩니다.
      </p>
    </div>
  );
}
