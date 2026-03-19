# 데드/미완성 기능 탐지 보고서

> 생성일: 2026-03-19
> 검토 범위: `src/` 전체 (컴포넌트 107개, 훅 54개, API 라우트 40+)
> 검토 방법: grep 패턴 탐색, 마이그레이션 대조, 코드 흐름 추적

---

## 요약

| 심각도 | 건수 |
|--------|------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 4 |
| **합계** | **18** |

---

## CRITICAL

### C-1. `remind_at` 컬럼 — DB 마이그레이션 누락

**파일**: `src/app/api/v1/clips/[clipId]/reminder/route.ts`, `src/components/clips/reminder-dialog.tsx`, `src/lib/hooks/use-reminder.ts`

**현상**: 리마인더 설정 UI(클립 상세 페이지 알람 버튼, 대시보드 ReminderSection)와 API(`GET/POST/DELETE /api/v1/clips/:id/reminder`)가 완전히 구현되어 있으나, `remind_at` 컬럼을 추가하는 마이그레이션이 존재하지 않는다.

마이그레이션 파일 001~024를 전수 조회한 결과 `remind_at` 키워드가 단 한 건도 없음. API 코드 내부에 직접 fallback 처리가 있을 정도로 이 사실이 인지된 상태:

```ts
// reminder/route.ts:98~103
if (updateError.message.includes('remind_at')) {
  console.warn('[API v1 Reminder] remind_at column not found — migration required');
  return errors.serverError('remind_at 컬럼이 DB에 없습니다. 마이그레이션이 필요합니다.',
    { hint: 'ALTER TABLE clips ADD COLUMN remind_at timestamptz;' });
}
```

**영향**: 사용자가 리마인더를 설정하면 500 에러 발생. UI는 정상 노출됨.

**조치**: `ALTER TABLE clips ADD COLUMN remind_at timestamptz;` 마이그레이션 파일 생성 및 적용 필요.

---

### C-2. `extractWithPuppeteer` — 스텁 함수가 실제 호출 경로에 존재

**파일**: `src/lib/fetchers/puppeteer-extractor.ts`

**현상**: 함수 전체가 빈 결과를 반환하는 스텁임에도 4개 fetcher에서 실제 코드 경로로 호출되고 있음.

```ts
// puppeteer-extractor.ts:11-13
export const extractWithPuppeteer = async (_url: string): Promise<FetchedUrlContent> => {
    console.warn('[Puppeteer] Not available in v2 environment — returning empty result');
    return { rawText: '', images: [] };
};
```

호출 위치:
- `naver-fetcher.ts:91` — 네이버 블로그 본문 추출 경로
- `youtube-fetcher.ts:194` — YouTube 상세 텍스트 보강 경로
- `instagram-fetcher.ts:21` — Instagram 콘텐츠 추출 경로
- `social-fetcher.ts:21` — 소셜 미디어 fallback 경로

**영향**: 네이버 블로그, Instagram, 일부 YouTube 클립이 콘텐츠 없이 저장됨. 사용자는 오류 메시지 없이 빈 요약을 받음.

**조치**: 스텁임을 호출 지점에서 명시하고 해당 분기를 건너뛰도록 처리하거나, 별도 스크래핑 서비스(Browserless 등) 연동 필요.

---

### C-3. 마케팅 푸터 — 5개 링크가 `href="#"` (미연결)

**파일**: `src/app/(marketing)/layout.tsx:104, 151`

**현상**: 랜딩 페이지 푸터의 다운로드 버튼과 주요 링크 5개가 모두 `href="#"`로 하드코딩되어 있음.

```tsx
// layout.tsx:104-114
<Link href="#" ...>Download</Link>

// layout.tsx:148-158 (map으로 생성)
{['업데이트', '문의하기', '도움말 센터', 'API 문서', '법적 고지'].map((label) => (
  <a href="#" ...>{label}</a>
))}
```

소셜 링크도 `https://twitter.com`, `https://github.com` 제네릭 URL로 하드코딩되어 실제 계정으로 연결되지 않음.

**영향**: 신규 방문자가 다운로드, 문의, 도움말을 클릭해도 페이지 최상단으로 이동. 제품 신뢰도 직격.

**조치**: 실제 URL 또는 준비 전까지 링크 제거/숨김 처리.

---

## HIGH

### H-1. 알림 설정 — `followerNotif` (팔로워 알림) 기능 없음

**파일**: `src/app/(app)/settings/settings-client.tsx:143, 182, 667`

**현상**: 설정 페이지 알림 섹션에 "팔로워 알림" 토글이 노출되어 있으나, Linkbrain v2에는 팔로워/소셜 기능 자체가 없음. 토글을 켜도 localStorage에만 저장될 뿐 아무 동작 없음.

**영향**: 사용자 혼란. 작동하지 않는 설정을 제공하는 UI.

**조치**: 팔로워 기능 구현 전까지 해당 토글 UI 제거 또는 "준비 중" 뱃지 표시.

---

### H-2. `ENABLE_YT_DETAILED_SUMMARY_PREPEND` 환경변수 — 설정 누락 시 YouTube 요약 비활성화

