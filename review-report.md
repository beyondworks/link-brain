# Pre-Deploy Review Report — Linkbrain v2

> 일시: 2026-03-19
> 브랜치: main (98d1eef)
> 리뷰 팀: 6개 에이전트 (코드 품질, 보안, UX, 빈 기능, 아키텍처, 접근성)

---

## 요약

- **총 이슈: 87개** (중복 제거 후 고유 이슈 기준)
- **심각도 분포**: Critical 12 / High 22 / Medium 33 / Low 20
- **배포 판정: NO-GO** (Critical 12건 존재)

| 관점 | Critical | High | Medium | Low | 합계 |
|------|----------|------|--------|-----|------|
| 코드 품질 | 4 | 7 | 9 | 6 | 26 |
| 보안 | 2 | 5 | 6 | 3 | 16 |
| UX | 2 | 6 | 10 | 8 | 26 |
| 빈 기능 | 3 | 5 | 6 | 4 | 18 |
| 아키텍처 | 1 | 4 | 8 | 3 | 16 |
| 접근성 | 3 | 5 | 8 | 2 | 18 |

> 일부 이슈는 여러 관점에서 중복 발견됨 (교차 관점 섹션 참조)

---

## Critical Issues (배포 차단)

### 1. [보안+아키텍처+코드] 인메모리 Rate Limiter — 서버리스에서 무효화
- **위치**: `src/lib/api/rate-limiter.ts`
- **문제**: `Map` 기반 인메모리 카운터. Vercel 서버리스에서 각 인스턴스가 독립 메모리 → rate limit 사실상 미적용. "Pro 5000 req/day" 제한이 실질적 효력 없음.
- **조치**: Upstash Redis(`@upstash/ratelimit`) 기반 분산 rate limiting으로 전환

### 2. [보안] Gemini API 키가 URL 쿼리 파라미터로 노출
- **위치**: `src/lib/ai/gemini.ts:24`
- **문제**: `?key=${apiKey}` → 서버 로그, CDN 로그에 사용자 API 키 기록
- **조치**: `x-goog-api-key` 헤더로 변경

### 3. [보안] `.env.check` 파일에 OIDC 토큰 하드코딩
- **위치**: `.env.check` (Git untracked이지만 `.gitignore` 미포함)
- **문제**: Vercel OIDC JWT 토큰, 관리자 이메일이 실수로 커밋될 위험
- **조치**: `.gitignore`에 추가 + 파일 삭제

### 4. [코드+아키텍처] `supabaseAdmin as any` — 51개 파일에서 타입 시스템 무력화
- **위치**: 51개 파일 전체
- **문제**: `any` 타입 절대 금지 규칙 위반. 컬럼명 오타, 필드 누락을 컴파일 타임에 잡지 못함
- **조치**: `supabase gen types typescript` 실행 후 `as any` 일괄 제거

### 5. [코드] 모듈 레벨 `process.env` 캐싱 — 보안 사고 가능
- **위치**: `webhooks/lemonsqueezy/route.ts:18`, `process-clip/route.ts:23`, `model-resolver.ts:37-42` 등 5곳
- **문제**: `WEBHOOK_SECRET`이 빈 문자열로 캐싱되면 결제 webhook 서명 검증 우회. `INTERNAL_SECRET`이 빈 값이면 클립 처리 전면 실패.
- **조치**: 함수 내부에서 환경변수 읽기 + null 체크

### 6. [코드] `autoTagClip` — 전체 tags 테이블 풀 스캔
- **위치**: `src/lib/services/clip-service.ts:236-241`
- **문제**: 매 클립 처리 시 전체 태그 SELECT. user_id 필터 없음. 태그 증가 시 메모리 초과 위험.
- **조치**: `.in('name', keywords)` 필터링으로 변경

### 7. [코드] `execListTags` — 전체 클립 keywords 풀 스캔
- **위치**: `src/lib/ai/chat-tools.ts:309-334`
- **문제**: 사용자의 모든 클립에서 keywords를 가져와 클라이언트 집계. limit 없음.
- **조치**: DB 레벨 집계 RPC 또는 `.limit(500)` 추가

### 8. [빈기능] `remind_at` 컬럼 — DB 마이그레이션 누락
- **위치**: `reminder/route.ts`, `reminder-dialog.tsx`
- **문제**: UI와 API 완전 구현됨, DB 컬럼 없음. 리마인더 설정 시 500 에러.
- **조치**: `ALTER TABLE clips ADD COLUMN remind_at timestamptz;` 마이그레이션 적용

