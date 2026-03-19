# Code Quality Review — Linkbrain v2

> 리뷰 일시: 2026-03-19
> 리뷰 범위: `src/lib/`, `src/app/api/`, 주요 컴포넌트
> 리뷰어: Code Reviewer (opus)

---

## CRITICAL

### C-1. `supabaseAdmin as any` — 51개 파일에서 전체 타입 시스템 무력화

**파일**: 51개 파일 (전체 목록: `src/lib/services/clip-service.ts:17`, `src/lib/ai/chat-tools.ts:12`, `src/lib/services/plan-service.ts:20`, `src/app/api/v1/ai/route.ts:23` 외 47개)

**문제**: `supabaseAdmin as any`로 캐스팅하여 Supabase 클라이언트의 모든 타입 안전성이 사라짐. Insert/Update 시 잘못된 컬럼명, 누락된 필드, 타입 불일치를 컴파일 타임에 잡을 수 없음. 프로젝트 규칙(`any` 타입 절대 금지)에 직접 위반.

**영향**: 런타임 DB 오류가 프로덕션에서만 발견됨. 컬럼명 오타 하나가 데이터 손실로 이어질 수 있음.

**수정 방안**:
1. `supabase gen types typescript --project-id ucflmznygocgdwreoygc > src/types/supabase.ts` 실행
2. 생성된 타입을 `createClient<Database>`에 적용
3. Insert 타입이 `never`로 해석되는 테이블만 제한적으로 타입 단언 사용 (예: `as Tables<'clips'>['Insert']`)
4. 점진적으로 51개 파일에서 `as any` 제거

---

### C-2. 모듈 레벨 `process.env` 읽기 — serverless cold start 시 빈 값 캐싱

**파일**:
- `src/app/api/webhooks/lemonsqueezy/route.ts:18` — `const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';`
- `src/app/api/internal/process-clip/route.ts:23` — `const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;`
- `src/app/api/internal/process-image-clip/route.ts:21` — 동일
- `src/app/api/internal/backfill-embeddings/route.ts:18` — 동일
- `src/lib/ai/model-resolver.ts:37-42` — `SERVER_DEFAULT` 객체에 `process.env.OPENAI_API_KEY` 캐싱

**문제**: Vercel serverless에서 환경변수는 함수 호출 시점에 읽어야 함 (MEMORY.md `feedback_env_runtime_read.md` 참조). 모듈 레벨에서 읽으면 cold start 타이밍에 따라 빈 문자열이 캐싱되어 webhook 서명 검증 우회, 내부 API 인증 실패 등 보안 사고 가능.

**심각도 근거**: `WEBHOOK_SECRET`이 빈 문자열로 캐싱되면 `verifySignature()`에서 항상 `false` 반환하여 결제 webhook이 거부됨. `INTERNAL_SECRET`이 빈 값이면 `process-clip` 라우트가 500 에러로 모든 클립 처리 실패.

**수정 방안**: 모듈 레벨 상수 대신 함수 내부에서 읽기:
```typescript
// Before (위험)
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

// After (안전)
function getInternalSecret() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  return secret;
}
```

---

### C-3. `autoTagClip` — 전체 tags 테이블 풀 스캔

**파일**: `src/lib/services/clip-service.ts:236-241`

```typescript
const { data: allTags } = await supabaseAdmin
  .from('tags')
  .select('id, name');
```

**문제**: 매 클립 처리 시 `tags` 테이블 전체를 SELECT. 태그가 수천~수만 개로 증가하면 메모리 초과 및 성능 저하. user_id 필터도 없어 모든 사용자의 태그를 로드.

**수정 방안**: 필요한 키워드만 `.in('name', keywords.map(k => k.toLowerCase()))` 로 필터링:
```typescript
const { data: matchedTags } = await supabaseAdmin
  .from('tags')
  .select('id, name')
  .in('name', keywords.map(k => k.toLowerCase().trim()));
```

---

### C-4. `chat-tools.ts` `execListTags` — 전체 클립 keywords 풀 스캔

**파일**: `src/lib/ai/chat-tools.ts:309-334`

**문제**: 사용자의 모든 클립에서 `keywords` 배열을 가져와 클라이언트에서 집계. 클립이 수천 개면 대량 데이터 전송 + 메모리 사용. `.not('keywords', 'is', null)` 필터만 있고 limit 없음.

