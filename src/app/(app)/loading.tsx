import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="icon-glow inline-flex rounded-2xl bg-brand-muted p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}
