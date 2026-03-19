# 보안 리뷰 리포트 — Linkbrain v2

**범위:** src/app/api/ (47개 라우트), src/lib/api/ (미들웨어/인증), src/lib/fetchers/ (URL 패칭), src/lib/oauth/, src/lib/ai/, src/lib/supabase/, .env 파일, 의존성
**리뷰 일시:** 2026-03-19
**전체 위험도:** HIGH

---

## 요약

| 등급 | 건수 |
|------|------|
| CRITICAL | 2 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 3 |

---

## CRITICAL (즉시 수정 필요)

### 1. `.env.check` 파일에 Vercel OIDC JWT 토큰 및 관리자 이메일 커밋

**심각도:** CRITICAL
**카테고리:** A02:2021 - Cryptographic Failures / Sensitive Data Exposure
**위치:** `.env.check` (Git untracked이지만 `.gitignore`에 미포함)
**악용 가능성:** 원격, 비인증 (리포지토리 접근 가능 시)
**피해 범위:** Vercel 프로젝트 접근, 관리자 계정 타겟팅

**문제:**
`.env.check` 파일에 다음이 하드코딩되어 있다:
- `VERCEL_OIDC_TOKEN` — 전체 JWT (서명 포함), Vercel 프로젝트/팀 정보 노출
- `ADMIN_EMAILS` — 관리자 이메일 주소
- `META_THREADS_REDIRECT_URI` — OAuth 리다이렉트 URI

이 파일은 `.gitignore`에 `.env.check` 패턴이 없어 실수로 커밋될 수 있다. 현재 `git status`에서 untracked 상태이지만 보호되지 않는다.

**조치:**
```bash
# .gitignore에 추가
echo ".env.check" >> .gitignore

# 파일 삭제 또는 값 제거
rm .env.check

# OIDC 토큰이 이미 만료되었는지 확인 (exp 클레임)
# 필요 시 Vercel에서 토큰 재발급
```

---

### 2. Gemini API 키가 URL 쿼리 파라미터에 노출

**심각도:** CRITICAL
**카테고리:** A02:2021 - Cryptographic Failures
**위치:** `src/lib/ai/gemini.ts:24`
**악용 가능성:** 원격, 인증 사용자 (자신의 API 키 등록 시)
**피해 범위:** 사용자 API 키 탈취 가능 (서버 로그, 프록시 로그, CDN 로그에 URL 기록)

**문제:**
Gemini API 호출 시 API 키를 URL 쿼리 파라미터로 전송한다:
```typescript
// BAD — src/lib/ai/gemini.ts:24
`https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`
```
HTTP URL의 쿼리 파라미터는 서버 액세스 로그, 리버스 프록시, CDN, 브라우저 히스토리 등에 기록된다. 이는 HTTPS를 사용하더라도 서버 측에서 API 키가 로그에 남는다.

Google Generative AI API는 `x-goog-api-key` 헤더 인증을 지원한다.

**조치:**
```typescript
// GOOD
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,  // 헤더로 전달
    },
    body: JSON.stringify({ /* ... */ }),
  }
);
```

---

## HIGH (빠른 수정 필요)

### 3. Checkout API 에러 메시지에 내부 에러 정보 노출

**심각도:** HIGH
**카테고리:** A04:2021 - Insecure Design / Information Disclosure
**위치:** `src/app/api/checkout/route.ts:78-83`
**악용 가능성:** 원격, 인증 사용자
**피해 범위:** 내부 서버 구조, 외부 서비스 에러 메시지, 스택 정보 노출

**문제:**
에러 발생 시 원본 에러 메시지를 그대로 클라이언트에 반환한다:
```typescript
// BAD
const msg = error instanceof Error ? error.message : String(error);
return NextResponse.json({ error: msg }, { status: 500 });
```
Lemon Squeezy API의 내부 에러 메시지(API 키 일부, 엔드포인트 URL 등)가 클라이언트에 노출될 수 있다.

