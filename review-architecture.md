# Linkbrain v2 아키텍처 리뷰

> 리뷰 일시: 2026-03-19
> 리뷰어: Architect Agent
> 대상 브랜치: main (98d1eef)

---

## 1. 모듈 간 의존성 방향 (순환 참조 여부)

### 결과: 양호 — 순환 참조 없음

의존성 방향이 깔끔하게 유지되고 있다.

- `components/` -> `lib/hooks/` -> `lib/supabase/client` (클라이언트 계층)
- `app/api/` -> `lib/services/` -> `lib/supabase/admin` (서버 계층)
- `lib/hooks/`에서 `lib/services/`를 import하는 경우는 타입만 가져옴
- `lib/services/`에서 `lib/hooks/`를 import하는 경우 없음
- `stores/`를 import하는 lib 파일은 hooks 4개뿐 — 모두 UI 훅으로 적절

**심각도: 없음**

---

## 2. 관심사 분리 (비즈니스 로직 / UI / 데이터)

### 2-1. [MEDIUM] `clip-service.ts`의 processNewClip과 enrichClipContent 코드 중복

`src/lib/services/clip-service.ts` — `processNewClip`과 `enrichClipContent`이 거의 동일한 로직을 반복:
- AI metadata 생성
- prepareClipContent 호출
- fetchScreenshot fallback
- getOrCreateCategory
- autoTagClip fire-and-forget
- indexClipEmbedding fire-and-forget

`processNewClip`은 "backward compatibility" 주석이 달려 있지만, 현재 파이프라인은 `clips/route.ts`에서 pending 삽입 후 `process-clip/route.ts`에서 `enrichClipContent`를 호출하는 구조.

**권고**: `processNewClip`의 실제 호출 여부 확인 후, 미사용이면 제거. 사용 중이면 `enrichClipContent`를 내부에서 호출하도록 통합.

### 2-2. [MEDIUM] AI 라우트의 OpenAI 직접 호출 중복

`src/app/api/v1/ai/route.ts`에서 `streamOpenAI()`과 `callOpenAI()`를 라우트 파일 내에 직접 구현. 반면 `src/lib/ai/openai.ts`에 `generateChatCompletion`이 이미 존재.

동일한 OpenAI 호출 로직이 2곳에 분산되어 있어, API 키 로딩 방식이나 에러 핸들링이 불일치할 수 있다.

**권고**: `lib/ai/` 모듈에 스트리밍/논스트리밍 헬퍼를 통합하고, 라우트에서는 import만 수행.

### 2-3. [LOW] `supabase/client.ts`의 placeholder 패턴

빌드 시 env var가 없으면 `'https://placeholder.supabase.co'`으로 더미 클라이언트를 생성. SSG 빌드 오류 방지 의도이나, 런타임에 사용되면 조용히 실패.

---

## 3. API 경계 설계 (REST 규칙, 응답 일관성)

### 3-1. [LOW] 응답 포맷 일관성 — 양호

`src/lib/api/response.ts`의 envelope 패턴이 잘 적용되어 있다:
- 성공: `{ success: true, data, meta? }`
- 에러: `{ success: false, error: { code, message, details? } }`
- 모든 v1 라우트가 `sendSuccess`, `sendPaginated`, `sendError`, `errors.*` 헬퍼 사용

### 3-2. [MEDIUM] manage/route.ts의 과도한 책임

`src/app/api/v1/manage/route.ts`가 categories, tags, bulk ops, webhooks를 하나의 라우트에서 `?action=` 쿼리 파라미터로 분기:
- API 문서화가 어려움 (하나의 경로에 7개 동작)
- 메서드별 분기가 action 내부에서 다시 발생 (이중 분기)

**권고**: 장기적으로 `/api/v1/categories`, `/api/v1/tags`, `/api/v1/webhooks`로 분리.

### 3-3. [MEDIUM] AI 라우트의 다중 action 패턴