**수정 방안**: DB 레벨 집계 RPC 또는 최소한 `.limit(500)` 추가. 이상적으로는 `clip_tags` + `tags` 조인으로 DB에서 집계.

---

## HIGH

### H-1. `middleware.ts:171-172` — non-null assertion (`auth!`) 크래시 가능

**파일**: `src/lib/api/middleware.ts:171-172`

```typescript
const rateLimitKey = keyId ?? `session:${auth!.userId}`;
const rateLimitResult = checkRateLimit(rateLimitKey, auth!.tier, isAiEndpoint);
```

**문제**: `requireAuth = false`로 호출되면 `auth`가 `null`인 상태에서 `auth!` 접근하여 런타임 TypeError 발생. 현재 모든 호출처에서 `requireAuth`를 명시하지 않아 기본값 `true`이므로 당장은 안전하지만, 향후 `requireAuth: false` 사용 시 프로덕션 크래시.

**수정 방안**:
```typescript
if (!auth) {
  // requireAuth=false path — skip rate limiting
  const params = await context.params;
  const res = await handler(req, auth as unknown as AuthContext, params);
  // ...
  return res;
}
```

---

### H-2. `process-clip/route.ts` — retry_count 증가 시 race condition

**파일**: `src/app/api/internal/process-clip/route.ts:138-153`

**문제**: SELECT로 `retry_count` 읽고 → +1 하여 UPDATE. 동시에 같은 클립이 재처리되면 카운트가 덮어씌워짐 (lost update). cron이 15분마다 실행되고 동시 처리가 가능하므로 실제 발생 가능.

**수정 방안**: SQL 원자적 증가 사용:
```typescript
await db
  .from('clips')
  .update({
    processing_status: 'failed',
    processing_error: errorMessage.substring(0, 500),
    retry_count: db.raw('retry_count + 1'),  // 또는 RPC 사용
  })
  .eq('id', clipId);
```

---

### H-3. `rate-limiter.ts` — 인메모리 rate limit은 다중 인스턴스에서 무효

**파일**: `src/lib/api/rate-limiter.ts:37-39`

**문제**: `Map` 기반 인메모리 rate limit. Vercel serverless에서는 각 함수 인스턴스가 독립적 메모리를 가짐. 동시 요청이 다른 인스턴스로 분산되면 rate limit이 사실상 무효화. cold start마다 카운터 초기화.

**수정 방안**:
- 단기: Vercel KV (Upstash Redis) 사용하여 분산 rate limiting
- 또는 Supabase에 rate limit 카운터 테이블 생성
- 최소한 현재 한계를 문서화하여 인지

---

### H-4. `clip-service.ts` — `processNewClip`과 `enrichClipContent`의 중복 코드

**파일**: `src/lib/services/clip-service.ts:464-552` vs `src/lib/services/clip-service.ts:561-650`

**문제**: 두 함수가 거의 동일한 로직 (AI 메타데이터 생성 → 카테고리 생성 → DB 저장 → 태깅 → 임베딩). 약 90줄이 중복. DRY 위반이며 한쪽만 수정 시 불일치 발생.

**수정 방안**: `processNewClip`을 `enrichClipContent` 기반으로 리팩터링:
```typescript
export const processNewClip = async (input, options) => {
  const clipId = await createClipRow(input); // INSERT만 담당
  return enrichClipContent({ ...input, clipId }, options);
};
```

---

### H-5. `ai/route.ts` — 900줄 God Object, 4개 핸들러가 단일 파일에 혼재

**파일**: `src/app/api/v1/ai/route.ts` (940줄)

**문제**: `handleGenerate`, `handleAnalyze`, `handleAsk`, `handleInsights` 4개 핸들러 + OpenAI 스트리밍 헬퍼 + 비스트리밍 헬퍼가 단일 파일에 집중. SRP 위반. 파일 크기가 프로젝트 규칙 (300줄 제한) 3배 초과.

**수정 방안**: 액션별로 분리:
```
src/app/api/v1/ai/
  route.ts          (라우터만, ~50줄)
  generate.ts       (스트리밍 생성)
  analyze.ts        (분석)
  ask.ts            (function calling 채팅)
  insights.ts       (인사이트)
  openai-helpers.ts (스트리밍/비스트리밍 헬퍼)
```

---

