import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '지식 그래프',
};

export default function GraphPage() {
  return (
    <div className="flex flex-col items-center justify-center p-6 py-20 text-muted-foreground">
      <p className="text-lg font-medium">지식 그래프</p>
      <p className="mt-1 text-sm">
        시맨틱 임베딩 기반 지식 그래프가 Phase 5에서 구현됩니다
      </p>
    </div>
  );
}