### 9. [빈기능] `extractWithPuppeteer` — 스텁 함수가 실제 호출 경로에 존재
- **위치**: `puppeteer-extractor.ts`, 4개 fetcher에서 호출
- **문제**: 네이버 블로그, Instagram 클립이 빈 콘텐츠로 저장됨
- **조치**: 스텁 분기 skip 처리 또는 대안 스크래핑 서비스 연동

### 10. [빈기능] 마케팅 푸터 — 5개 링크가 `href="#"`
- **위치**: `src/app/(marketing)/layout.tsx:104, 151`
- **문제**: 다운로드, 문의, 도움말 등 클릭 시 페이지 최상단 이동. 소셜 링크도 제네릭 URL.
- **조치**: 실제 URL 교체 또는 링크 제거

### 11. [UX] 계정 삭제가 실제 작동하지 않음
- **위치**: `settings-client.tsx:1040-1047`
- **문제**: "고객센터에 문의" 토스트만 표시. 개인정보보호법상 삭제권 미이행.
- **조치**: API 구현 + AlertDialog 확인 또는 배포 전 섹션 숨김

### 12. [UX] 비밀번호 재설정 흐름 없음
- **위치**: `login/page.tsx`
- **문제**: "비밀번호 찾기" 링크 없음. 비밀번호 분실 시 계정 접근 불가.
- **조치**: `/forgot-password` 페이지 + `resetPasswordForEmail()` 연동

---

## High Issues (배포 전 수정 권장)

### 보안 (5건)
1. **Checkout API 내부 에러 노출** — `checkout/route.ts:78` → 에러 메시지 일반화
2. **SSRF DNS Rebinding 미차단** — `url-validator.ts` → IPv6, 8진수 IP, DNS rebinding 방어 추가
3. **withAuth admin 이메일 하드코딩** — `middleware.ts:33` → 환경변수로 전환
4. **process-clip 내부 에러 노출** — `process-clip/route.ts:155` → 로그만 남기고 일반 메시지 반환
5. **storagePath 검증 부재** — `upload/route.ts` → `..` path traversal 차단

### 코드 품질 (4건)
6. **`auth!` non-null assertion** — `middleware.ts:171` → null 체크 추가
7. **retry_count race condition** — `process-clip/route.ts:138` → SQL 원자적 증가
8. **`execSearchClips` ilike SQL injection** — `chat-tools.ts:171` → 이스케이핑 적용
9. **import/route.ts plan limit 우회** — `import/route.ts:172` → `checkClipLimit()` 추가

### 아키텍처 (3건)
10. **Collections N+1 쿼리** — `collections/route.ts:38` → 관계 쿼리 1회 조회
11. **Bulk Ops 순차 개별 처리** — `manage/route.ts:225` → `.in()` 일괄 처리
12. **fire-and-forget 실패 추적 불가** — `clip-service.ts:533` → 세분화 상태 추가

### UX (5건)
13. **Google 버튼 다크 모드 깨짐** — `login/page.tsx:94` → Tailwind 시맨틱 클래스로 통일
14. **비밀번호 보기 토글 없음** — 양쪽 폼 → Eye 아이콘 토글 + 확인 필드
15. **대시보드 로딩 텍스트 스피너** — `dashboard-client.tsx:528` → `ClipListSkeleton` 교체
16. **언어 설정 미작동** — `settings-client.tsx:255` → 비활성화 또는 "곧 지원" 표시
17. **GitHub 카드 하드코딩 데이터** — `clip-detail-client.tsx:115` → star/fork 제거

### 접근성 (3건)
18. **브랜드 색상 대비 미달** (3.2:1 vs 필요 4.5:1) → oklch 명도 조정
19. **아이콘 버튼 aria-label 누락** → 모든 아이콘 버튼에 추가
20. **모달 focus trap 불완전** → Radix Dialog focus trap 검증

### 빈 기능 (2건)
21. **팔로워 알림 토글 UI** — 기능 없음 → 제거 또는 "준비 중" 표시
22. **024 마이그레이션 미적용 가능** — `beta_feedback` 테이블 → 적용 확인

---

## Medium Issues (조기 수정 권장)

