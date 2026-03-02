import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="icon-glow mb-6 inline-flex rounded-2xl bg-brand-muted p-5">
        <FileQuestion className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        이 페이지가 삭제되었거나 URL이 잘못되었을 수 있습니다.
      </p>
      <Button asChild className="mt-6 rounded-xl">
        <Link href="/dashboard">대시보드로 돌아가기</Link>
      </Button>
    </div>
  );
}
