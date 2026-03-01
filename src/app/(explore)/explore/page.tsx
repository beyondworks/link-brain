import { Suspense } from 'react';
import { ExploreClient } from './explore-client';

export const metadata = {
  title: '탐색 - Linkbrain',
  description: '다른 사용자의 공개 클립을 발견하고 영감을 얻으세요.',
};

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      }
    >
      <ExploreClient />
    </Suspense>
  );
}
