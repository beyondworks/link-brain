# Session Handover

## 날짜: 2026-03-18 (2차)
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 모바일 UX 근본 원인 수정 (4대 이슈)
1. **스크롤 바운스**: `transform: undefined` → `translateY(0px)` + 스프링 이징으로 릴리즈 바운스 효과
2. **사이드바+하단바 렌더링**: `MobileBottomNav`를 `#app-content` 바깥으로 이동 (CSS filter containing block 문제 근본 해결)
3. **콘텐츠 잘림**: `pull-to-refresh.tsx`에 `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` 적용
4. **헤더 스크롤 피드백**: scroll 이벤트 기반 shadow/border 변화 추가

### 크레딧/플랜 시스템 점검 및 수정 (코드 리뷰 12개 이슈)
- **[CRITICAL]** studio-generations AI_STUDIO 이중 차감 제거 — `/api/v1/ai`에서만 차감
- **[CRITICAL]** `deduct_credit()` SQL 함수에 `pg_advisory_xact_lock` 추가 (race condition 방지)
- **[HIGH]** `process-clip/route.ts`에 `isUserKey` 체크 추가 — 사용자 API 키 사용 시 크레딧 미차감
- **[HIGH]** 한도값 single source of truth — `p_monthly_limit` 파라미터로 TypeScript→SQL 전달
- **[MEDIUM]** `getMonthStart/getMonthEnd` UTC 명시 (`Date.UTC()`)
- **[MEDIUM]** `deserializeLimit` dead code 제거
- **[MEDIUM]** 크레딧 부족/한도 초과 에러 메시지 한글화 + `upgradeUrl` 추가
- **[MEDIUM]** `studio-generations/route.ts` unused import 정리

### DB 직접 변경 (Supabase SQL Editor)
- `UPDATE users SET plan = 'master'` — artiwave@naver.com, beyondworks.br@gmail.com
- `CREATE OR REPLACE FUNCTION deduct_credit()` — advisory lock + p_monthly_limit + UTC

### 커밋 내역
- `0e8471d` fix: 모바일 UX 근본 원인 수정
- `aee5735` fix: 클립 저장 시 AI_SUMMARY 크레딧 차감 누락 수정
- `8cb7032` fix: 크레딧/플랜 시스템 코드 리뷰 이슈 일괄 수정

### 변경된 파일
- `src/app/(app)/layout.tsx` — 하단바 위치 이동 + 스크롤 헤더 피드백
- `src/components/layout/pull-to-refresh.tsx` — 바운스 애니메이션 수정
- `src/app/api/internal/process-clip/route.ts` — isUserKey 체크 + 크레딧 차감
- `src/app/api/v1/studio-generations/route.ts` — 이중 차감 제거 + import 정리
- `src/config/credits.ts` — 주석 업데이트 + dead code 제거
- `src/lib/services/plan-service.ts` — UTC 명시 + p_monthly_limit 전달
- `src/lib/api/response.ts` — 에러 메시지 한글화

## 미완료

### 결제 시스템 연동 준비 (코드 리뷰 잔여)
- **API key 한도 UI 문구**: 마케팅 pricing 섹션에 Free: 0개, Pro: 5개, Master: 10개 표기 필요 — 기획 확인 후 수정
- **마이그레이션 SQL 파일 동기화**: `017_plan_system.sql`에 advisory lock + p_monthly_limit 변경 반영 필요 (런타임은 이미 적용됨)

### 기타
- 클립 동기화 (마스터 계정 간) — 보류

## 핵심 학습
- **CSS `filter`가 `position: fixed` containing block을 변경**: filter가 적용된 부모 안의 fixed 자식은 viewport 기준이 아닌 부모 기준으로 위치 — DOM 구조 변경으로 해결
- **`transform: undefined`는 CSS에서 `none`**: `translateY(Xpx)` → `none` 보간 불가 → 항상 `translateY(0px)` 사용
- **크레딧 차감 race condition**: 동시 요청 시 TOCTOU 발생 → `pg_advisory_xact_lock(hashtext(user_id))` 필수
- **SQL ↔ TypeScript 한도값 이중 관리**: SQL RPC에 파라미터로 전달하면 단일 소스 유지

## 다음 세션 시작 시
- `017_plan_system.sql` 마이그레이션 파일에 advisory lock + p_monthly_limit 변경 반영
- 결제 시스템 (Stripe 등) 연동 시작 가능한 상태
- 실기기에서 모바일 UX 수정사항 검증 권장