**조치:**
```typescript
// GOOD
console.error('[Checkout] Error:', error);
return NextResponse.json(
  { error: 'Checkout 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
  { status: 500 }
);
```

---

### 4. SSRF 검증에서 DNS Rebinding 및 IPv6 미차단

**심각도:** HIGH
**카테고리:** A10:2021 - Server-Side Request Forgery (SSRF)
**위치:** `src/lib/fetchers/url-validator.ts`
**악용 가능성:** 원격, 인증 사용자 (클립 URL 제출)
**피해 범위:** 내부 네트워크 스캔, 클라우드 메타데이터 접근

**문제:**
URL 검증기가 호스트네임을 문자열 수준에서만 검사하고, 실제 DNS 해석 후 IP를 검증하지 않는다:
1. **DNS Rebinding**: `evil.com`이 처음에는 공인 IP를 반환하고 두 번째 해석에서 `169.254.169.254`를 반환하면 우회 가능
2. **IPv6 미차단**: `[::1]` (localhost), `[::ffff:169.254.169.254]` (IPv4-mapped IPv6) 등 미검사
3. **URL 인코딩 우회**: `0x7f000001` (127.0.0.1의 정수 표현), `0177.0.0.1` (8진수) 등 미검사

**조치:**
```typescript
// 추가 검사가 필요한 패턴들
const IPV6_BLOCKED = [
  /^\[::1\]$/,                    // IPv6 localhost
  /^\[::ffff:(?:127|10|172\.(1[6-9]|2|3[01])|192\.168)/, // IPv4-mapped
  /^\[fd/i,                       // ULA
  /^\[fe80:/i,                    // link-local
];

// 이상적으로는 DNS 해석 후 IP를 검증해야 하지만,
// Node.js에서 dns.resolve 후 IP 검사하는 방식 권장:
import { resolve4 } from 'node:dns/promises';

async function validateResolvedIp(hostname: string): Promise<boolean> {
  const ips = await resolve4(hostname);
  return ips.every(ip => !isPrivateIp(ip));
}
```

---

### 5. 인메모리 Rate Limiter — 서버리스 환경에서 무력화

**심각도:** HIGH
**카테고리:** A04:2021 - Insecure Design
**위치:** `src/lib/api/rate-limiter.ts`
**악용 가능성:** 원격, 인증 사용자
**피해 범위:** API 무제한 호출, AI 크레딧 소진, DDoS

**문제:**
Rate limiter가 `Map` 기반 인메모리 구현이다. Vercel Serverless Functions는 요청마다 새로운 인스턴스를 생성할 수 있어, 카운터가 공유되지 않는다. 공격자가 빠른 속도로 요청을 보내면 각각 다른 인스턴스에서 처리되어 rate limit이 적용되지 않을 수 있다.

**조치:**
```typescript
// Vercel KV (Upstash Redis)를 사용한 분산 rate limiting 권장
// 또는 Vercel의 Edge Config, Upstash @upstash/ratelimit 사용

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
});
```

---

### 6. `withAuth` 미들웨어의 admin 이메일 하드코딩

**심각도:** HIGH
**카테고리:** A01:2021 - Broken Access Control
**위치:** `src/lib/api/middleware.ts:33`
**악용 가능성:** 낮음 (코드 변경 필요)
**피해 범위:** 관리자 권한 우회 가능성, 환경별 분리 불가

**문제:**
```typescript
// BAD
const ADMIN_EMAILS = ['beyondworks.br@gmail.com'];
```
관리자 이메일이 소스 코드에 하드코딩되어 있다. `src/lib/admin/auth.ts`는 올바르게 환경변수(`ADMIN_EMAILS`)를 사용하지만, API 미들웨어는 하드코딩된 값을 사용한다. 이로 인해 두 곳의 admin 목록이 불일치할 수 있다.