**파일**: `src/lib/services/clip-service.ts:310-311, 401`

**현상**: YouTube 클립의 상세 요약을 콘텐츠에 prepend하는 기능이 환경변수 하나에 gate되어 있음. 환경변수가 설정되지 않으면 비활성화됨. MEMORY.md에도 "미설정이면 비활성"으로 명시되어 있으나 현재 Vercel 환경에 설정 여부 미확인.

```ts
const ENABLE_YT_DETAILED_SUMMARY_PREPEND =
  process.env.ENABLE_YT_DETAILED_SUMMARY_PREPEND === 'true';
```

**영향**: YouTube 클립 품질 저하 (요약이 본문에 포함되지 않음).

**조치**: 환경변수를 제거하고 항상 활성화하거나, Vercel에 명시적으로 설정 필요.

---

### H-3. 피처 플래그 3개 — UI 없이 `false` 고정

**파일**: `src/config/feature-flags.ts:14-16`

```ts
WEEKLY_DIGEST: false,     // not yet implemented
BROWSER_EXTENSION: false, // not yet implemented
TEAM_WORKSPACE: false,    // not yet implemented
```

**현상**: 코드베이스 전체에서 이 세 플래그는 오직 `feature-flags.ts`에만 존재하고, 어디서도 참조되거나 사용되지 않음. 단순 선언 수준.

**영향**: 낮은 직접 위험이나, 사용자가 이 기능들을 UI에서 볼 수 없으므로 기대치 불일치 가능성은 낮음. 다만 플랜/결제 페이지에서 이 기능들을 Pro 혜택으로 광고할 경우 허위 마케팅.

**조치**: 실제 구현 일정 없으면 플래그 목록에서 제거 또는 로드맵 문서로 이동.

---

### H-4. `024_beta_feedback` 마이그레이션 — review-context.md 미기재

**파일**: `supabase/migrations/024_beta_feedback.sql`, `src/components/dashboard/beta-feedback.tsx`

**현상**: `024_beta_feedback.sql`이 파일로는 존재하지만, `review-context.md`의 "DB Migrations Applied" 섹션에는 001~022까지만 기재되어 있음. 적용 여부가 불분명하다.

`beta-feedback.tsx`는 `supabase.from('beta_feedback').insert(...)` 직접 호출을 하며 대시보드에 렌더링됨.

**영향**: 마이그레이션 미적용 상태에서 베타 피드백 제출 시 DB 오류 발생.

**조치**: `supabase db push` 또는 수동 적용으로 024 마이그레이션 반영 확인 필요.

---

### H-5. 알림 설정 — `emailNotif`, `aiNotif` localStorage 전용, 실제 이메일/AI 알림 연동 없음

**파일**: `src/app/(app)/settings/settings-client.tsx:138-162, 244-253`

**현상**: 이메일 알림, AI 알림 토글이 존재하나 값을 localStorage에만 저장하고 어떤 백엔드 API 호출도 없음. 실제 이메일 발송 시스템(SendGrid 등)과 연동된 흔적이 없음.

```ts
function handleNotifChange(key, setter, value) {
  setter(value);
  const current = loadNotifSettings();
  saveNotifSettings({ ...current, [key]: value }); // localStorage만 업데이트
  toast.success('알림 설정이 변경되었습니다'); // 성공처럼 보이지만 서버 미반영
}
```

**영향**: 사용자가 알림 설정을 변경해도 실제 이메일 발송/차단에 영향 없음. "변경되었습니다" 토스트가 허위 피드백을 줌.

**조치**: 이메일 알림 연동 전까지 알림 섹션 제거 또는 "준비 중" 표기 필요.

---

## MEDIUM

### M-1. `as any` / `as never` 타입 우회 — 30+개 파일

**파일**: `src/lib/services/clip-service.ts`, `src/lib/services/embedding-service.ts` 외 30개+ 파일

**현상**: `supabaseAdmin as any`가 30개 이상 파일에서 패턴으로 사용됨. 이는 `supabase gen types typescript` 미실행으로 인한 타입 불일치 때문.

또한 `src/app/s/[token]/page.tsx:16`에서 `share_token` 컬럼 DB 미적용으로 인한 `as any` 우회가 명시적으로 언급되어 있음(MEMORY.md).

**영향**: 런타임 오류가 TypeScript 컴파일 단계에서 걸러지지 않음. 향후 스키마 변경 시 무음 실패 위험.

**조치**: `supabase gen types typescript --project-id ucflmznygocgdwreoygc > src/types/database.ts` 실행 후 `as any` 제거.

---

### M-2. 시드 클립 데이터 — 실제 앱 코드에서 임포트

**파일**: `src/config/seed-clips.ts`, `src/app/(app)/clip/[clipId]/clip-detail-client.tsx:62`, `src/components/clips/clip-peek-panel.tsx:45`

**현상**: 목업/시드 데이터 파일이 프로덕션 컴포넌트에서 직접 import됨. 시드 데이터는 일반적으로 개발/테스트 전용이어야 하며, 실제 사용자 데이터 조회를 대체하는 경우 silent fallback이 될 수 있음.