`src/app/api/v1/ai/route.ts`에서 `req.clone()`으로 body를 두 번 읽어 action을 판별. `generate`, `analyze`, `ask`, `insights` 4가지 전혀 다른 기능이 한 엔드포인트에 혼재.

### 3-4. [LOW] Internal API의 응답 포맷 불일치

`/api/internal/process-clip`은 envelope 패턴 미사용. 내부 API이므로 치명적이지는 않으나, 통일이 바람직.

---

## 4. 에러 경계 & 장애 전파 범위

### 4-1. [LOW] 에러 바운더리 구성 — 양호

Next.js error.tsx가 모든 라우트 그룹에 배치. `loading.tsx`, `not-found.tsx`도 존재. 장애 전파가 라우트 그룹 단위로 격리.

### 4-2. [HIGH] fire-and-forget 실패의 사일런트 손실

`src/lib/services/clip-service.ts` — autoTagClip, indexClipEmbedding에서 `.catch(console.error)`로 에러를 소비:
- 실패 클립을 추적할 수단 없음
- 태깅이나 임베딩이 누락된 클립을 나중에 찾아 재처리할 방법 부재
- cron job(`retry-failed-clips`)은 `processing_status='failed'`만 재시도하므로 enrichment 성공 후 태깅/임베딩만 실패한 경우는 포착 불가

**권고**: `clips` 테이블에 `embedding_status`, `tagging_status` 세분화 상태 추가 또는 실패 시 별도 큐/테이블 기록.

### 4-3. [MEDIUM] AI 스트리밍 에러의 인밴드 전달

스트리밍 중 에러 발생 시 `[오류: ${errMsg}]` 텍스트를 스트림에 직접 삽입. 클라이언트가 이 패턴을 파싱하지 않으면 에러 메시지가 생성 콘텐츠에 섞여 표시될 수 있다.

**권고**: SSE `event: error` 필드 사용 또는 별도 에러 프로토콜 정의.

---

## 5. 확장성 병목 (N+1 쿼리, 동기 블로킹)

### 5-1. [HIGH] Collections 목록의 N+1 쿼리

`src/app/api/v1/collections/route.ts:38-55` — 컬렉션 목록 후 **각 컬렉션마다** clip_collections count 쿼리 실행. 컬렉션 50개면 51개 쿼리.

**권고**: `.select('*, clip_collections(count)')` 관계 쿼리로 1회 조회.

### 5-2. [HIGH] Bulk Operations의 순차 개별 처리

`src/app/api/v1/manage/route.ts:225-307` — `for...of` 루프로 클립을 하나씩 처리. 20개 클립 삭제 시 최소 40개 쿼리.

**권고**:
- 소유권 확인: `.in('id', ids).eq('user_id', userId)` 1회
- 일괄 업데이트: `.update({...}).in('id', verifiedIds)` 1회

### 5-3. [MEDIUM] Clips 목록의 Collection 필터 2-쿼리 패턴

collectionId 필터 적용 시 먼저 clip_collections에서 clip_id를 가져온 후 `.in('id', ids)`로 필터링. `.in()` 한글 배치 50개 제한 이슈.

### 5-4. [MEDIUM] 모듈 레벨 env var 바인딩

`src/lib/services/clip-service.ts` — `ENABLE_YT_DETAILED_SUMMARY_PREPEND`를 모듈 최상위에서 읽음. MEMORY.md `feedback_env_runtime_read.md` 규칙과 불일치.

---

## 6. 상태 관리 복잡도

### 6-1. [LOW] Zustand 스토어 설계 — 양호

CLAUDE.md 규칙(2개 스토어 유지) 준수. `partialize`로 localStorage 저장 범위 적절히 제한.

### 6-2. [LOW] TanStack Query + Zustand + Realtime 통합 — 양호

깔끔한 분리: 서버 상태(TanStack), UI 상태(Zustand), 실시간(Supabase Realtime -> invalidation).

### 6-3. [MEDIUM] Realtime 채널의 과도한 invalidation 범위

