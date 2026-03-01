# Linkbrain v2 - Next.js Full Rebuild Plan

## Context

Linkbrain은 현재 React 18 + Vite + Firebase 기반 SPA로 운영 중인 세컨드브레인 지식 관리 앱이다 (linkbrain.cloud). 핵심 문제:

1. **`LinkBrainApp.tsx` 3,453줄 모놀리스** — 사이드바, 헤더, 검색, 필터, 클립 그리드, 모달 조율, DnD를 모두 한 파일에서 처리
2. **z-index 충돌** — `createPortal` + `z-[9999]`가 모달을 가리는 프로덕션 버그 (롤백 이력 있음)
3. **중복 onSnapshot 18개+** — 독립적 훅들이 각자 Firestore 리스너를 생성, 성능 저하
4. **SSR/SEO 불가** — SPA이므로 마케팅/탐색/공유 페이지에 OG태그/서버렌더링 불가
5. **코드 품질** — `any` 타입, 하드코딩, heavy content(htmlContent)를 React state에 포함

**목표**: Next.js 15 App Router + Supabase + Tailwind v4 기반으로 처음부터 재구축. Raindrop.io 스타일의 깔끔한 UI. 코드 품질 A급 이상.

**결정 사항**:
- Payment: LemonSqueezy 유지
- Native: Capacitor 유지 (Next.js static export)
- Design: Raindrop.io 스타일 (깔끔한 카드/리스트, 미니멀 사이드바)
- Backend: **Firebase → Supabase 전환** (Auth, PostgreSQL, Storage, Realtime)

---

## 1. 기술 스택

| 영역 | 현재 | v2 |
|------|------|-----|
| Framework | React 18 + Vite | **Next.js 15 App Router** |
| Language | TypeScript (느슨) | **TypeScript strict mode** |
| Backend | Firebase (Auth/Firestore/Storage) | **Supabase (Auth/PostgreSQL/Storage/Realtime)** |
| Styling | Tailwind v4 + Radix UI | **Tailwind v4 + shadcn/ui** |
| State | Context API (3개) + 24 hooks | **Zustand (8 stores)** |
| Animation | motion/react | **motion/react** (유지) |
| Icons | Lucide React | **Lucide React** (유지) |
| Forms | react-hook-form + zod | **react-hook-form + zod** (유지) |
| AI | OpenAI + Google Gemini | **OpenAI + Google Gemini** (유지) |
| Payment | LemonSqueezy | **LemonSqueezy** (유지) |
| Native | Capacitor (iOS/Android) | **Capacitor** (유지, static export) |
| PWA | Custom SW | **@serwist/next** |
| Testing | 없음 | **Vitest + Playwright** |
| Deploy | Vercel | **Vercel** (유지) |
| Font | Pretendard Variable | **Pretendard Variable** (next/font/local) |

---

## 2. Supabase 마이그레이션 설계

### 2.1 데이터베이스 스키마 (PostgreSQL)

현재 Firestore 컬렉션을 PostgreSQL 테이블로 변환:

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en')),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  openai_api_key TEXT, -- 암호화 저장
  google_ai_key TEXT,  -- 암호화 저장
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 카테고리
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 컬렉션
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 클립 (핵심 테이블)
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  image TEXT,
  platform TEXT CHECK (platform IN ('web', 'youtube', 'instagram', 'threads', 'twitter', 'naver', 'pinterest')),
  author TEXT,
  author_handle TEXT,
  author_avatar TEXT,
  read_time INTEGER,
  ai_score REAL,
  is_favorite BOOLEAN DEFAULT false,
  is_read_later BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 클립 콘텐츠 (heavy content 분리 - 성능 핵심)
CREATE TABLE clip_contents (
  clip_id UUID PRIMARY KEY REFERENCES clips(id) ON DELETE CASCADE,
  html_content TEXT,
  content_markdown TEXT,
  raw_markdown TEXT
);

-- 클립-컬렉션 다대다
CREATE TABLE clip_collections (
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (clip_id, collection_id)
);

-- 태그
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE clip_tags (
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (clip_id, tag_id)
);

-- AI 대화 히스토리
CREATE TABLE clip_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 구독
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team', 'master')),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  lemon_squeezy_id TEXT,
  trial_start_date TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 크레딧
CREATE TABLE credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_used INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 50,
  reset_date TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 소셜: 팔로우
CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- 소셜: 좋아요
CREATE TABLE likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, clip_id)
);

