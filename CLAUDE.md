# Linkbrain v2

> 글로벌 규칙은 `~/.claude/CLAUDE.md`. 이 파일은 프로젝트 고유 규칙.

## 프로젝트 메타
- **Next.js 15 App Router** + TypeScript strict + Tailwind v4 + shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)
- **서버 상태**: TanStack Query v5 (캐싱, optimistic update)
- **클라이언트 상태**: Zustand 2개 (ui-store, preferences-store)
- **Brand**: `#21DBA4` (hover: `#1BC290`), Pretendard Variable 16px
- **배포**: Vercel (linkbrain.cloud)

## 기술 스택 규칙

### 상태 관리
- **서버 데이터**: 반드시 TanStack Query 사용 (`useQuery`, `useMutation`)
- **UI 전용 상태**: Zustand `ui-store` (sidebar, viewMode, filters, sort)
- **사용자 설정**: Zustand `preferences-store` (theme, language) - localStorage 저장
- Context API 사용 금지. Zustand 스토어 추가 금지 (2개만 유지)

### Supabase
- 클라이언트: `@/lib/supabase/client.ts` (브라우저)
- 서버: `@/lib/supabase/server.ts` (Server Component, Route Handler)
- 관리자: `@/lib/supabase/admin.ts` (Service Role, API Route 전용)
- RLS 항상 활성화. 서버 mutation은 Server Action 또는 Supabase 직접 호출
- Realtime: 단일 `useRealtimeInvalidation` 훅으로 통합 → TanStack Query 캐시 무효화

### 렌더링 전략
| 라우트 | 렌더링 |
|--------|--------|
| 마케팅 (`/`, `/features`, `/pricing`) | SSG |
| 인증 (`/login`, `/signup`) | SSR |
| 앱 (`/dashboard`, `/studio`, `/insights`) | Server Component → Client Component 하이브리드 |
| 공개 클립 (`/clip/[id]`) | SSR + ISR(1h) |
| 탐색 (`/explore`) | SSR + ISR(5m) |

### 컴포넌트 규칙
- shadcn/ui 기반 (`components/ui/`). 직접 Radix import 최소화
- 파일 크기: 컴포넌트 < 300줄, 훅 < 200줄, 유틸 < 150줄
- `cn()` 함수 사용 (`@/lib/utils`)
- "use client"는 필요한 컴포넌트에만 (최소 범위)

### TanStack Query 패턴
```typescript
// Query keys: ['entity', userId, ...params]
// Mutations: optimistic update + onError rollback
// Realtime: useRealtimeInvalidation이 자동으로 캐시 무효화
```

### Optimistic UI
- 모든 사용자 액션 (즐겨찾기, 아카이브, 삭제, 이동)에 optimistic update 적용
- `useMutation`의 `onMutate`에서 즉시 UI 반영, `onError`에서 롤백

## 디자인 시스템

### 색상 (CSS 변수)
- 배경: `bg-background`, `bg-surface`, `bg-surface-hover`
- 텍스트: `text-foreground`, `text-muted`, `text-subtle`
- 테두리: `border-border`, `border-border-hover`
- 브랜드 `#21DBA4`는 로고/특수 강조에만 직접 사용

### Z-Index 계층 (절대 커스텀 z 금지)
| 용도 | CSS 변수 | 값 |
|------|----------|-----|
| 드롭다운 | `--z-dropdown` | 20 |
| 스티키 | `--z-sticky` | 30 |
| 오버레이 | `--z-overlay` | 40 |
| 모달 | `--z-modal` | 50 |
| 팝오버 | `--z-popover` | 60 |
| 토스트 | `--z-toast` | 70 |

### 타이포그래피
Pretendard Variable. text-xs(12) / text-sm(14) / text-base(16) / text-lg(18) / text-xl(20) / text-2xl+(24+)

### 4상태 비동기 UX
모든 비동기 UI: loading(스켈레톤) / success / empty(안내+행동유도) / error(원인+해결책)

## 코드 품질
- `any` 타입 절대 금지 → `unknown` + 타입 가드
- TypeScript strict: noImplicitAny, strictNullChecks, strictFunctionTypes
- `console.log` PR에 남기지 않음
- 조건부 훅 호출 금지
- 에러: try/catch + `unknown` 타입

### 중복 방지 규칙
- **플랫폼 상수**: `PLATFORM_COLORS`, `PLATFORM_ICONS`, `PLATFORM_LABELS_EN`, `GRADIENT_COLORS`, `getGradient`는 **반드시** `@/config/constants.ts`에서 import. 로컬 복사본 생성 금지
- **클립 콘텐츠 유틸**: `extractYouTubeVideoId`, `extractImagesFromContent`, `splitContentSections`는 **반드시** `@/lib/utils/clip-content.ts`에서 import
- **Auth 게이트 감지**: `hasAuthGate()`는 `@/lib/fetchers/utils.ts`에서 import. 인라인 재구현 금지
- **DB batch 패턴**: 반복문 안에서 개별 INSERT 금지 → batch upsert + re-query 패턴 사용 (예: `autoTagClip`)

### 오버레이/그라데이션
- 콘텐츠 위에 겹치는 그라데이션 div는 반드시 `pointer-events-none` 추가 (CollapsibleSection 등)

## 네이밍
- 파일: `kebab-case.tsx`
- 컴포넌트: `PascalCase`
- 함수/변수: `camelCase`
- 상수: `SCREAMING_SNAKE_CASE`
- DB 컬럼: `snake_case`

## 커밋
- 영어 prefix: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `test:`
- Phase별 브랜치: `feat/phase-0-init`, `feat/phase-1-auth`, ...

## 참조
- 계획서: `docs/linkbrain-v2-rebuild-plan.md`
- 기존 코드: `/Users/yoogeon/Desktop/Appbuild/Linkbrain/`
- 디자인: Raindrop.io 스타일 (깔끔한 카드/리스트, 미니멀 사이드바)