**조치:**
```typescript
// GOOD
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
```

---

### 7. process-clip 에러 응답에 내부 에러 메시지 노출

**심각도:** HIGH
**카테고리:** A04:2021 - Insecure Design
**위치:** `src/app/api/internal/process-clip/route.ts:155-158`
**악용 가능성:** 낮음 (내부 API이지만 secret 탈취 시 접근 가능)
**피해 범위:** 내부 서버 구조, DB 스키마, 외부 API 에러 노출

**문제:**
```typescript
// BAD
return NextResponse.json(
  { error: 'Processing failed', clipId, message: errorMessage },
  { status: 500 }
);
```

**조치:**
```typescript
// GOOD — 내부 API라도 에러 상세는 로그에만
console.error(`[ProcessClip] Failed for clip ${clipId}:`, errorMessage);
return NextResponse.json(
  { error: 'Processing failed', clipId },
  { status: 500 }
);
```

---

## MEDIUM

### 8. OAuth state 쿠키의 SameSite=Lax 및 경로 제한

**심각도:** MEDIUM
**카테고리:** A07:2021 - Identification and Authentication Failures
**위치:** `src/app/api/v1/oauth/callback/route.ts:75-81`
**악용 가능성:** 원격, 비인증

**문제:**
OAuth state 쿠키가 `sameSite: 'lax'`로 설정되어 있다. OAuth CSRF 보호에는 `strict`가 더 안전하다. 또한 `path: '/api/v1/oauth'`로 제한되어 있어 올바른 편이지만, state 값의 TTL(만료 시간)이 쿠키 자체에 설정되어 있는지 확인 필요하다(authorize 라우트에서 설정하는 부분 미확인).

**조치:** OAuth state 쿠키에 짧은 TTL(5분) 설정 확인 및 `sameSite: 'strict'` 고려.

---

### 9. Explore API에서 `user_id` 반환 — 정보 노출

**심각도:** MEDIUM
**카테고리:** A01:2021 - Broken Access Control
**위치:** `src/app/api/v1/explore/route.ts:143`
**악용 가능성:** 원격, 비인증
**피해 범위:** 사용자 내부 ID 노출, 사용자 열거 공격에 활용 가능

**문제:**
인증 없이 접근 가능한 Explore API가 각 클립의 `user_id` (내부 UUID)를 반환한다. 이 ID는 다른 API 엔드포인트에서 사용자를 식별하는 데 사용될 수 있다.

**조치:**
```typescript
// GOOD — user_id 대신 표시용 이름만 반환하거나 제거
return {
  id: row.id,
  title: row.title,
  // userId: row.user_id,  // 제거
  // ...
};
```

---

### 10. `dangerouslySetInnerHTML` 사용 — XSS 위험도 낮음

**심각도:** MEDIUM
**카테고리:** A03:2021 - Injection (XSS)
**위치:** `src/app/p/[clipId]/page.tsx:80`, `src/app/(marketing)/page.tsx:118` 외 4곳
**악용 가능성:** 낮음 (JSON-LD 구조화 데이터에 한정)

**문제:**
`dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`으로 JSON-LD를 삽입하고 있다. 현재 `JSON.stringify`가 기본적으로 `<`, `>` 등을 이스케이프하지 않아, DB에서 가져온 title/summary에 악성 스크립트가 포함되면 주입될 수 있다.

**조치:**
```typescript
// GOOD — HTML 엔티티 이스케이프 추가
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
```

---

### 11. 의존성 취약점 — jspdf (CRITICAL), undici (HIGH), next (MODERATE)

**심각도:** MEDIUM (운영 환경 영향도 기준)
**카테고리:** A06:2021 - Vulnerable and Outdated Components
**악용 가능성:** 조건부