### H-6. `ai/route.ts` — `callOpenAI`와 `streamOpenAI` 함수가 `openai.ts`와 중복

**파일**: `src/app/api/v1/ai/route.ts:139-236` vs `src/lib/ai/openai.ts:27-75`

**문제**: `ai/route.ts` 내부에 `callOpenAI`, `streamOpenAI` 함수가 별도로 정의됨. `src/lib/ai/openai.ts`의 `callOpenAI`, `generateChatCompletion`과 기능 중복. 시그니처도 다르고 에러 처리도 불일치.

**수정 방안**: `src/lib/ai/openai.ts`에 스트리밍 버전 추가하고 route에서 import.

---

### H-7. `execSearchClips` — ilike fallback에서 SQL injection 가능

**파일**: `src/lib/ai/chat-tools.ts:171-176`

```typescript
const pattern = `%${query}%`;
const { data: fallback, error: fbErr } = await db
  .from('clips')
  .select(...)
  .or(`title.ilike.${pattern},summary.ilike.${pattern},keywords.cs.{"${query}"}`)
```

**문제**: `query`가 사용자 입력(AI가 생성한 검색어)인데 PostgREST 필터 문법에 직접 삽입. `%`, `_`, `.`, `,` 등 특수문자가 이스케이핑 없이 들어가면 필터 구문이 깨지거나 의도치 않은 쿼리 실행. `clips/route.ts:122`에서는 올바르게 이스케이핑하고 있어 불일치.

**수정 방안**: `clips/route.ts`와 동일하게 이스케이핑 적용:
```typescript
const escaped = query.replace(/[%_\\]/g, '\\$&');
const pattern = `%${escaped}%`;
```

---

## MEDIUM

### M-1. `model-resolver.ts` — `resolveAIConfig`가 OpenAI 전용 function calling을 Anthropic/Google 키로 호출

**파일**: `src/lib/ai/model-resolver.ts` + `src/app/api/v1/ai/route.ts:393-406`

**문제**: `handleAsk`에서 `resolveAIConfig`로 사용자 키를 가져온 뒤 OpenAI `/v1/chat/completions` 엔드포인트에 직접 호출. 사용자가 Anthropic이나 Google 키를 설정하면 OpenAI 엔드포인트에 잘못된 키로 요청하여 실패.

**수정 방안**: provider에 따라 다른 엔드포인트/SDK로 분기하거나, function calling은 OpenAI 전용으로 제한하고 다른 provider는 fallback 처리.

---

### M-2. `enrichClipContent` — `clip_contents` INSERT 실패 시 불완전 클립 생성

**파일**: `src/lib/services/clip-service.ts:519-530`

**문제**: `clips` UPDATE 성공 후 `clip_contents` INSERT가 실패하면 에러 로그만 남기고 정상 반환. 클립은 `ready` 상태이지만 콘텐츠가 없는 불완전 상태. 사용자에게 빈 콘텐츠가 표시됨.

**수정 방안**: 트랜잭션으로 묶거나, 실패 시 `processing_status`를 `partial`로 설정하여 UI에서 재처리 유도.

---

### M-3. `rate-limiter.ts` — 메모리 누수 (Map 엔트리 정리 없음)

**파일**: `src/lib/api/rate-limiter.ts:37-39`

**문제**: `minuteWindows`, `dayWindows`, `aiDayWindows` Map에 만료된 엔트리를 정리하는 로직 없음. 장기 실행 시 (warm instance) 메모리가 지속 증가.

**수정 방안**: `getWindow()`에서 만료된 윈도우를 감지할 때 `store.delete(key)` 후 새로 생성하거나, 주기적 정리 로직 추가.

---

### M-4. `url-validator.ts` — DNS rebinding 공격 미방어

**파일**: `src/lib/fetchers/url-validator.ts`

**문제**: 호스트명 기반 검증만 수행. DNS rebinding 공격에서 첫 DNS 조회는 공개 IP를 반환하고, 실제 fetch 시 내부 IP로 변경 가능. `validateUrl()` 통과 후 실제 fetch에서 내부 네트워크 접근 가능.

**수정 방안**: fetch 시 resolved IP를 재검증하거나, `fetch` wrapper에서 redirect 후 최종 IP 확인.

---

### M-5. `openai.ts:105,133` — `process.env.OPENAI_API_KEY` 함수 외부에서 읽지 않지만 null 체크 없음

