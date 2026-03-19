# Review Context — Linkbrain v2

## Tech Stack
- **Framework**: Next.js 15 App Router + TypeScript strict + Turbopack
- **Styling**: Tailwind CSS v4 + shadcn/ui + tw-animate-css
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Server State**: TanStack Query v5
- **Client State**: Zustand (ui-store, preferences-store)
- **Forms**: react-hook-form + zod
- **Animation**: motion (framer-motion successor)
- **Deployment**: Vercel (linkbrain.cloud)
- **Payments**: Lemon Squeezy
- **Testing**: vitest (31 test files), Playwright (e2e)

## Directory Structure
```
src/
├── app/
│   ├── (app)/          # 인증 필요 앱 라우트
│   │   ├── dashboard/  archive/  favorites/  read-later/
│   │   ├── clip/[clipId]/  collections/[collectionId]/
│   │   ├── studio/  insights/  graph/  highlights/  images/
│   │   └── settings/
│   ├── (auth)/         # 로그인/회원가입
│   ├── (marketing)/    # 랜딩, features, pricing
│   ├── (explore)/      # 공개 탐색
│   ├── admin/          # 관리자 패널
│   ├── api/            # 40+ API 라우트
│   │   ├── v1/clips/   # CRUD, bulk, export, import, upload
│   │   ├── v1/ai/      # AI 채팅
│   │   ├── v1/oauth/   # Threads OAuth
│   │   ├── v1/conversations/  collections/  keys/  credits/
│   │   ├── webhooks/lemonsqueezy/
│   │   ├── internal/   # process-clip, backfill-embeddings
│   │   └── cron/       # retry-failed-clips
│   ├── s/[token]/      # 공유 링크
│   ├── c/[token]/      # 컬렉션 공유
│   └── p/[clipId]/     # 공개 클립
├── components/         # 107 TSX 컴포넌트
├── lib/
│   ├── fetchers/       # URL 콘텐츠 추출 (orchestrator, threads, instagram, youtube)
│   ├── normalizers/    # 콘텐츠 정규화
│   ├── ai/             # AI 프롬프트, 채팅 도구
│   ├── hooks/          # 54 커스텀 훅
│   ├── services/       # clip-service, embedding-service
│   ├── supabase/       # client, server, admin
│   ├── oauth/          # Threads OAuth
│   ├── api/            # withAuth 미들웨어
│   └── utils/          # clip-content, url-validator 등
├── config/             # constants.ts (플랫폼 색상, 아이콘)
└── types/              # TypeScript 타입 정의
```

## Key Features
- 클립 저장/관리 (북마크 + 콘텐츠 추출)
- AI 채팅 (RAG + function calling, pgvector 임베딩)
- Content Studio (AI 콘텐츠 생성)
- 컬렉션/카테고리/태그 관리
- Threads/Instagram OAuth 연동
- 하이라이트/주석/메모
- 그래프 뷰 (xyflow)
- 이미지 앨범
- 크레딧/플랜 시스템 (Lemon Squeezy)
- API 키 관리 (lb_ prefix)
- MCP 서버 (23 도구)
- PWA + Capacitor (iOS/Android)
- 공유 링크 (s/[token], c/[token])
- 관리자 패널

## DB Migrations Applied
001~007, 017(plan_system), 019(embeddings), 020~021(ai_keys), 022(nav_counts_rpc)

## Environment
- Supabase project: ucflmznygocgdwreoygc
- Brand: #21DBA4
- Font: Pretendard Variable