| # | 관점 | 이슈 | 위치 |
|---|------|------|------|
| 1 | 코드 | Anthropic/Google 키로 OpenAI 호출 | `model-resolver.ts` |
| 2 | 코드 | clip_contents INSERT 실패 무시 | `clip-service.ts:519` |
| 3 | 코드 | rate limiter 메모리 누수 | `rate-limiter.ts` |
| 4 | 코드 | OPENAI_API_KEY null 체크 누락 | `openai.ts:105` |
| 5 | 코드 | req.clone() body 3중 파싱 | `ai/route.ts:915` |
| 6 | 코드 | generateEmbedding 3중 중복 | `embedding-service.ts` vs `openai.ts` |
| 7 | 보안 | OAuth state SameSite=lax | `callback/route.ts` |
| 8 | 보안 | Explore API user_id 노출 | `explore/route.ts:143` |
| 9 | 보안 | JSON-LD XSS 가능성 | `p/[clipId]/page.tsx:80` |
| 10 | 보안 | 의존성 취약점 (jspdf, undici) | `package.json` |
| 11 | 아키 | clip-service 코드 중복 (90줄) | `clip-service.ts:464-650` |
| 12 | 아키 | AI 라우트 940줄 God Object | `ai/route.ts` |
| 13 | 아키 | Realtime 과도한 invalidation (10개 키) | `use-realtime-invalidation.ts` |
| 14 | 아키 | manage/route.ts 과도한 책임 | `manage/route.ts` |
| 15 | 아키 | self-fetch 서버리스 위험 | `cron/retry-failed-clips` |
| 16 | 아키 | Cron 스케줄과 주석 불일치 | `vercel.json` vs JSDoc |
| 17 | UX | 삭제 확인 다이얼로그 불일치 | 여러 컴포넌트 |
| 18 | UX | 로그아웃 확인 단계 없음 | `app-shell.tsx:107` |
| 19 | UX | 회원가입 → 이메일 인증 UX 미흡 | `signup/page.tsx:106` |
| 20 | UX | 설정 페이지 섹션 12개 스크롤 네비 없음 | `settings-client.tsx` |
| 21 | UX | 클립 상세 정적 메타 타이틀 | `clip/[clipId]/page.tsx` |
| 22 | UX | 인사이트 에러 상태 재시도 없음 | `insights-client.tsx` |
| 23 | UX | 바텀 내비 label 10px (최소 12px) | `mobile-bottom-nav.tsx` |
| 24 | UX | API 키 삭제 확인 없음 | `settings-client.tsx:876` |
| 25 | 빈기능 | 알림 설정 localStorage 전용 | `settings-client.tsx` |
| 26 | 빈기능 | seed-clips 프로덕션 import | `clip-detail-client.tsx` |
| 27 | 빈기능 | console.log 프로덕션 잔존 | `youtube-fetcher.ts`, `web-fetcher.ts` |
| 28 | 빈기능 | 023 마이그레이션 중복 파일 | `supabase/migrations/` |
| 29 | 접근성 | Muted 텍스트 대비 부족 | 전체 앱 |
| 30 | 접근성 | 검색 입력 포커스 트랜지션 | `app-header.tsx` |
| 31 | 접근성 | 이미지 alt 속성 부족 | `clip-card.tsx` |
| 32 | 접근성 | 터치 타겟 32px (최소 44px) | 여러 컴포넌트 |
| 33 | 접근성 | AriaLive 활용 미흡 | 알림/비동기 상태 |

---

## Low Issues (개선 사항)

20건 — 전체 목록은 개별 리포트 참조:
- 코드: N+1 패턴, clip_contents 배열 미정규화(2건), webhook 중복, credits 생성 에러 무시, non-null assertion
- 보안: CORS localhost 포함, IP 기반 rate limit 부재, 미들웨어 matcher 문서화
- UX: 버튼 radius 불일치, breadcrumbs 단일 항목, 카드 hover 7개 과밀, GitHub 히어로 하드코딩 색상, displayName 중복 로직, 알림 localStorage 전용, Suspense fallback, 검색 placeholder
- 접근성: lang 속성, 이미지 alt 상세화
- 빈기능: reading_progress UI 노출 확인, puppeteer warn 잔존, embeddings 구식 주석, 023-024 적용 확인

---

## 교차 관점 인사이트

여러 관점에서 동시에 지적된 영역:

### 1. `supabaseAdmin as any` (코드 + 아키텍처 + 빈기능)
51-54개 파일에서 타입 시스템이 무력화됨. 코드 품질(컴파일 타임 검증 불가), 아키텍처(런타임 DB 에러 전파), 빈기능(타입 불일치로 인한 silent failure) 모두에 영향.
→ **근본 원인**: `supabase gen types typescript` 미실행

### 2. 인메모리 Rate Limiter (보안 + 아키텍처 + 코드)
보안(API 남용 방어 무효), 아키텍처(서버리스 비호환), 코드(메모리 누수) 모두에서 지적.
→ **근본 원인**: 서버리스 환경에 맞지 않는 설계

### 3. 환경변수 모듈 레벨 읽기 (코드 + 아키텍처)
보안 시크릿 캐싱 위험(코드), 서버리스 cold start 비호환(아키텍처).
→ **근본 원인**: MEMORY.md `feedback_env_runtime_read` 규칙 미준수