| 패키지 | 심각도 | CVE/GHSA | 설명 |
|---------|--------|----------|------|
| `jspdf` <=4.2.0 | CRITICAL | GHSA-wfv2-pwc8-crg5 | HTML Injection in New Window |
| `jspdf` <=4.2.0 | HIGH | GHSA-7x6v-j9x4-qf24 | PDF Object Injection |
| `undici` 7.0-7.23 | HIGH | 6개 CVE | WebSocket 오버플로, HTTP 스머글링, CRLF 인젝션 |
| `next` <16.1.7 | MODERATE | GHSA-3x4c-7xq6-9pq8 | 이미지 캐시 무한 증가 |
| `flatted` <3.4.0 | HIGH | GHSA-25h7-pfq9-p65f | parse() DoS |

**조치:**
```bash
npm audit fix          # undici, flatted 수정
npm audit fix --force  # next 업그레이드 (breaking change 주의)
# jspdf는 서버 사이드 PDF 생성에만 사용되므로 직접적 XSS 위험은 낮으나 업데이트 권장
```

---

### 12. 클립 상세 조회 시 Authorization 체크 순서

**심각도:** MEDIUM
**카테고리:** A01:2021 - Broken Access Control
**위치:** `src/app/api/v1/clips/[clipId]/route.ts:39-45`

**문제:**
클립을 먼저 DB에서 조회한 후 `user_id` 비교로 권한을 체크한다. 이 패턴 자체는 올바르지만, `supabaseAdmin`(서비스 역할)을 사용하므로 RLS가 적용되지 않는다. 만약 `user_id` 비교 로직에 결함이 생기면 다른 사용자의 클립에 접근 가능하다.

**조치:** 가능하면 사용자 세션의 Supabase 클라이언트(RLS 적용)를 사용하여 이중 방어 구현.

---

### 13. storagePath 검증 부재 — Path Traversal 가능성

**심각도:** MEDIUM
**카테고리:** A03:2021 - Injection
**위치:** `src/app/api/v1/clips/upload/route.ts:20`, `src/app/api/internal/process-image-clip/route.ts:49`

**문제:**
`storagePath`는 Zod 스키마에서 `z.string().min(1)` 으로만 검증된다. `../` 같은 path traversal 문자가 포함되면 Supabase Storage의 다른 버킷/경로에 접근할 수 있다.

**조치:**
```typescript
const storagePathSchema = z.string()
  .min(1)
  .refine(
    (p) => !p.includes('..') && !p.startsWith('/'),
    'Invalid storage path'
  );
```

---

## LOW

### 14. CORS에 localhost 포함

**심각도:** LOW
**카테고리:** A05:2021 - Security Misconfiguration
**위치:** `src/lib/api/cors.ts:16-19`

**문제:**
프로덕션 CORS 허용 목록에 `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:*`이 포함되어 있다. 프로덕션 배포 시에도 localhost에서 API 호출이 가능하다.

**조치:** 환경변수로 분기하여 프로덕션에서는 localhost 제거.

---

### 15. Rate Limiter에 X-Forwarded-For 기반 IP 제한 부재

**심각도:** LOW
**카테고리:** A04:2021 - Insecure Design
**위치:** `src/lib/api/rate-limiter.ts`

**문제:** API 키 없이 세션 기반 인증을 사용하는 경우, 같은 세션에서만 rate limit이 적용된다. 인증 전 brute-force (로그인 시도 등)에 대한 IP 기반 제한이 없다.

---

### 16. Next.js 미들웨어의 matcher에서 API 경로 보호 미흡

**심각도:** LOW
**카테고리:** A01:2021 - Broken Access Control
**위치:** `src/middleware.ts:41`