-- 알림
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow', 'like', 'save', 'comment', 'system'
  actor_id UUID REFERENCES users(id),
  clip_id UUID REFERENCES clips(id),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API 키
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- 처음 8자
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 웹훅
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- {'clip.created', 'clip.updated', ...}
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 공지사항
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT CHECK (type IN ('banner', 'popup', 'changelog')),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_clips_user_id ON clips(user_id);
CREATE INDEX idx_clips_user_created ON clips(user_id, created_at DESC);
CREATE INDEX idx_clips_user_category ON clips(user_id, category_id);
CREATE INDEX idx_clips_user_platform ON clips(user_id, platform);
CREATE INDEX idx_clips_public ON clips(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_clips_url ON clips(user_id, url);
CREATE INDEX idx_clip_tags_tag ON clip_tags(tag_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_likes_clip ON likes(clip_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Full Text Search
ALTER TABLE clips ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'C')
  ) STORED;
CREATE INDEX idx_clips_fts ON clips USING GIN(fts);
```

### 2.2 Row Level Security (RLS)

```sql
-- 클립: 본인만 CRUD, public 클립은 누구나 읽기
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clips"
  ON clips FOR ALL
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can view public clips"
  ON clips FOR SELECT
  USING (is_public = true);

-- 카테고리/컬렉션: 본인만
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own categories"
  ON categories FOR ALL
  USING (auth.uid()::text = user_id::text);

-- API 키 인증 시 RLS 바이패스를 위한 서비스 롤 사용
```

### 2.3 Supabase Realtime

Firestore `onSnapshot` → Supabase Realtime 전환:

```typescript
// stores/clips-store.ts
import { supabase } from '@/lib/supabase/client';

export const useClipsStore = create<ClipsStore>((set, get) => ({
  clips: [],
  loading: true,

  subscribe: (userId: string) => {
    // 초기 로드
    supabase
      .from('clips')
      .select('*, categories(*), clip_tags(tags(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => set({ clips: data ?? [], loading: false }));

    // 실시간 구독
    const channel = supabase
      .channel('clips-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clips',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // INSERT, UPDATE, DELETE 처리
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          switch (eventType) {
            case 'INSERT':
              return { clips: [newRecord as ClipData, ...state.clips] };
            case 'UPDATE':
              return { clips: state.clips.map(c => c.id === newRecord.id ? newRecord as ClipData : c) };
            case 'DELETE':
              return { clips: state.clips.filter(c => c.id !== oldRecord.id) };
            default:
              return state;
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
```

### 2.4 Auth 마이그레이션

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
}

// lib/supabase/admin.ts (서버 전용)
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Auth 흐름**:
- 웹: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- 네이티브(Capacitor): `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'capacitor://callback' } })`
- 세션: Supabase SSR 패키지가 쿠키 기반 세션 자동 관리
- Middleware: `@supabase/ssr`의 `updateSession()` 사용

### 2.5 Storage 마이그레이션

```typescript
// 이미지 업로드
const { data, error } = await supabase.storage
  .from('clip-images')
  .upload(`${userId}/${clipId}.webp`, file, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  });

// 공개 URL
const { data: { publicUrl } } = supabase.storage
  .from('clip-images')
  .getPublicUrl(`${userId}/${clipId}.webp`);
```

---

## 3. 디렉토리 구조

```
linkbrain-v2/
├── app/
│   ├── (marketing)/                # SSG 마케팅 페이지
│   │   ├── layout.tsx              # NavBar + Footer
│   │   ├── page.tsx                # 랜딩 홈
│   │   ├── features/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── docs/api/page.tsx       # API 문서
│   │
│   ├── (auth)/                     # 인증 페이지
│   │   ├── layout.tsx              # 미니멀 센터 레이아웃
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx       # OAuth callback
│   │
│   ├── (app)/                      # 인증 필요 앱
│   │   ├── layout.tsx              # AppShell (사이드바 + 헤더 + 콘텐츠)
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # 메인 클립 리스트
│   │   │   └── loading.tsx
│   │   ├── clip/[clipId]/
│   │   │   ├── page.tsx            # 클립 상세 (전체 페이지)
│   │   │   └── loading.tsx
│   │   ├── collections/
│   │   │   ├── page.tsx            # 컬렉션 리스트
│   │   │   └── [collectionId]/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── archive/page.tsx
│   │   ├── studio/
│   │   │   ├── page.tsx            # Content Studio
│   │   │   └── loading.tsx
│   │   ├── insights/
│   │   │   ├── page.tsx            # AI 인사이트
│   │   │   └── loading.tsx
│   │   └── settings/
│   │       ├── page.tsx            # 일반 설정
│   │       ├── ai/page.tsx         # AI 설정
│   │       ├── api-keys/page.tsx   # API 키 관리
│   │       └── integrations/page.tsx # Slack 등
│   │
│   ├── (explore)/                  # 커뮤니티 (SSR)
│   │   ├── layout.tsx
│   │   ├── explore/
│   │   │   ├── page.tsx            # 탐색 메인
│   │   │   └── loading.tsx
│   │   ├── topic/[topicId]/page.tsx
│   │   └── profile/[userId]/page.tsx # 크리에이터 프로필
│   │
│   ├── (admin)/                    # 관리자
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── page.tsx            # 대시보드
│   │       ├── users/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── announcements/page.tsx
│   │
│   ├── clip/[clipId]/              # 공개 클립 뷰 (SSR + OG)
│   │   ├── page.tsx
│   │   └── opengraph-image.tsx     # 동적 OG 이미지
│   │
│   ├── api/                        # API 라우트
│   │   ├── v1/
│   │   │   ├── clips/
│   │   │   │   ├── route.ts        # GET (리스트), POST (생성)
│   │   │   │   └── [clipId]/route.ts # GET, PATCH, DELETE
│   │   │   ├── search/route.ts
│   │   │   ├── collections/route.ts
│   │   │   ├── manage/route.ts     # categories, tags, bulk, webhooks
│   │   │   ├── ai/route.ts
│   │   │   └── keys/route.ts
│   │   ├── analyze/route.ts        # URL 분석
│   │   ├── webhooks/
│   │   │   └── lemonsqueezy/route.ts
│   │   └── integrations/
│   │       └── slack/route.ts
│   │
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── manifest.ts                 # PWA manifest
│   └── sitemap.ts                  # 동적 sitemap
│
├── components/
│   ├── ui/                         # shadcn/ui 기본 컴포넌트 (~48개)
│   ├── layout/
│   │   ├── marketing-nav.tsx
│   │   ├── marketing-footer.tsx
│   │   ├── app-sidebar.tsx         # Raindrop 스타일 사이드바
│   │   ├── app-header.tsx          # 검색 + 뷰 토글 + 정렬
│   │   ├── app-shell.tsx           # 사이드바 + 메인 + 패널 조합
│   │   ├── mobile-bottom-nav.tsx   # 모바일 하단 탭
│   │   └── command-palette.tsx     # Cmd+K 검색
│   ├── clips/
│   │   ├── clip-card.tsx           # 카드 뷰 (Raindrop 스타일)
│   │   ├── clip-row.tsx            # 리스트 뷰
│   │   ├── clip-list.tsx           # 가상화된 목록
│   │   ├── clip-detail.tsx         # 클립 상세 패널
│   │   ├── clip-actions.tsx        # 즐겨찾기, 아카이브, 공유
│   │   ├── clip-filters.tsx        # 필터/정렬 컨트롤
│   │   ├── add-clip-dialog.tsx     # 새 클립 추가
│   │   ├── bulk-actions-bar.tsx    # 멀티셀렉트 액션
│   │   └── platform-badge.tsx      # 플랫폼별 배지
│   ├── collections/
│   │   ├── collection-list.tsx
│   │   ├── collection-card.tsx
│   │   └── collection-picker.tsx
│   ├── explore/
│   │   ├── explore-feed.tsx        # 피드 스타일 탐색
│   │   ├── explore-card.tsx
│   │   ├── filter-chips.tsx
│   │   ├── editors-pick.tsx
│   │   ├── like-button.tsx
│   │   ├── follow-button.tsx
│   │   └── notification-center.tsx
│   ├── studio/
│   │   ├── studio-page.tsx
│   │   ├── content-type-grid.tsx
│   │   ├── generation-form.tsx
│   │   └── output-preview.tsx
│   ├── insights/
│   │   ├── insights-dashboard.tsx
│   │   ├── interest-timeline.tsx
│   │   └── save-pattern-heatmap.tsx
│   ├── admin/
│   │   ├── admin-overview.tsx
│   │   ├── users-table.tsx
│   │   └── analytics-charts.tsx
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   ├── features-section.tsx
│   │   ├── pricing-section.tsx
│   │   └── social-proof.tsx
│   ├── media/
│   │   ├── youtube-embed.tsx       # 지연 로딩 YouTube
│   │   ├── image-gallery.tsx       # 다중 이미지 갤러리
│   │   ├── content-reader.tsx      # 읽기 모드
│   │   └── link-preview.tsx        # 리치 링크 프리뷰
│   ├── shared/
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── upgrade-prompt.tsx
│   │   ├── credit-display.tsx
│   │   └── platform-icon.tsx
│   └── providers/
│       ├── supabase-provider.tsx    # Supabase 클라이언트 제공
│       ├── theme-provider.tsx
│       └── toast-provider.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts               # 서버 컴포넌트용
│   │   ├── admin.ts                # Service role (API 라우트용)
│   │   ├── middleware.ts            # 세션 갱신
│   │   └── types.ts                # Database 타입 (supabase gen types)
│   ├── ai/
│   │   ├── openai.ts               # OpenAI 프로바이더
│   │   ├── gemini.ts               # Gemini 프로바이더
│   │   ├── prompts.ts              # 프롬프트 템플릿
│   │   └── service.ts              # AI 오케스트레이션
│   ├── fetchers/                   # URL 콘텐츠 추출 (서버 전용)
│   │   ├── types.ts                # PlatformFetcher 인터페이스
│   │   ├── orchestrator.ts         # 플랫폼 감지 + 라우팅
│   │   ├── web-fetcher.ts          # Jina Reader + Puppeteer
│   │   ├── youtube-fetcher.ts      # YouTube Data API + transcript
│   │   ├── threads-fetcher.ts      # Puppeteer + Jina 보완
│   │   ├── naver-fetcher.ts        # 모바일 URL 변환 + Jina
│   │   ├── instagram-fetcher.ts    # Puppeteer 패스스루
│   │   ├── social-fetcher.ts       # Twitter/Pinterest 패스스루
│   │   └── normalizers/
│   │       ├── web.ts
│   │       ├── threads.ts
│   │       └── naver.ts
│   ├── api/
│   │   ├── api-key-auth.ts         # X-API-Key 인증
│   │   ├── cors.ts                 # CORS 헤더
│   │   ├── rate-limiter.ts         # 요청 제한
│   │   ├── response.ts             # 표준화된 응답
│   │   ├── validate.ts             # Zod 스키마
│   │   └── webhooks.ts             # 웹훅 디스패치
│   ├── services/
│   │   ├── clip-service.ts         # 클립 CRUD + 분석
│   │   ├── image-extractor.ts      # 이미지 추출
│   │   ├── puppeteer-extractor.ts  # Puppeteer 스크래핑
│   │   └── export-service.ts       # 데이터 내보내기
│   ├── capacitor.ts                # 네이티브 플랫폼 감지
│   ├── utils.ts                    # cn(), formatDate() 등
│   └── constants.ts                # 번역, 색상 팔레트
│
├── stores/                         # Zustand 스토어
│   ├── auth-store.ts               # 사용자 + 인증 상태
│   ├── clips-store.ts              # 클립 + 실시간 구독
│   ├── collections-store.ts        # 컬렉션
│   ├── categories-store.ts         # 카테고리
│   ├── subscription-store.ts       # 구독 상태
│   ├── credits-store.ts            # 크레딧
│   ├── preferences-store.ts        # 설정 (테마, 언어)
│   └── ui-store.ts                 # UI 상태 (사이드바, 모달, 뷰모드)
│
├── hooks/
│   ├── use-feature-access.ts       # 구독 기반 기능 접근 제어
│   ├── use-content-studio.ts       # Content Studio 로직
│   ├── use-public-clips.ts         # 공개 클립 탐색
│   ├── use-ranking.ts              # 트렌딩/랭킹
│   ├── use-deep-links.ts           # 딥링크 처리
│   ├── use-media-query.ts          # 반응형 감지
│   └── use-keyboard-shortcuts.ts   # 전역 단축키
│
├── types/
│   ├── database.ts                 # Supabase 생성 타입
│   ├── clip.ts                     # ClipData, ClipFilters
│   ├── collection.ts
│   ├── subscription.ts
│   ├── api.ts                      # API 요청/응답
│   └── explore.ts                  # PublicClip, 소셜
│
├── config/
│   ├── credits.ts                  # 크레딧 비용, 플랜 제한
│   ├── subscription.ts             # 티어별 기능
│   ├── feature-flags.ts            # 기능 플래그
│   └── navigation.ts               # 사이드바 메뉴 구성
│
├── middleware.ts                   # Edge: 인증 확인, 리다이렉트
├── next.config.ts
├── capacitor.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   ├── icons/
│   ├── screenshots/
│   └── fonts/
│       └── PretendardVariable.woff2
└── supabase/
    ├── migrations/                 # SQL 마이그레이션
    ├── seed.sql                    # 시드 데이터
    └── config.toml                 # Supabase 로컬 설정
```

---

## 4. 라우트 아키텍처

### 4.1 렌더링 전략

| 라우트 | 렌더링 | 이유 |
|--------|--------|------|
| `/` (랜딩) | SSG | 정적 마케팅 |
| `/features`, `/pricing` | SSG | 정적 마케팅 |
| `/docs/api` | SSG | 정적 문서 |
| `/login`, `/signup` | SSR | OAuth 콜백 처리 |
| `/dashboard` | CSR | 실시간 데이터 |
| `/clip/[id]` (앱 내) | CSR | 실시간 편집 |
| `/clip/[id]` (공개) | SSR + ISR(1h) | SEO + OG 태그 |
| `/explore` | SSR + ISR(5m) | SEO + 신선한 데이터 |
| `/profile/[userId]` | SSR + ISR(1h) | SEO |
| `/admin/*` | CSR | 관리자 전용 |
| `/studio`, `/insights` | CSR | 인터랙티브 |

### 4.2 미들웨어 (인증 가드)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* 쿠키 읽기/쓰기 */ } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 보호된 라우트
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 관리자 라우트
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (user?.email !== 'beyondworks.br@gmail.com') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 로그인한 사용자가 로그인 페이지 접근 시
  if (user && ['/login', '/signup'].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*',
            '/studio/:path*', '/insights/:path*', '/login', '/signup'],
};
```

---

## 5. 상태 관리 (Zustand)

### 5.1 스토어 설계

현재 3개 Context + 24개 hooks → 8개 Zustand 스토어로 통합.

**핵심 원칙**:
- 각 스토어는 단일 Supabase Realtime 채널만 구독
- 서버 mutation은 Server Action 또는 직접 Supabase 호출
- 파생 상태는 스토어 내 getter로 계산

```typescript
// stores/auth-store.ts
interface AuthStore {
  user: User | null;
  loading: boolean;
  initialize: () => () => void; // 구독 해제 함수 반환
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// stores/clips-store.ts
interface ClipsStore {
  clips: ClipData[];
  loading: boolean;
  subscribe: (userId: string) => () => void;
  // 필터링/정렬은 클라이언트 사이드 (스토어의 clips에서 파생)
}

// stores/ui-store.ts
interface UIStore {
  sidebarOpen: boolean;
  viewMode: 'grid' | 'list' | 'headlines';
  searchQuery: string;
  selectedClipIds: Set<string>;
  activeModal: string | null;
  sortBy: 'created_at' | 'updated_at' | 'title' | 'ai_score';
  sortOrder: 'asc' | 'desc';
  filters: {
    categoryId: string | null;
    collectionId: string | null;
    platform: string | null;
    isFavorite: boolean;
    isArchived: boolean;
  };
}
```

### 5.2 초기화 플로우

```
RootLayout (Server Component)
  └── SupabaseProvider (Client)
        └── AppLayout (Client, (app)/layout.tsx)
              ├── auth-store.initialize()  // onAuthStateChange
              ├── user 변경 시:
              │   ├── clips-store.subscribe(userId)      // 1 채널
              │   ├── collections-store.subscribe(userId) // 1 채널
              │   ├── categories-store.subscribe(userId)  // 1 채널
              │   ├── subscription-store.subscribe(userId) // 1 채널
              │   ├── credits-store.subscribe(userId)     // 1 채널
              │   └── preferences-store.subscribe(userId) // 1 채널
              └── 컴포넌트 렌더
```

총 6개 Realtime 채널 (현재 18+ → 67% 감소).

---

## 6. UI/UX 디자인 (Raindrop.io 스타일)

### 6.1 디자인 토큰

```css
:root {
  /* 브랜드 */
  --brand: #21DBA4;
  --brand-hover: #1BC290;
  --brand-text: #1a8a6e; /* 라이트 모드 텍스트용 (AA 통과) */

  /* 배경 */
  --background: #FFFFFF;
  --surface: #F7F8FA;     /* Raindrop 스타일 밝은 회색 */
  --surface-hover: #EBEDF0;

  /* 텍스트 */
  --foreground: #1A1A2E;
  --muted: #717182;
  --subtle: #A0A0B0;

  /* 보더 */
  --border: #E5E5E5;
  --border-hover: #D0D0D0;

  /* Z-Index 스케일 (고정) */
  --z-dropdown: 20;
  --z-sticky: 30;
  --z-overlay: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-toast: 70;
}

.dark {
  --background: #0F0F0F;
  --surface: #1A1A1A;
  --surface-hover: #252525;
  --foreground: #E8E8E8;
  --muted: #888888;
  --subtle: #555555;
  --border: #2A2A2A;
  --border-hover: #3A3A3A;
}
```

### 6.2 레이아웃 시스템

**앱 레이아웃** (Raindrop 스타일):

```
+------------+-------------------------------------------+
| Sidebar    |  Header: Search | View | Sort | Add       |
| 240px      |--------------------------------------------|
|            |                                             |
| [Logo]     |  Clips Grid/List                           |
| [홈]       |  ┌──────┐ ┌──────┐ ┌──────┐              |
| [즐겨찾기]  |  │ Card │ │ Card │ │ Card │              |
| [아카이브]  |  └──────┘ └──────┘ └──────┘              |
| ─────────  |                                             |
| [컬렉션 1] |  ┌──────┐ ┌──────┐ ┌──────┐              |
| [컬렉션 2] |  │ Card │ │ Card │ │ Card │              |
| ─────────  |  └──────┘ └──────┘ └──────┘              |
| [카테고리]  |                                             |
| [설정]     |                                             |
+------------+-------------------------------------------+
```

**모바일 레이아웃**:

```
+--------------------------------------------+
| Status Bar (safe-area-inset-top)           |
|--------------------------------------------|
| Header: ← Title        Search  ⋯          |
|--------------------------------------------|
|                                            |
|  Full-width cards, stacked                 |
|  ┌──────────────────────────────┐          |
|  │ Clip Card                    │          |
|  └──────────────────────────────┘          |
|  ┌──────────────────────────────┐          |
|  │ Clip Card                    │          |
|  └──────────────────────────────┘          |
|                                            |
|--------------------------------------------|
| 홈 | 탐색 | (+) | 스튜디오 | 더보기      |
+--------------------------------------------+
| Safe Area Bottom                           |
+--------------------------------------------+
```

### 6.3 핵심 컴포넌트 명세

**ClipCard** (Raindrop 스타일 카드):
- 16:9 썸네일 (없으면 그라디언트 + 도메인 파비콘)
- 제목 (2줄 클램프)
- 요약 (3줄 클램프, 뮤트 색상)
- 메타: 도메인 | 읽기시간 | 플랫폼 배지
- 하단: 태그 칩 (최대 3개)
- 호버: 그림자 상승 + 액션 버튼 표시 (즐겨찾기, 더보기)
- 선택: 브랜드 보더 + 체크마크

**ClipRow** (리스트 뷰):
- 파비콘 | 제목 | 도메인 | 날짜 | 태그 | 액션
- 호버: 배경 하이라이트
- Raindrop 스타일의 깔끔한 행 레이아웃

**AppSidebar** (Raindrop 스타일):
- 로고 + 접기 버튼
- 고정 섹션: 홈, 즐겨찾기, 나중에 읽기, 아카이브
- 구분선
- 컬렉션 섹션: 컬렉션 목록 + 새 컬렉션 버튼
- 구분선
- 카테고리 섹션: 드래그 정렬 가능
- 하단: 설정, 업그레이드 버튼

**AddClipDialog**:
- Step 1: URL 입력 (auto-focus, 붙여넣기 감지)
- Step 2: 분석 프리뷰 (제목, 요약, 이미지, 추천 카테고리)
- Step 3: 정리 (카테고리, 컬렉션, 태그 선택)
- 모바일: 하단 Sheet로 표시

### 6.4 뷰 모드

| 모드 | 설명 | 적용 |
|------|------|------|
| Grid | 카드 그리드 (3-4열) | 기본값 (데스크톱) |
| List | 행 리스트 | 밀도 높은 보기 |
| Headlines | 제목만 (파비콘 + 제목 + 날짜) | 빠른 스캔 |
| Masonry | Pinterest 스타일 (탐색 전용) | 탐색 페이지 |

### 6.5 인터랙션 패턴

**모달/다이얼로그**:
- 데스크톱: Radix Dialog (center)
- 모바일: Sheet (bottom), 드래그 핸들 포함
- z-index: 항상 `--z-modal: 50` 사용 (절대 커스텀 z 사용 금지)
- 클립 상세: 사이드바 레이아웃 컬럼 (오버레이 아님, z-index 충돌 없음)

**애니메이션** (motion/react):
- 페이지 전환: `opacity 0→1, y 8→0` (200ms)
- 카드 진입: stagger `delay: i * 0.03`
- 즐겨찾기 토글: `scale [1, 1.3, 1]` (300ms)
- 모달 진입: `opacity + scale 0.95→1` (200ms)
- `prefers-reduced-motion` 시 모든 애니메이션 비활성화

**키보드 단축키**:
- `Cmd+K`: 커맨드 팔레트 (검색)
- `Cmd+N`: 새 클립
- `Escape`: 패널/모달 닫기
- `J/K`: 클립 탐색 (vim 스타일)
- `F`: 즐겨찾기 토글
- `A`: 아카이브

---

## 7. 기능별 구현 명세

### 7.1 클립 관리 (핵심 기능)

**생성 플로우**:
1. URL 입력 → `POST /api/analyze` 호출
2. 서버: 플랫폼 감지 → PlatformFetcher 실행 → 콘텐츠 추출 + AI 요약
3. 분석 결과 프리뷰 표시 (제목, 요약, 이미지, 카테고리 추천)
4. 사용자 확인 → Supabase `clips` + `clip_contents` 테이블에 INSERT
5. Realtime으로 UI 자동 갱신

**읽기 플로우**:
- 초기 로드: `supabase.from('clips').select('*').eq('user_id', userId)`
- 실시간: Supabase Realtime `postgres_changes` 구독
- 필터링/정렬: 클라이언트 사이드 (Zustand `ui-store`의 filters/sortBy 기반)
- 무한 스크롤: `limit` + `offset` 또는 cursor-based pagination

**콘텐츠 분리 패턴** (성능 핵심):
- `clips` 테이블: 메타데이터만 (title, summary, url, image...)
- `clip_contents` 테이블: heavy content (html_content, markdown...)
- 리스트에서는 `clips`만 로드, 상세 보기에서만 `clip_contents` JOIN

### 7.2 Content Studio

현재 구현 (`ContentStudioPage.tsx` + `useContentStudio.ts`) 기반 재구축:

**11가지 콘텐츠 타입** (유지):
1. Blog Post
2. SNS Post
3. Newsletter
4. Email Draft
5. Executive Summary
6. Key Concepts
7. Quiz
8. Mind Map
9. Review Notes
10. Teach-Back
11. Simplified Summary

**UI**: 2-컬럼 레이아웃
- 좌: 콘텐츠 타입 선택 + 설정 폼
- 우: 실시간 생성 프리뷰 (스트리밍)

### 7.3 커뮤니티/탐색 (강화)

**탐색 피드**:
```
(explore)/explore/page.tsx (SSR)
  탭: For You | Following | Trending | New
  피드: 무한 스크롤 카드 그리드
  카드: 썸네일 + 제목 + 저자 + 좋아요/저장 수
```

**크리에이터 프로필**:
```
(explore)/profile/[userId]/page.tsx (SSR)
  프로필 헤더: 아바타 + 이름 + 바이오 + 팔로우 버튼
  통계: 클립 수 | 팔로워 | 팔로잉
  탭: 공개 클립 | 컬렉션
```

**소셜 기능**:
- 좋아요: optimistic update + `likes` 테이블
- 팔로우: `follows` 테이블 + Realtime 알림
- "Add to My Brain": 공개 클립을 내 브레인으로 복사
- 알림: `notifications` 테이블 + Realtime 구독

### 7.4 미디어 강화

**YouTube 클립**:
- 지연 로딩 embed (썸네일 플레이스홀더 → 클릭 시 iframe)
- 트랜스크립트 표시 (접기/펼치기)
- AI 요약 하이라이트

**Instagram/Threads 클립**:
- 이미지 갤러리 (Embla Carousel)
- 작성자 정보 헤더

**웹 아티클 클립**:
- 읽기 모드 (마크다운 렌더링, 프리텐다드 서체)
- 코드 블록 구문 강조
- 목차 (긴 아티클)

### 7.5 PWA 최적화

```typescript
// app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LinkBrain - AI Second Brain',
    short_name: 'LinkBrain',
    display: 'standalone',
    theme_color: '#21DBA4',
    background_color: '#ffffff',
    start_url: '/',
    share_target: {
      action: '/share-target',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    shortcuts: [
      { name: 'Add Link', url: '/dashboard?action=add', icons: [{ src: '/icons/add.png', sizes: '192x192' }] },
      { name: 'My Links', url: '/dashboard', icons: [{ src: '/icons/links.png', sizes: '192x192' }] },
    ],
  };
}
```

**서비스 워커** (@serwist/next):
- 네트워크 우선: API 라우트
- 캐시 우선: 정적 자산, 폰트
- Stale-while-revalidate: 페이지 셸
- 오프라인 폴백 페이지

### 7.6 네이티브 앱 (Capacitor)

```typescript
// next.config.ts (네이티브 빌드용)
const nextConfig: NextConfig = {
  output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
  images: { unoptimized: !!process.env.CAPACITOR_BUILD },
  trailingSlash: !!process.env.CAPACITOR_BUILD,
};

// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'cloud.linkbrain.app',
  appName: 'LinkBrain',
  webDir: 'out', // Next.js static export
  plugins: {
    SplashScreen: { launchAutoHide: false },
    StatusBar: { style: 'dark' },
    Keyboard: { resize: 'none' },
  },
};
```

**빌드 스크립트**:
```json
{
  "dev": "next dev",
  "build": "next build",
  "build:native": "CAPACITOR_BUILD=true next build",
  "cap:sync": "npm run build:native && npx cap sync",
  "cap:ios": "npx cap open ios",
  "cap:android": "npx cap open android"
}
```

---

## 8. API 마이그레이션

### 8.1 엔드포인트 매핑

| 현재 (Vercel Serverless) | Next.js API Route | 비고 |
|--------------------------|-------------------|------|
| `api/v1/clips.ts` | `app/api/v1/clips/route.ts` | GET, POST |
| `api/v1/clips-detail.ts` | `app/api/v1/clips/[clipId]/route.ts` | GET, PATCH, DELETE |
| `api/v1/search.ts` | `app/api/v1/search/route.ts` | GET |
| `api/v1/collections.ts` | `app/api/v1/collections/route.ts` | GET, POST, PATCH, DELETE |
| `api/v1/manage.ts` | `app/api/v1/manage/route.ts` | 멀티 액션 |
| `api/v1/ai.ts` | `app/api/v1/ai/route.ts` | POST |
| `api/v1/keys.ts` | `app/api/v1/keys/route.ts` | GET, POST, DELETE |
| `api/integrations/slack.ts` | `app/api/integrations/slack/route.ts` | 유지 |
| `api/analyze.ts` | `app/api/analyze/route.ts` | 내부 + Server Action |
| `api/payment/*` | `app/api/webhooks/lemonsqueezy/route.ts` | 웹훅 |

### 8.2 인증 이중 레이어

- **웹 클라이언트**: Supabase 세션 쿠키 (자동)
- **외부 API** (MCP, Slack): `X-API-Key` 헤더 → `api_keys` 테이블 조회

```typescript
// lib/api/api-key-auth.ts
export async function authenticateRequest(request: NextRequest) {
  // 1. API 키 확인
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    const keyHash = hashApiKey(apiKey);
    const { data } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('key_hash', keyHash)
      .single();
    if (data) return { userId: data.user_id, method: 'api_key' };
  }

  // 2. Supabase 세션 확인
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { userId: user.id, method: 'session' };

  return null;
}
```

### 8.3 콘텐츠 페칭 파이프라인

현재 7개 플랫폼 페처 시스템 **전체 유지**. 코드 구조만 정리:

```
lib/fetchers/
  orchestrator.ts     ← api/_lib/url-content-fetcher.ts (메인 오케스트레이터)
  types.ts            ← api/_lib/fetchers/types.ts
  web-fetcher.ts      ← api/_lib/fetchers/web-fetcher.ts
  youtube-fetcher.ts  ← api/_lib/fetchers/youtube-fetcher.ts
  threads-fetcher.ts  ← api/_lib/fetchers/threads-fetcher.ts
  naver-fetcher.ts    ← api/_lib/fetchers/naver-fetcher.ts
  instagram-fetcher.ts← api/_lib/fetchers/instagram-fetcher.ts
  social-fetcher.ts   ← api/_lib/fetchers/social-fetcher.ts
  normalizers/
    web.ts            ← api/_lib/normalizers/web-normalizer.ts
    threads.ts        ← api/_lib/normalizers/threads-normalizer.ts
    naver.ts          ← api/_lib/normalizers/naver-normalizer.ts
```

Puppeteer는 Node.js 런타임 필요:
```typescript
// app/api/analyze/route.ts
export const runtime = 'nodejs';
export const maxDuration = 10; // Vercel Hobby 제한
```

---

## 9. 성능 전략

### 9.1 핵심 최적화

| 영역 | 방법 |
|------|------|
| 마케팅 페이지 | SSG (`force-static`), ISR 불필요 |
| 이미지 | `next/image` + WebP + responsive sizes |
| 폰트 | `next/font/local` + display: swap |
| 번들 | Route-based code split (자동) + dynamic import (recharts, @dnd-kit) |
| 리스트 | `@tanstack/virtual` 가상 스크롤 (100+ 클립) |
| 콘텐츠 분리 | clips/clip_contents 테이블 분리 (heavy content 지연 로드) |
| Realtime | 6개 채널로 통합 (현재 18+) |
| 캐시 | 공개 클립 ISR 1h, 탐색 ISR 5m |
| Edge | 미들웨어에서 인증 체크 (서버 함수 호출 없음) |

### 9.2 Core Web Vitals 목표

| 지표 | 목표 | 방법 |
|------|------|------|
| LCP | < 2.5s | SSG/SSR + next/image priority |
| FID | < 100ms | 최소 JS, code split |
| CLS | < 0.1 | 고정 크기 스켈레톤, next/image |
| TTFB | < 200ms | Edge 미들웨어, ISR |

---

## 10. 데이터 마이그레이션 (Firebase → Supabase)

### 10.1 마이그레이션 스크립트

```typescript
// scripts/migrate-firebase-to-supabase.ts
// 1. Firebase Admin SDK로 Firestore 전체 데이터 읽기
// 2. 사용자 → users 테이블
// 3. 카테고리 → categories 테이블
// 4. 컬렉션 → collections 테이블
// 5. 클립 → clips + clip_contents 테이블
// 6. 클립-컬렉션 관계 → clip_collections 테이블
// 7. 태그 → tags + clip_tags 테이블
// 8. 구독 → subscriptions 테이블
// 9. 크레딧 → credits 테이블
// 10. API 키 → api_keys 테이블

// 주의사항:
// - Firestore Timestamp → PostgreSQL TIMESTAMPTZ 변환
// - Firebase Auth UID → Supabase Auth mapping
// - 이미지 URL: Firebase Storage → Supabase Storage 복사
// - 데이터 무결성 검증 (클립 수, 사용자 수 대조)
```

### 10.2 Auth 마이그레이션

Firebase Auth 사용자를 Supabase Auth로 마이그레이션:
1. Firebase Admin으로 모든 사용자 export
2. Supabase Admin API로 사용자 생성 (동일 이메일, 동일 프로바이더)
3. Google OAuth는 사용자가 재로그인 시 자동 연결
4. 기존 Firebase UID → Supabase user.id 매핑 테이블 유지 (과도기)

### 10.3 Storage 마이그레이션

Firebase Storage의 이미지를 Supabase Storage로 복사:
1. Firebase Storage에서 모든 파일 목록 조회
2. 각 파일 다운로드 → Supabase Storage 업로드
3. clips 테이블의 image URL 업데이트

---

## 11. 테스트 전략

### 11.1 단위 테스트 (Vitest)

```
tests/
  unit/
    stores/           # Zustand 스토어 테스트
    lib/              # 유틸리티 함수 테스트
    api/              # Zod 스키마, 응답 포맷 테스트
    components/       # 컴포넌트 렌더링 테스트
```

### 11.2 통합 테스트

- API 라우트: `next-test-api-route-handler`
- Supabase: 로컬 Supabase 인스턴스 (`supabase start`)

### 11.3 E2E 테스트 (Playwright)

```
tests/e2e/
  auth.spec.ts        # 로그인/로그아웃 플로우
  clip-crud.spec.ts   # 클립 CRUD
  collections.spec.ts # 컬렉션 관리
  explore.spec.ts     # 탐색 페이지
  studio.spec.ts      # Content Studio
```

---

## 12. 구현 로드맵

### Phase 0: 프로젝트 초기화 (1-2일)
- [ ] Next.js 15 프로젝트 생성 (`create-next-app`)
- [ ] TypeScript strict 설정
- [ ] Tailwind v4 + shadcn/ui 설정
- [ ] Supabase 프로젝트 생성 + 스키마 마이그레이션 실행
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] ESLint + Prettier 설정
- [ ] Git 초기화 + 브랜치 전략

### Phase 1: 인프라 + 인증 (3-4일)
- [ ] Supabase 클라이언트/서버/admin 설정 (`lib/supabase/`)
- [ ] RLS 정책 적용
- [ ] Edge 미들웨어 (인증 가드)
- [ ] Auth 플로우 (로그인/회원가입/OAuth/로그아웃)
- [ ] Zustand 스토어: auth-store, preferences-store
- [ ] 데이터 마이그레이션 스크립트 작성 + 실행

### Phase 2: 앱 쉘 + 핵심 UI (5-7일)
- [ ] 루트 레이아웃 (폰트, 테마, 메타데이터)
- [ ] 앱 레이아웃 (사이드바 + 헤더 + 메인 영역)
- [ ] 모바일 하단 네비게이션
- [ ] Zustand 스토어: clips-store, collections-store, categories-store, ui-store
- [ ] 대시보드 페이지 (클립 그리드/리스트/헤드라인 뷰)
- [ ] 클립 카드 + 클립 행 컴포넌트 (Raindrop 스타일)
- [ ] 필터/정렬 UI
- [ ] 커맨드 팔레트 (Cmd+K 검색)
- [ ] 새 클립 추가 다이얼로그
- [ ] 클립 상세 뷰 (사이드 패널 또는 전체 페이지)

### Phase 3: API 마이그레이션 (3-4일)
- [ ] API 라우트 핸들러 전체 이식 (`app/api/v1/`)
- [ ] 콘텐츠 페칭 파이프라인 이식 (`lib/fetchers/`)
- [ ] URL 분석 엔드포인트 (`app/api/analyze/`)
- [ ] API 키 인증 미들웨어
- [ ] Zod 스키마 이식 (`lib/api/validate.ts`)
- [ ] MCP 서버 호환성 검증

### Phase 4: 기능 이식 (5-7일)
- [ ] 컬렉션 관리 페이지
- [ ] 카테고리 관리 (DnD 정렬)
- [ ] 즐겨찾기 / 나중에 읽기 / 아카이브
- [ ] Content Studio (11 콘텐츠 타입)
- [ ] AI 인사이트 대시보드
- [ ] 설정 페이지 (테마, 언어, AI, API 키, 통합)
- [ ] Zustand 스토어: subscription-store, credits-store
- [ ] 구독 + 크레딧 시스템
- [ ] LemonSqueezy 결제 연동

### Phase 5: 커뮤니티 + 소셜 (4-5일)
- [ ] 탐색 페이지 (SSR, 피드 스타일)
- [ ] 탐색 클립 카드 (좋아요, 저장)
- [ ] 크리에이터 프로필 페이지
- [ ] 팔로우/언팔로우 기능
- [ ] 좋아요 기능
- [ ] "Add to My Brain" (공개 클립 복사)
- [ ] 알림 센터
- [ ] Editor's Picks 큐레이션
- [ ] 트렌딩 알고리즘

### Phase 6: 마케팅 + SEO (2-3일)
- [ ] 랜딩 페이지 (SSG, 새 디자인)
- [ ] Features / How It Works / Pricing 페이지
- [ ] 공개 클립 뷰 (SSR + OG 태그 + 동적 OG 이미지)
- [ ] Sitemap 생성 (`app/sitemap.ts`)
- [ ] API 문서 페이지
- [ ] 구조화 데이터 (JSON-LD)

### Phase 7: PWA + 네이티브 (3-4일)
- [ ] @serwist/next 서비스 워커 설정
- [ ] 오프라인 폴백 페이지
- [ ] Web App Manifest (`app/manifest.ts`)
- [ ] Share Target 처리
- [ ] Capacitor 정적 빌드 설정
- [ ] iOS 시뮬레이터 테스트
- [ ] iOS Safe Area 처리
- [ ] 네이티브 Google 로그인 (Capacitor)

### Phase 8: 관리자 + 통합 (2-3일)
- [ ] 관리자 대시보드 (분석, 사용자, 구독)
- [ ] 공지사항 관리
- [ ] Slack 통합 이식
- [ ] 웹훅 시스템 이식

### Phase 9: 폴리싱 + 테스트 (3-5일)
- [ ] 접근성 감사 (WCAG 2.1 AA)
- [ ] Vitest 단위 테스트
- [ ] Playwright E2E 테스트
- [ ] Lighthouse 성능 감사
- [ ] 반응형 QA (모바일/태블릿/데스크톱)
- [ ] 에러 바운더리 + 로딩/빈 상태
- [ ] 키보드 단축키 최종 점검
- [ ] 크로스 브라우저 테스트

### Phase 10: 배포 + 마이그레이션 (2-3일)
- [ ] Vercel 배포 설정
- [ ] 도메인 연결 (linkbrain.cloud)
- [ ] 프로덕션 Supabase 설정
- [ ] 데이터 마이그레이션 실행 (프로덕션)
- [ ] 점진적 트래픽 전환
- [ ] 모니터링 설정

---

## 13. 참조 파일 (현재 코드베이스)

이식 시 반드시 참조해야 할 핵심 파일:

| 파일 | 크기 | 용도 | 이식 방향 |
|------|------|------|-----------|
| `Linkbrain UI/src/components/app/LinkBrainApp.tsx` | 3,453줄 | 앱 메인 모놀리스 | ~15개 파일로 분해 |
| `Linkbrain UI/src/hooks/useClips.ts` | - | 클립 CRUD + Firestore | Zustand stores + Supabase |
| `Linkbrain UI/src/lib/aiService.ts` | 48KB | AI 서비스 전체 | `lib/ai/service.ts` |
| `Linkbrain UI/src/lib/firebase.ts` | - | Firebase 초기화 | `lib/supabase/*.ts` |
| `Linkbrain UI/api/_lib/clip-service.ts` | 26KB | 클립 생성 파이프라인 | `lib/services/clip-service.ts` |
| `Linkbrain UI/api/_lib/url-content-fetcher.ts` | 33KB | URL 콘텐츠 추출 | `lib/fetchers/orchestrator.ts` |
| `Linkbrain UI/api/_lib/puppeteer-extractor.ts` | 42KB | Puppeteer 스크래핑 | `lib/services/puppeteer-extractor.ts` |
| `Linkbrain UI/api/_lib/fetchers/*.ts` | - | 플랫폼별 페처 | `lib/fetchers/*.ts` |
| `Linkbrain UI/api/v1/_lib/validate.ts` | 200줄 | Zod 스키마 16개 | `lib/api/validate.ts` |
| `Linkbrain UI/src/components/ui/*.tsx` | 48파일 | shadcn/ui 래퍼 | 복사 후 정리 |
| `Linkbrain UI/src/context/AppContext.tsx` | - | 전역 상태 | Zustand stores |
| `Linkbrain UI/src/context/SubscriptionContext.tsx` | - | 구독 상태 | subscription-store |
| `Linkbrain UI/src/styles/globals.css` | - | CSS 변수/토큰 | 통합 토큰 시스템 |
| `Linkbrain UI/src/components/ContentStudio/` | 6파일 | Content Studio | `components/studio/` |
| `AGENTS.md` | - | 디자인 시스템 규칙 | 코드 컨벤션 문서 |

---

## 14. 코드 품질 기준

### TypeScript
- `strict: true` (noImplicitAny, strictNullChecks, strictFunctionTypes)
- `any` 타입 사용 금지 → `unknown` + 타입 가드
- Supabase 생성 타입 사용 (`supabase gen types typescript`)
- 모든 컴포넌트 props에 명시적 인터페이스

### 파일 크기
- 컴포넌트 파일: 최대 300줄 (초과 시 분리)
- 훅: 최대 200줄
- 유틸리티: 최대 150줄

### 네이밍
- 파일: `kebab-case.tsx`
- 컴포넌트: `PascalCase`
- 함수/변수: `camelCase`
- 상수: `SCREAMING_SNAKE_CASE`
- 타입/인터페이스: `PascalCase`
- DB 컬럼: `snake_case`

### 커밋
- 영어 prefix: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `test:`
- Phase별 브랜치: `feat/phase-1-auth`, `feat/phase-2-app-shell`, ...

### 에러 처리
- API: Zod 검증 + 표준화된 에러 응답 (`{ error: string, code: number }`)
- 클라이언트: Error Boundary + Sonner toast
- 비동기: try/catch + `unknown` 타입 에러

---

## 15. 검증 방법

### 단계별 검증

**Phase 0-1 완료 후**:
- [ ] `supabase db reset` 후 스키마 재생성 확인
- [ ] 로그인 → 대시보드 리다이렉트 동작
- [ ] 미인증 사용자 `/dashboard` 접근 시 `/login` 리다이렉트
- [ ] RLS: 타 사용자 클립 접근 불가 확인

**Phase 2 완료 후**:
- [ ] 클립 CRUD 전체 동작 (생성, 읽기, 수정, 삭제)
- [ ] Realtime: 다른 탭에서 클립 추가 시 자동 반영
- [ ] 뷰 모드 전환 (그리드/리스트/헤드라인)
- [ ] 필터/정렬 동작
- [ ] 모바일 레이아웃 (375px 뷰포트)

**Phase 3 완료 후**:
- [ ] API v1 전체 엔드포인트 동작 (`curl` 테스트)
- [ ] MCP 서버 연결 테스트
- [ ] URL 분석 (웹, YouTube, Threads, Naver) 동작

**Phase 4-5 완료 후**:
- [ ] Content Studio 11 타입 생성 동작
- [ ] 구독/크레딧 시스템 동작
- [ ] 탐색 페이지 SSR 렌더링 확인
- [ ] 좋아요/팔로우/알림 동작

**Phase 6-7 완료 후**:
- [ ] Lighthouse 점수: Performance > 90, Accessibility > 90
- [ ] OG 태그: 공유 시 미리보기 확인 (Twitter Card Validator, Facebook Debugger)
- [ ] PWA: 설치 프롬프트 동작, 오프라인 폴백
- [ ] Capacitor: iOS 시뮬레이터에서 전체 플로우

**최종 검증**:
- [ ] Playwright E2E: 핵심 플로우 5개 통과
- [ ] 크로스 브라우저: Chrome, Safari, Firefox, Edge
- [ ] 모바일: iPhone SE, iPhone 15 Pro, Galaxy S24
- [ ] 프로덕션 배포 후 데이터 마이그레이션 검증