**조치**: 사용 목적 확인 (온보딩 샘플 클립 등 의도된 사용이면 허용, 그렇지 않으면 제거).

---

### M-3. `console.log` 2건 — 프로덕션 코드에 잔존

**파일**:
- `src/lib/fetchers/youtube-fetcher.ts:169`
- `src/lib/fetchers/web-fetcher.ts:195`

```ts
console.log(`[YouTube Fetcher] Defuddle supplement success (${defuddleResult.rawText.length} chars)`);
console.log(`[Web Fetcher] Defuddle success (${normalizedDefuddle.rawText.length} chars)`);
```

**영향**: Vercel 로그에 노이즈 발생. CLAUDE.md 규칙("console.log PR에 남기지 않음") 위반.

**조치**: `console.log` → `console.debug` 또는 제거.

---

### M-4. 소셜 링크 — 제네릭 URL 하드코딩

**파일**: `src/app/(marketing)/layout.tsx:134, 138`

```tsx
<a href="https://twitter.com" ...>  // 실제 @linkbrain 계정 아님
<a href="https://github.com" ...>   // 실제 저장소 아님
```

**영향**: 클릭 시 트위터/깃허브 홈으로 이동. 브랜드 연결 없음.

**조치**: 실제 계정 URL로 교체 또는 소셜 링크 제거.

---

### M-5. `remind_at` 컬럼 없을 때 console.warn + graceful skip — 런타임 에러 은닉

**파일**: `src/app/api/v1/clips/[clipId]/reminder/route.ts:98-103`

**현상**: C-1과 연관. 컬럼 부재 시 에러를 조용히 처리하고 사용자에게 "마이그레이션 필요" 메시지만 반환. 모니터링에서 놓치기 쉬운 패턴.

**조치**: C-1 해결 후 이 방어 코드 제거.

---

### M-6. `023_remove_master_plan` 중복 파일

**파일**: `supabase/migrations/023_remove_master_plan.sql`, `supabase/migrations/023_remove_master_plan 2.sql` (공백 포함 파일명)

**현상**: 동일 번호(023)의 마이그레이션 파일이 2개 존재. 공백 포함 파일명은 일부 환경에서 `supabase db push` 오류를 유발할 수 있음.

**조치**: 중복 파일 삭제 및 공백 포함 파일명 제거.

---

## LOW

### L-1. `READING_PROGRESS` 피처 플래그 `true` — 그러나 프론트 UI에서 사용 확인 필요

**파일**: `src/config/feature-flags.ts:9`, `src/app/api/v1/clips/[clipId]/progress/route.ts`

**현상**: API는 존재하나, 읽기 진행률 UI(`continue-reading.tsx`)가 대시보드 외에 어디서 노출되는지 추적이 제한적. 기능 플래그가 `true`이지만 실제 노출 경로를 사전 확인 권장.

---

### L-2. `lib/fetchers/puppeteer-extractor.ts` — `console.warn` 잔존

**파일**: `src/lib/fetchers/puppeteer-extractor.ts:12`

```ts
console.warn('[Puppeteer] Not available in v2 environment — returning empty result');
```

모든 클립 저장 시도마다 warn 로그가 남음. Vercel 로그 오염.

**조치**: warn 제거 또는 호출 지점에서 스텁 분기 자체를 skip.

---

### L-3. `lib/ai/embeddings.ts` — DB 타입 미반영 주석

**파일**: `src/lib/ai/embeddings.ts:9`

```ts
// tables not yet present in the Database type definition (clip_embeddings).
```

019 마이그레이션이 적용되어 있으므로 이 주석은 구식. `as any` 우회가 여전히 남아 있을 가능성.

**조치**: 타입 재생성 후 주석 및 `as any` 제거.

---

### L-4. `023_remove_master_plan` 미적용 여부 확인 필요

**파일**: `supabase/migrations/023_remove_master_plan.sql`

`review-context.md`에는 마이그레이션 적용 현황이 022까지만 기재되어 있음. 023과 024가 실제로 Supabase에 적용되었는지 확인 필요.

**조치**: `supabase migration list` 또는 Supabase 대시보드에서 적용 상태 확인.

---

## 전체 우선순위 요약

| 순위 | 항목 | 이유 |
|------|------|------|
| 1 | C-1 `remind_at` 마이그레이션 | 사용자가 리마인더 설정 시 즉시 500 오류 |
| 2 | C-3 마케팅 푸터 `href="#"` | 랜딩 방문자에게 즉시 노출되는 깨진 링크 |
| 3 | H-5 알림 설정 허위 피드백 | 저장 성공 토스트가 실제 저장 없이 노출 |
| 4 | C-2 Puppeteer 스텁 | 네이버/Instagram 클립이 빈 콘텐츠로 저장됨 |
| 5 | H-4 024 마이그레이션 미적용 | 베타 피드백 제출 실패 가능성 |
| 6 | H-2 YouTube 환경변수 미설정 | YouTube 클립 품질 저하 |
| 7 | M-1 `as any` 30+ 파일 | 타입 안전성 제로 구간 |