**문제:**
미들웨어 matcher가 `api/internal`과 `api/webhooks`를 제외하지만, `/api/v1/` 경로는 제외하지 않는다. 이는 의도적(v1 API는 자체 `withAuth` 미들웨어 사용)이지만, `/api/analyze`, `/api/checkout`, `/api/billing/portal`, `/api/share-target` 등 `withAuth`를 사용하지 않는 라우트가 미들웨어 세션 갱신의 혜택만 받고, 인증 여부를 자체적으로 처리한다. 이 라우트들은 모두 개별적으로 인증을 구현하고 있어 현재는 안전하지만, 새 라우트 추가 시 인증 누락 위험이 있다.

---

## 보안 체크리스트

- [x] 하드코딩된 시크릿 스캔 완료 — `.env.check`에 OIDC 토큰 발견 (CRITICAL #1)
- [x] 모든 입력 검증 확인 — Zod 기반 검증 양호, storagePath 부분 보완 필요 (MEDIUM #13)
- [x] 인젝션 방지 확인 — Supabase SDK 사용으로 SQL 인젝션 안전, XSS는 JSON-LD에서 주의 필요 (MEDIUM #10)
- [x] 인증/인가 확인 — `withAuth` 일관 적용, admin 이중 체크(이메일+DB role) 양호
- [x] 의존성 감사 완료 — 4개 패키지 취약점 발견 (MEDIUM #11)
- [x] CORS 설정 확인 — 허용 목록 방식 양호, localhost 제거 권장 (LOW #14)
- [x] SSRF 방지 확인 — URL 검증기 존재하나 DNS rebinding/IPv6 보강 필요 (HIGH #4)
- [x] OAuth 보안 확인 — CSRF state 검증, AES-256-GCM 토큰 암호화 양호
- [x] Webhook 서명 검증 확인 — HMAC-SHA256 + timingSafeEqual 양호
- [x] 에러 메시지 정보 노출 검토 — checkout, process-clip에서 수정 필요

---

## OWASP Top 10 평가 요약

| OWASP 카테고리 | 평가 | 관련 이슈 |
|----------------|------|-----------|
| A01 Broken Access Control | **양호** — withAuth 일관 적용, RLS 활성, admin 이중 체크 | #6, #9, #12 |
| A02 Cryptographic Failures | **위험** — API 키 URL 노출, .env.check 토큰 | #1, #2 |
| A03 Injection | **양호** — Supabase SDK 사용, Zod 검증 | #10, #13 |
| A04 Insecure Design | **보통** — 에러 정보 노출, rate limit 무력화 | #3, #5, #7 |
| A05 Security Misconfiguration | **양호** — CORS 허용목록, 환경변수 분리 | #14 |
| A06 Vulnerable Components | **보통** — 4개 취약 패키지 | #11 |
| A07 Auth Failures | **양호** — OAuth CSRF, 세션 관리 양호 | #8 |
| A08 Data Integrity | **양호** — Webhook HMAC 검증 | - |
| A09 Logging Failures | **양호** — 구조화된 로깅 | - |
| A10 SSRF | **보통** — 기본 검증 존재, 고급 우회 미차단 | #4 |

---

## 긍정적 보안 패턴 (잘 구현된 부분)

1. **API 키 해싱** — SHA-256 해시 저장, 원본 키 미보관 (`api-key-auth.ts`)
2. **OAuth 토큰 암호화** — AES-256-GCM, 랜덤 IV (`token-manager.ts`)
3. **Webhook HMAC 검증** — `crypto.timingSafeEqual` 사용 (타이밍 공격 방지)
4. **Zod 기반 입력 검증** — 모든 주요 API에 스키마 검증 적용
5. **withAuth 미들웨어** — API 키 / Bearer / Cookie 3중 인증 체계
6. **Admin 이중 체크** — 이메일 허용목록 + DB role 확인
7. **SSRF 기본 방어** — 사설 IP, 메타데이터 엔드포인트 차단
8. **CORS 허용목록** — 와일드카드(*) 미사용, 도메인 명시
9. **Internal API 분리** — `x-internal-secret` 헤더 인증
10. **Supabase RLS** — 클라이언트 측 쿼리에 RLS 적용