### 4. AI 라우트 비대화 (코드 + 아키텍처)
940줄 God Object(코드), OpenAI 헬퍼 중복(코드), 4개 action 혼재(아키텍처).
→ **근본 원인**: 초기 빠른 구현 후 분리 미수행

### 5. 알림/설정 허위 피드백 (UX + 빈기능)
알림 설정이 localStorage 전용이지만 "변경 완료" 토스트 표시(UX), 팔로워 알림 토글이 기능 없이 존재(빈기능).
→ **근본 원인**: 프론트엔드 선행 개발 후 백엔드 미연동

---

## 긍정적 관찰

모든 리뷰 에이전트가 공통으로 인정한 강점:

1. **API 보안 기반 견고** — SHA-256 키 해싱, AES-256-GCM OAuth 암호화, HMAC timingSafeEqual, Zod 검증, withAuth 3중 인증
2. **Optimistic Update 일관성** — 즐겨찾기, 아카이브, 핀 등 즉각 UI 반영 + 롤백 패턴
3. **API 응답 일관성** — envelope 패턴(`sendSuccess`/`sendError`) 전체 적용
4. **에러 바운더리 격리** — 모든 라우트 그룹에 `error.tsx`, `loading.tsx`, `not-found.tsx`
5. **상태 관리 설계** — Zustand 2개 스토어 + TanStack Query + Realtime 깔끔한 분리
6. **접근성 기본기** — AriaLive, skip navigation, aria-current, shadcn/ui Radix 기반
7. **CSS 디자인 토큰 시스템** — 3-tier 변수 체계 (Primitive → Semantic → Component)

---

## 액션 플랜

### 1. [즉시] 배포 차단 해제 (Critical 12건)

**보안 긴급 (1-2시간)**
- [ ] `.env.check` → `.gitignore` 추가 + 파일 삭제
- [ ] `gemini.ts` API 키를 헤더로 이동
- [ ] 5곳 모듈 레벨 env var → 함수 내부 읽기

**기능 수정 (2-4시간)**
- [ ] 마케팅 푸터 `href="#"` → 실제 URL 또는 제거
- [ ] 계정 삭제 섹션 임시 숨김
- [ ] 비밀번호 재설정 페이지 추가
- [ ] `remind_at` 마이그레이션 적용
- [ ] Puppeteer 스텁 호출 분기 skip 처리

**성능 수정 (1-2시간)**
- [ ] `autoTagClip` tags 풀 스캔 → `.in('name', keywords)` 필터
- [ ] `execListTags` → `.limit(500)` 또는 DB 집계

### 2. [배포 전] High 22건 해소

**1일차: 보안 + 코드**
- [ ] SQL injection 이스케이핑 (`chat-tools.ts`)
- [ ] import plan limit 체크 추가
- [ ] 에러 메시지 일반화 (checkout, process-clip)
- [ ] admin 이메일 환경변수 전환
- [ ] SSRF DNS rebinding 방어

**2일차: UX + 접근성**
- [ ] Google 버튼 다크 모드 수정
- [ ] 비밀번호 보기 토글 추가
- [ ] 대시보드 스켈레톤 교체
- [ ] 언어 설정 비활성화
- [ ] 브랜드 색상 대비 개선
- [ ] 아이콘 버튼 aria-label 추가

**3일차: 아키텍처 + 빈기능**
- [ ] Collections N+1 → 관계 쿼리
- [ ] Bulk ops → 일괄 처리
- [ ] 팔로워 알림 UI 제거
- [ ] 024 마이그레이션 적용 확인

### 3. [배포 후 1주 내] Medium 핵심 항목

- [ ] `supabase gen types typescript` 실행 + `as any` 제거
- [ ] 인메모리 rate limiter → Upstash Redis 전환
- [ ] AI 라우트 분리 (940줄 → 5개 파일)
- [ ] clip-service processNewClip/enrichClipContent 통합
- [ ] Realtime invalidation 범위 세분화
- [ ] 의존성 취약점 업데이트 (`npm audit fix`)

### 4. [백로그]

- [ ] CSP 헤더 도입
- [ ] 터치 타겟 44px 확대
- [ ] 설정 페이지 앵커 내비게이션
- [ ] 회원가입 이메일 인증 안내 페이지
- [ ] i18n 도입 (next-intl)
- [ ] 모바일 바텀 내비 "더 보기" 탭

---

## 상세 리포트 위치

| 관점 | 파일 |
|------|------|
| 코드 품질 | `review-code-quality.md` |
| 보안 | `review-security.md` |
| UX 감사 | `review-ux.md` |
| 빈 기능 탐지 | `review-dead-features.md` |
| 아키텍처 | `review-architecture.md` |
| 접근성 | `review-a11y.md` |
| **종합 리포트** | **`review-report.md`** (이 파일) |
