# Session Handover

## 날짜: 2026-03-14 (세션 6)

---

## 완료

### 1. 플랜/크레딧 시스템 프론트엔드 연동
- **설정 페이지 "플랜 & 사용량" 섹션 강화** (`settings-client.tsx`)
  - 기존 단일 크레딧 바 → 플랜 티어 배지(Free/Pro/Master) + 4개 UsageBar(클립·AI 크레딧·Studio·컬렉션) + 초기화 날짜 + 업그레이드 CTA
- **UpgradePrompt 연동** — 한도 초과 시 비차단 경고 배너
  - `add-clip-dialog.tsx`: 클립 한도 초과 시 배너 + Quick Save/분석 버튼 비활성화
  - `studio-client.tsx`: Studio 한도 초과 시 배너 + 생성 버튼 비활성화
  - `usePlan()` 훅의 `canCreateClip`, `canUseStudio` 플래그 사용

### 2. 마케팅 페이지 PLAN_LIMITS 동기화
- **`src/config/plans.ts` 신규** — `PLAN_LIMITS`에서 마케팅 플랜 데이터를 동적 생성 (단일 소스)
- **Pricing 페이지** (`pricing/page.tsx`): 하드코딩 `PLANS` 배열 제거 → `MARKETING_PLANS` 사용
- **Landing 페이지** (`page.tsx`): FAQ 답변, CTA 텍스트, trust signal에서 `PLAN_LIMITS` config 값 동적 참조

### 3. Playwright 시각적 검증
- Pricing 페이지: 3개 플랜 카드 수치 config 값과 일치 확인
- Landing 페이지: FAQ/CTA 텍스트 config 값 반영 확인
- 빌드: `tsc --noEmit` + `npm run build` 모두 통과

### 4. 이전 세션(세션 5) 작업
- 이미지 클립 썸네일 표시 (clip.url fallback)
- 이미지 페이지 6열 그리드 + 드래그앤드롭 앨범 이동 (데스크탑 HTML5 + 모바일 롱터치)
- 검색 강화: 카테고리/컬렉션/이미지 pill 오버레이
- Studio 콘텐츠 새로고침 유지 (auto-restore + error toast)

---

## 미커밋 변경 사항

```
M  src/app/(app)/settings/settings-client.tsx  — 플랜 섹션 강화
M  src/app/(app)/studio/studio-client.tsx       — UpgradePrompt 연동
M  src/app/(marketing)/page.tsx                 — PLAN_LIMITS 동적 참조
M  src/app/(marketing)/pricing/page.tsx         — MARKETING_PLANS 사용
M  src/components/clips/add-clip-dialog.tsx     — UpgradePrompt 연동
?? src/config/plans.ts                          — 마케팅 플랜 config (신규)
```

**브랜치**: `main` (커밋 전 — 사용자 확인 대기)

---

## 미완료

### P0 — 즉시
- [ ] 미커밋 변경 사항 커밋 (사용자 브랜치 결정 대기)
- [ ] `src/app/api/v1/clips-detail/route 2.ts` — 공백 포함 중복 파일, 삭제 필요

### P1 — 플랜 시스템 확장
- [ ] Stripe/결제 연동 (현재 플랜 변경 UI만 있고 실제 결제 없음)
- [ ] 사이드바 하단에 PlanUsageCard 렌더링 (컴포넌트 존재하지만 미사용)
- [ ] 컬렉션 생성 시 `canCreateCollection` 체크 + UpgradePrompt

### P1 — DB 마이그레이션
- [ ] `016_image_upload_support.sql` — DB push 미적용
- [ ] `017_plan_system.sql` — DB push 적용 여부 확인 (credit_usage 테이블)
- [ ] `008`, `009` 마이그레이션 미적용

### P2 — 정리
- [ ] `supabase gen types typescript` → `as any` 30개 제거
- [ ] 로고 결정 (7개 SVG 중 선택)
- [ ] stale 리모트 브랜치 정리

---

## 에러/학습

1. **Turbopack dev 서버 hang**: 첫 요청 시 2분+ 타임아웃. `npm run build` + `next start` 프로덕션 모드로 Playwright 검증 진행
2. **PLAN_LIMITS 동기화**: `Infinity` 값은 `formatLimit()` 헬퍼로 '무제한' 문자열 변환. pricing 페이지 JSON-LD도 config에서 동적 생성

---

## 다음 세션 시작 시

1. `MEMORY.md` + `SESSION_HANDOVER.md` 읽기
2. 미커밋 변경 사항 커밋 (feat 브랜치 or main 직접)
3. DB 마이그레이션 적용 여부 확인 (`017_plan_system.sql` — credit_usage 테이블)
4. Stripe 연동 또는 사이드바 PlanUsageCard 렌더링 진행
5. `route 2.ts` 중복 파일 삭제