**파일**: `src/lib/ai/openai.ts:105, 133`

```typescript
Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
```

**문제**: `process.env.OPENAI_API_KEY`가 undefined이면 `Bearer undefined`가 전송되어 401 에러. 하지만 에러 메시지가 "OpenAI API error: 401"로 모호하여 디버깅 어려움.

**수정 방안**: 함수 시작에서 env var 존재 확인 후 명확한 에러 메시지 반환 (`embedding-service.ts:20-21`처럼).

---

### M-6. `import/route.ts` — 대량 import 시 plan limit 체크 없음

**파일**: `src/app/api/v1/clips/import/route.ts:172-282`

**문제**: 개별 클립 생성 (`POST /api/v1/clips`)에서는 `checkClipLimit()`을 호출하지만, import 엔드포인트에서는 plan limit 체크 없이 무제한 삽입 가능. free 플랜 사용자가 수천 개 클립을 import하여 제한 우회 가능.

**수정 방안**: import 전에 `checkClipLimit()` 호출하고 남은 용량만큼만 삽입.

---

### M-7. `clip-service.ts` — `ENABLE_YT_DETAILED_SUMMARY_PREPEND` 모듈 레벨 읽기

**파일**: `src/lib/services/clip-service.ts:310-311`

```typescript
const ENABLE_YT_DETAILED_SUMMARY_PREPEND =
  process.env.ENABLE_YT_DETAILED_SUMMARY_PREPEND === 'true';
```

**문제**: C-2와 동일 패턴. 모듈 레벨에서 환경변수 읽기. MEMORY.md에도 "환경변수 미설정이면 비활성"으로 기록되어 있어, 의도적 비활성인지 캐싱 버그인지 구분 불가.

**수정 방안**: 함수 내부에서 읽기.

---

### M-8. `ai/route.ts:915-926` — `req.clone()` 이중 호출로 body 소비 문제

**파일**: `src/app/api/v1/ai/route.ts:915-926`

```typescript
const cloneForPeek = req.clone();
const peekBody = await cloneForPeek.json();
clonedReq = req.clone() as NextRequest;
```

**문제**: `req.clone()` 후 원본 `req`의 body는 여전히 미소비 상태이지만, 이미 한 번 clone한 뒤 다시 clone하는 것은 불필요한 메모리 복사. 또한 하위 핸들러에서 `req.json()`을 다시 호출하므로 body를 3번 파싱.

**수정 방안**: body를 한 번만 파싱하고 결과를 하위 핸들러에 전달:
```typescript
const body = await req.json();
const action = body.action ?? 'generate';
// pass body to handler directly
```

---

### M-9. `embedding-service.ts` vs `ai/openai.ts` — `generateEmbedding` 함수 중복

**파일**: `src/lib/services/embedding-service.ts:19-47` vs `src/lib/ai/openai.ts:128-150`

**문제**: 임베딩 생성 함수가 2곳에 존재. `embedding-service.ts`는 24000자 제한, `openai.ts`는 8000자 제한으로 동작이 다름. `clip-service.ts:304`에서 `ai/embeddings.ts`를 re-export하여 3번째 진입점까지 존재.

**수정 방안**: `embedding-service.ts`를 단일 진입점으로 통일. `openai.ts`의 `generateEmbedding`은 제거.

---

## LOW

### L-1. `handleGet` (clips/[clipId]) — N+1 패턴: clip 조회 후 collection 별도 조회

**파일**: `src/app/api/v1/clips/[clipId]/route.ts:32-53`

**문제**: 클립 조회 후 `clip_collections` 별도 SELECT. 단일 클립이라 성능 영향 미미하지만, list 엔드포인트에서 같은 패턴이 반복되면 N+1 문제.

**수정 방안**: `clips` 쿼리에 `.select('*, clip_collections(collection_id)')` 조인.

---

### L-2. `formatClipResponse` — `clip_contents`가 배열일 수 있음

**파일**: `src/app/api/v1/clips/route.ts:270`

```typescript
const cc = clip.clip_contents as Record<string, unknown> | undefined;
```

**문제**: Supabase 관계 쿼리에서 `clip_contents`는 1:N이면 배열로 반환. MEMORY.md에도 "항상 `Array.isArray()` 정규화" 기록. 여기서는 단일 객체로 가정.

