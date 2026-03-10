import type { ClipData } from '@/types/database';

/**
 * Seed / demo clips shown when the user has no real data.
 * Shared between dashboard, clip detail, and other pages that need demo state.
 */
export const SEED_CLIPS: ClipData[] = [
  {
    id: 'seed-1',
    user_id: '',
    url: 'https://nextjs.org/blog/next-15',
    title: 'Next.js 15에서 달라진 점 총정리',
    summary:
      'App Router 개선, Turbopack 안정화, 캐싱 전략 변경 등 주요 변경사항을 정리했습니다. React 19 지원, 부분 프리렌더링(PPR), next/after API 등 다양한 신기능이 추가되었습니다.',
    image: null,
    platform: 'web',
    author: 'Vercel Team',
    author_handle: '@vercel',
    author_avatar: null,
    read_time: 8,
    ai_score: 92,
    is_favorite: true,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 1240,
    likes_count: 87,
    share_token: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-2',
    user_id: '',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'React Server Components 완전 정복',
    summary:
      'RSC의 동작 원리와 클라이언트 컴포넌트와의 경계를 실전 예제로 설명합니다. 서버에서 렌더링되는 컴포넌트가 어떻게 클라이언트로 전달되는지, 번들 사이즈 최적화까지 다룹니다.',
    image: null,
    platform: 'youtube',
    author: 'Josh Comeau',
    author_handle: '@joshwcomeau',
    author_avatar: null,
    read_time: 22,
    ai_score: 88,
    is_favorite: false,
    is_read_later: true,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 5320,
    likes_count: 412,
    share_token: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-3',
    user_id: '',
    url: 'https://github.com/vercel/ai',
    title: 'Vercel AI SDK — 스트리밍 AI 앱 구축하기',
    summary:
      'OpenAI, Anthropic 등 다양한 LLM 프로바이더를 통합하는 공식 SDK 레포지터리. useChat, useCompletion 등의 React 훅과 스트리밍 응답 처리를 지원합니다.',
    image: null,
    platform: 'github',
    author: 'Vercel',
    author_handle: '@vercel',
    author_avatar: null,
    read_time: 15,
    ai_score: 95,
    is_favorite: true,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 9800,
    likes_count: 1023,
    share_token: null,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-4',
    user_id: '',
    url: 'https://twitter.com/dan_abramov/status/123456789',
    title: 'Dan Abramov: 상태 관리의 미래',
    summary:
      '클라이언트 상태와 서버 상태를 분리해야 하는 이유, 그리고 리액트 생태계의 방향성. Redux에서 시작해 Server State, URL State, Form State로 진화하는 상태 관리 패러다임을 이야기합니다.',
    image: null,
    platform: 'twitter',
    author: 'Dan Abramov',
    author_handle: '@dan_abramov',
    author_avatar: null,
    read_time: 3,
    ai_score: 78,
    is_favorite: false,
    is_read_later: true,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 34200,
    likes_count: 2890,
    share_token: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-5',
    user_id: '',
    url: 'https://medium.com/@kentcdodds/typescript-tips',
    title: 'TypeScript 실전 팁 10가지',
    summary:
      '실무에서 자주 쓰는 제네릭 패턴, 조건부 타입, infer 키워드 활용법을 담았습니다. satisfies 연산자, const assertion, discriminated union 등 TypeScript 5.x 시대의 필수 패턴도 포함합니다.',
    image: null,
    platform: 'medium',
    author: 'Kent C. Dodds',
    author_handle: '@kentcdodds',
    author_avatar: null,
    read_time: 12,
    ai_score: 85,
    is_favorite: false,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 7650,
    likes_count: 543,
    share_token: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-6',
    user_id: '',
    url: 'https://www.reddit.com/r/webdev/comments/example',
    title: 'Tailwind CSS v4 출시 — 무엇이 달라졌나?',
    summary:
      '새로운 CSS-first 설정 방식, 성능 개선, 그리고 기존 프로젝트 마이그레이션 가이드. @theme 지시어, CSS 변수 자동 매핑, oklch 색상 시스템 등의 핵심 변경사항을 다룹니다.',
    image: null,
    platform: 'reddit',
    author: 'r/webdev',
    author_handle: '@webdev',
    author_avatar: null,
    read_time: 6,
    ai_score: 80,
    is_favorite: true,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 18500,
    likes_count: 1340,
    share_token: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 259200000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-7',
    user_id: '',
    url: 'https://substack.com/@bytebytego/postgres-indexing',
    title: 'PostgreSQL 인덱싱 전략 완벽 가이드',
    summary:
      'B-tree, GIN, BRIN 인덱스 비교와 쿼리 플래너가 인덱스를 선택하는 방법을 다룹니다. EXPLAIN ANALYZE 읽는 법, 복합 인덱스 설계, partial index 활용까지.',
    image: null,
    platform: 'substack',
    author: 'ByteByteGo',
    author_handle: '@bytebytego',
    author_avatar: null,
    read_time: 18,
    ai_score: 91,
    is_favorite: false,
    is_read_later: true,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 4210,
    likes_count: 328,
    share_token: null,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
  {
    id: 'seed-8',
    user_id: '',
    url: 'https://www.linkedin.com/posts/example-post',
    title: '2025년 프론트엔드 개발자 로드맵',
    summary:
      'React, TypeScript, 성능 최적화, 접근성까지 — 올해 반드시 익혀야 할 기술 스택 정리. Web Components, View Transitions API, Container Queries 등 최신 웹 표준도 포함합니다.',
    image: null,
    platform: 'linkedin',
    author: 'Frontend Masters',
    author_handle: '@frontendmasters',
    author_avatar: null,
    read_time: 5,
    ai_score: 74,
    is_favorite: false,
    is_read_later: false,
    is_archived: false,
    is_public: false,
    category_id: null,
    views: 22300,
    likes_count: 1876,
    share_token: null,
    created_at: new Date(Date.now() - 432000000).toISOString(),
    updated_at: new Date(Date.now() - 432000000).toISOString(),
    remind_at: null,
    processing_status: 'ready',
    notes: null,
    processing_error: null,
    retry_count: 0,
    processed_at: null,
  },
];

/** Lookup a single seed clip by id. Returns undefined if not found. */
export function getSeedClip(clipId: string): ClipData | undefined {
  return SEED_CLIPS.find((c) => c.id === clipId);
}

/**
 * Platform-specific demo content (markdown) for the clip detail page.
 */
export const SEED_CONTENT: Record<string, string> = {
  'seed-1': `## Next.js 15 주요 변경사항

### 1. React 19 지원
Next.js 15는 React 19를 공식 지원합니다. 새로운 \`use\` 훅, Server Actions 개선, 그리고 향상된 Suspense 경계 등을 활용할 수 있습니다.

### 2. Turbopack 안정화
\`next dev --turbopack\` 이 안정 버전으로 전환되었습니다. 로컬 개발 시 HMR 속도가 최대 76% 향상되었으며, 초기 빌드 시간도 크게 단축되었습니다.

\`\`\`bash
# Turbopack으로 개발 서버 시작
npx next dev --turbopack
\`\`\`

### 3. 캐싱 전략 변경
기본 캐싱 동작이 변경되었습니다:
- \`fetch()\` 요청이 더 이상 기본으로 캐시되지 않음
- Route Handlers가 기본으로 동적 렌더링
- \`<Link>\` 프리페칭 동작 개선

### 4. 부분 프리렌더링 (PPR)
정적 콘텐츠와 동적 콘텐츠를 한 페이지에서 혼합할 수 있는 PPR이 실험적 기능으로 추가되었습니다.

### 5. next/after API
응답 스트리밍 완료 후 비동기 작업을 실행할 수 있는 새로운 API입니다. 분석, 로깅 등에 활용됩니다.

> "Next.js 15는 프레임워크의 성숙도를 보여주는 릴리스입니다." — Guillermo Rauch`,

  'seed-2': `## React Server Components 핵심 요약

### 서버 컴포넌트란?
서버에서만 실행되는 React 컴포넌트입니다. 번들에 포함되지 않아 초기 로딩이 빨라집니다.

### 클라이언트 vs 서버 컴포넌트
| 특성 | 서버 | 클라이언트 |
|------|------|-----------|
| useState/useEffect | ✗ | ✓ |
| 브라우저 API | ✗ | ✓ |
| DB 직접 접근 | ✓ | ✗ |
| 번들 포함 | ✗ | ✓ |

### 'use client' 경계
\`\`\`tsx
// ServerComponent.tsx — 서버에서 실행
import { ClientButton } from './ClientButton';

export default async function Page() {
  const data = await db.query('SELECT * FROM posts');
  return (
    <div>
      <h1>{data.title}</h1>
      <ClientButton /> {/* 여기서 클라이언트 경계 */}
    </div>
  );
}
\`\`\`

### 핵심 패턴
1. **데이터를 props로 내려보내기** — 서버에서 fetch, 클라이언트에 전달
2. **Composition Pattern** — 서버 컴포넌트가 클라이언트 컴포넌트를 children으로 감싸기
3. **Serialization 제약** — props는 직렬화 가능해야 함 (함수 전달 불가)`,

  'seed-3': `## Vercel AI SDK 개요

### 설치
\`\`\`bash
npm install ai @ai-sdk/openai
\`\`\`

### 핵심 기능

#### useChat — 대화형 인터페이스
\`\`\`tsx
'use client';
import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
\`\`\`

#### 스트리밍 응답
\`\`\`ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Explain React Server Components',
});
\`\`\`

### 지원 프로바이더
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 4.5 Sonnet, Claude Opus 4)
- Google (Gemini 2.5 Pro)
- Mistral, Cohere, Amazon Bedrock 등

### 레포지토리 통계
Stars: **12,400+** · Forks: **1,800+** · Contributors: **180+**`,

  'seed-4': `## Dan Abramov의 상태 관리 관점

### 스레드 요약

> "상태를 한 곳에서 관리해야 한다는 건 2015년의 사고방식입니다."

Dan은 상태를 다음과 같이 분류합니다:

**1. Server State** (서버 상태)
- 데이터베이스에서 오는 데이터
- TanStack Query, SWR로 관리
- 캐시 무효화가 핵심

**2. Client State** (UI 상태)
- 모달 열림/닫힘, 사이드바, 폼 입력
- Zustand, Jotai 같은 경량 솔루션
- "이걸 위해 Redux를 쓸 필요 없습니다"

**3. URL State**
- 필터, 정렬, 페이지네이션
- nuqs, next/navigation의 searchParams
- 공유 가능한 상태

**4. Form State**
- react-hook-form, Conform
- 서버 액션과 결합

### 핵심 메시지
> "Redux를 미워하지 마세요. 하지만 2025년에 새 프로젝트를 시작한다면,
> 상태의 종류를 먼저 분류하고 각각에 맞는 도구를 선택하세요."

**2,890 좋아요** · **890 리트윗** · **342 댓글**`,

  'seed-5': `## TypeScript 실전 팁 10가지

### 1. satisfies 연산자
\`\`\`ts
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} satisfies Record<string, string | number>;
// 타입 추론 유지 + 구조 검증
\`\`\`

### 2. const assertion으로 리터럴 타입
\`\`\`ts
const ROUTES = ['/', '/about', '/blog'] as const;
type Route = typeof ROUTES[number]; // '/' | '/about' | '/blog'
\`\`\`

### 3. Discriminated Union
\`\`\`ts
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
\`\`\`

### 4. 조건부 타입 + infer
\`\`\`ts
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Data = UnwrapPromise<Promise<string>>; // string
\`\`\`

### 5. Template Literal Types
\`\`\`ts
type EventName = \`on\${Capitalize<'click' | 'focus' | 'blur'>}\`;
// 'onClick' | 'onFocus' | 'onBlur'
\`\`\`

### 6~10.
- **6.** Record + Partial 조합으로 유연한 설정 객체
- **7.** Extract/Exclude로 유니온 타입 필터링
- **8.** NoInfer<T>로 추론 방향 제어 (TS 5.4+)
- **9.** using 키워드로 리소스 자동 정리 (TS 5.2+)
- **10.** 제네릭 컴포넌트 props 패턴`,

  'seed-6': `## Tailwind CSS v4 핵심 변경사항

### CSS-first 설정
\`tailwind.config.js\` 대신 CSS에서 직접 설정:
\`\`\`css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.7 0.15 180);
  --font-sans: 'Pretendard', sans-serif;
  --breakpoint-3xl: 1920px;
}
\`\`\`

### 성능 개선
- **빌드 속도**: v3 대비 최대 **10배** 빠름
- **증분 빌드**: 변경된 파일만 재처리
- **Lightning CSS** 기반 파서

### oklch 색상 시스템
P3 색 공간 지원으로 더 넓은 색상 범위:
\`\`\`css
.text-primary {
  color: oklch(0.7 0.15 180);
}
\`\`\`

### 마이그레이션 가이드
\`\`\`bash
npx @tailwindcss/upgrade
\`\`\`

주요 변경:
- \`darkMode: 'class'\` → CSS 변수 기반 자동 처리
- \`@apply\` 대신 CSS 변수 사용 권장
- 플러그인 API 변경 (v3 플러그인 호환성 확인 필요)

**r/webdev 반응**: "이게 진짜 CSS-in-JS 킬러" · 1,340 upvotes`,

  'seed-7': `## PostgreSQL 인덱싱 전략

### 인덱스 유형 비교

| 유형 | 용도 | 장점 | 단점 |
|------|------|------|------|
| B-tree | 기본, 범위/정렬 | 범용적 | 대용량 텍스트 비효율 |
| GIN | 배열, JSONB, FTS | 포함 검색 빠름 | 쓰기 느림 |
| BRIN | 시계열 데이터 | 매우 작은 크기 | 랜덤 분포 비효율 |
| GiST | 지리, 범위 | 유연함 | 정확도 낮음 |

### EXPLAIN ANALYZE 읽기
\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM clips
WHERE user_id = 'abc' AND is_archived = false
ORDER BY created_at DESC
LIMIT 50;
\`\`\`

핵심 지표:
- **Seq Scan** → 인덱스 없음, 전체 스캔
- **Index Scan** → 인덱스 활용
- **Bitmap Index Scan** → 여러 조건 결합

### 복합 인덱스 설계
\`\`\`sql
-- 컬럼 순서: 등호 조건 → 범위/정렬
CREATE INDEX idx_clips_user_active
ON clips (user_id, is_archived, created_at DESC);
\`\`\`

### Partial Index
\`\`\`sql
-- 아카이브되지 않은 클립만 인덱싱 (저장 공간 절약)
CREATE INDEX idx_clips_active
ON clips (user_id, created_at DESC)
WHERE is_archived = false;
\`\`\`

> "올바른 인덱스 하나가 ORM 최적화 열 줄보다 낫다." — ByteByteGo`,

  'seed-8': `## 2025 프론트엔드 개발자 로드맵

### 필수 스택
- **React 19** + Next.js 15 (App Router)
- **TypeScript 5.x** (strict mode 필수)
- **Tailwind CSS v4** + shadcn/ui

### 올해 주목할 기술

#### Web Standards
- **View Transitions API** — 페이지 전환 애니메이션
- **Container Queries** — 부모 크기 기반 반응형
- **Popover API** — 네이티브 팝오버/툴팁
- **CSS Anchor Positioning** — 요소 간 위치 연결

#### Performance
- 코어 웹 바이탈 (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- React Compiler (자동 메모이제이션)
- Partial Prerendering (PPR)

#### AI Integration
- AI SDK (Vercel AI, LangChain.js)
- Prompt Engineering for UX
- AI-powered code review & testing

#### 접근성
- WCAG 2.2 AA 기준
- 시맨틱 HTML + ARIA
- 키보드 네비게이션 + 스크린 리더 테스트

### 추천 학습 경로
1. TypeScript 마스터 → 2. React 심화 → 3. Next.js App Router →
4. 성능 최적화 → 5. 테스트 (Vitest + Playwright) → 6. AI 통합

**22,300 조회** · **1,876 좋아요** · **234 댓글**`,
};
