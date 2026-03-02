import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <SearchX className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h2>
      <p className="text-sm text-muted-foreground">요청하신 페이지가 존재하지 않습니다.</p>
      <Button asChild variant="outline">
        <Link href="/explore">탐색으로 돌아가기</Link>
      </Button>
    </div>
  );
}