`src/lib/hooks/use-realtime-invalidation.ts` — `clips` 테이블 변경 시 10개 쿼리 키를 한꺼번에 invalidate. 단일 클립 즐겨찾기 토글만으로 10개 refetch.

**권고**: 변경 유형별로 invalidation 범위 세분화.

---

## 7. 배포 환경 적합성

### 7-1. [CRITICAL] 인메모리 Rate Limiter의 서버리스 비호환

`src/lib/api/rate-limiter.ts` — rate limit 카운터를 인메모리 `Map`에 저장:
- 서버리스: 각 함수 인스턴스가 독립 메모리 -> rate limit 무의미
- cold start마다 카운터 초기화 -> 일일 한도 리셋
- "Pro tier 5000 req/day" 제한이 실질적 효력 없음

**권고**: Upstash Redis 또는 Supabase `credit_usage` 테이블 기반으로 전환.

### 7-2. [HIGH] `supabaseAdmin as any` 54건의 타입 안전성 부재

52개 파일에서 54건. `supabase gen types typescript` 미실행으로 Insert 타입이 `never`로 해석되는 문제.

**권고**: `supabase gen types typescript --project-id ucflmznygocgdwreoygc > src/types/database-generated.ts` 실행 후 `as any` 일괄 제거.

### 7-3. [MEDIUM] Cron 스케줄과 주석 불일치

`vercel.json` cron: `"0 9 * * *"` (하루 1회) vs `route.ts` JSDoc: "Runs every 15 minutes".

### 7-4. [MEDIUM] self-fetch 패턴의 서버리스 위험

`src/app/api/cron/retry-failed-clips/route.ts` — 자기 자신의 `/api/internal/process-clip`을 HTTP fetch로 호출. cron 함수 실행 시간에 영향.

### 7-5. [LOW] `next.config.ts`의 보안 헤더 — 양호

HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy 모두 적용. CSP 미적용이나 외부 연결이 많아 설정이 까다로운 점 고려.

---

## 종합 우선순위

| # | 심각도 | 항목 | 위치 | 노력 | 영향 |
|---|--------|------|------|------|------|
| 1 | CRITICAL | 인메모리 Rate Limiter | `lib/api/rate-limiter.ts` | 중 | Rate limit 무효화, 남용 가능 |
| 2 | HIGH | Collections N+1 쿼리 | `api/v1/collections/route.ts` | 소 | 컬렉션 많으면 응답 지연 |
| 3 | HIGH | Bulk Ops 순차 처리 | `api/v1/manage/route.ts` | 소 | 대량 작업 시 타임아웃 위험 |
| 4 | HIGH | `as any` 54건 | 52개 파일 | 중 | 타입 안전성 부재 |
| 5 | HIGH | fire-and-forget 실패 추적 불가 | `clip-service.ts` | 중 | 데이터 누락 탐지 불가 |
| 6 | MEDIUM | clip-service 코드 중복 | `clip-service.ts` | 소 | 유지보수 부담 |
| 7 | MEDIUM | AI 라우트 OpenAI 헬퍼 중복 | `api/v1/ai/route.ts` | 소 | 로직 불일치 위험 |
| 8 | MEDIUM | Realtime 과도한 invalidation | `use-realtime-invalidation.ts` | 소 | 불필요한 네트워크/DB 부하 |
| 9 | MEDIUM | manage/route.ts 과도한 책임 | `api/v1/manage/route.ts` | 중 | API 문서화/확장 어려움 |
| 10 | MEDIUM | self-fetch 서버리스 위험 | `cron/retry-failed-clips/route.ts` | 소 | cron 타임아웃 가능성 |

## 통계
- 총 이슈: 16개 (Critical: 1, High: 4, Medium: 8, Low: 3)
- 양호 항목: 6개 (순환 참조 없음, 응답 포맷, 에러 바운더리, Zustand 설계, 상태 통합, 보안 헤더)