**수정 방안**:
```typescript
const ccRaw = clip.clip_contents;
const cc = Array.isArray(ccRaw) ? ccRaw[0] : ccRaw;
```

---

### L-3. `lemon squeezy webhook` — 이벤트 타입별 중복 코드

**파일**: `src/app/api/webhooks/lemonsqueezy/route.ts:172-225`

**문제**: `subscription_created`, `subscription_updated`, `subscription_resumed`, `subscription_unpaused`와 `subscription_cancelled`, `subscription_paused`, `subscription_expired` 각 case에서 동일한 `authUid` 체크 + `resolveInternalUserId` 로직이 반복됨.

**수정 방안**: 공통 로직 추출:
```typescript
const userId = await resolveAndValidate(authUid);
if (!userId) return errorResponse;
```

---

### L-4. `chat-tools.ts:225-226` — `clip_contents` 단일 객체 가정

**파일**: `src/lib/ai/chat-tools.ts:220-228`

```typescript
const row = clip as {
  clip_contents: { content_markdown: string | null; raw_markdown: string | null } | null;
};
```

**문제**: L-2와 동일. 관계 쿼리 결과가 배열일 수 있으나 단일 객체로 캐스팅.

---

### L-5. `ensurePublicUser` — credits/subscriptions 생성 실패 무시

**파일**: `src/lib/api/ensure-user.ts:66-69`

```typescript
await Promise.all([
  db.from('credits').insert({ user_id: userId }),
  db.from('subscriptions').insert({ user_id: userId }),
]);
```

**문제**: `Promise.all` 결과의 에러를 확인하지 않음. DB 제약 위반 시 사용자는 생성되었지만 credits/subscriptions 행이 없어 plan 조회에서 오류 발생 가능.

**수정 방안**: 에러 체크 추가 또는 `.catch()` 로깅.

---

### L-6. `use-scroll-direction.ts:51,54-55` — non-null assertion

**파일**: `src/lib/hooks/use-scroll-direction.ts:51, 54-55`

```typescript
const currentScrollY = container!.scrollTop;
currentScrollY + container!.clientHeight >= container!.scrollHeight - 10;
```

**문제**: `container`가 `null`일 수 있으나 `!` assertion으로 접근. ref가 아직 연결되지 않은 시점에 호출되면 크래시.

**수정 방안**: optional chaining + early return.

---

## 긍정적 관찰

1. **SSRF 방어**: `url-validator.ts`에서 private IP, 메타데이터 엔드포인트 차단이 체계적으로 구현됨
2. **Webhook 서명 검증**: Lemon Squeezy webhook에서 `timingSafeEqual` 사용하여 타이밍 공격 방어
3. **OAuth 토큰 암호화**: AES-256-GCM으로 암호화 저장, 자동 리프레시 로직 견고
4. **크레딧 차감 원자성**: `deductCredits()`에서 RPC 사용하여 TOCTOU race condition 방지
5. **Optimistic save 패턴**: 클립 생성 시 즉시 `pending` 상태로 저장 후 background 처리 — UX 우수
6. **ensurePublicUser race condition 처리**: `23505` 에러 코드로 중복 생성 감지 후 재조회
7. **API 키 보안**: SHA256 해싱 저장, prefix만 노출, `lb_` prefix 검증
8. **입력 검증**: `validate.ts`에서 zod 스키마로 체계적 검증, clips/route.ts에서 PostgREST wildcard 이스케이핑

---

## 통계

| 심각도 | 개수 |
|--------|------|
| CRITICAL | 4 |
| HIGH | 7 |
| MEDIUM | 9 |
| LOW | 6 |
| **총 이슈** | **26개** |

---

## 권고: REQUEST CHANGES

CRITICAL 4건(타입 안전성 전면 무력화, 환경변수 캐싱 보안 이슈, DB 풀 스캔 성능 문제)과 HIGH 7건(race condition, SQL injection 가능성, 코드 중복)이 존재하여 배포 전 수정이 필요합니다.

**우선순위 제안**:
1. **즉시 수정**: C-2 (환경변수 캐싱), H-7 (SQL injection), M-6 (import plan limit 우회)
2. **단기 수정**: C-3/C-4 (풀 스캔), H-2 (race condition), H-5/H-6 (코드 중복)
3. **중기 수정**: C-1 (타입 재생성), H-3 (분산 rate limit), M-1 (provider 분기)
