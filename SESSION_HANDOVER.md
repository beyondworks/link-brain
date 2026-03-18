# Session Handover

## 날짜: 2026-03-19 (4차)
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 1. Lemon Squeezy 결제 시스템 전체 구축
- Master 플랜 제거 → Free/Pro 2티어 (12개 파일 + DB 마이그레이션 023)
- `src/lib/lemonsqueezy.ts` — API 클라이언트 (체크아웃 생성, 포탈 URL)
- `POST /api/checkout` — Pro 체크아웃 URL 생성 (월간/연간)
- `POST /api/billing/portal` — 구독 관리 포탈 URL
- 웹훅 핸들러 master variant 로직 제거
- DB 마이그레이션 023: CHECK 제약조건 + deduct_credit 함수 업데이트

### 2. Lemon Squeezy 스토어 세팅 (API로 처리)
- 상품 가격 수정: Monthly ₩9,900, Annual ₩95,040 (₩7,920/월)
- 웹훅 URL `/api/webhooks/lemonsqueezy` + 이벤트 8개 + 시크릿 설정
- Vercel 환경변수 5개 등록 (printf로 개행 없이)

### 3. 결제 체크아웃 UX (PR #59)
- `useCheckout` 훅 — 체크아웃/포탈 공통 로직
- Pricing 스마트 ProButton — 비로그인→회원가입, Free→체크아웃, Pro→구독관리
- 대시보드 UpgradeBanner — 한도 80% 도달 시

### 4. 업그레이드 유도 + 피드백 위젯 (PR #60)
- UpgradePrompt → 체크아웃 직접 연결 (기존 /pricing 링크 대체)
- Studio 에러 토스트 → "Pro 업그레이드" 액션 버튼
- BetaFeedback 위젯 — 대시보드 피드백 수집 (DB beta_feedback + localStorage fallback)
- DB 마이그레이션 024 (beta_feedback 테이블)

### 5. UX 흐름 연결
- 랜딩 CTA 6개 버튼 올바른 경로 연결 (href="#" → /signup, /pricing 등)
- Settings 플랜 섹션 개선 (Free: 기능비교+체크아웃, Pro: 구독관리/결제변경)
- 크레딧 초기화 문구 "매월 1일 초기화 (다음 X월 X일)"
- 사이드바 Pro 배지 하드코딩 → usePlan() 기반 동적 표시

### 6. UI 접근성
- cursor-pointer, focus-visible:ring-2, aria-label/aria-expanded 일괄 추가
- Pricing 토글 버튼 접근성

### 7. 앱 아이콘
- 심볼 크기 scale(0.65) → scale(0.82), PNG 3개 재생성

### 주요 커밋
- `313611b` feat: SEO + Lemon Squeezy 결제 연동 (PR #58 squash)
- `f585630` feat: 체크아웃 UX (PR #59)
- `34c35d0` feat: 업그레이드 유도 + 피드백 위젯 (PR #60)
- `9543a39` fix: 랜딩 CTA 링크 연결
- `00032e0` feat: Settings 플랜 섹션 개선
- `7a5b18d` fix: 사이드바 Pro 배지 하드코딩 수정
- `ee0f186` fix: 앱 아이콘 심볼 크기 확대

## 미완료

### 결제 관련
- **에러 토스트 메시지 일반화**: 현재 디버깅용으로 API 에러 전체를 노출 중 → 안정화 후 일반 메시지로 복원 필요 (`use-checkout.ts`, `checkout/route.ts`)
- **결제 완료 후 UI 갱신 테스트**: 실제 결제 → 웹훅 → DB tier 변경 → 프론트엔드 반영 E2E 확인 필요
- **Supabase Auth Site URL**: `linkbrain.cloud`로 재설정 완료 — 로그인 리다이렉트 정상 동작 확인 필요

### SEO (이전 세션에서 이관)
- Pretendard 폰트 최적화: CDN → next/font/local 전환

### 기능
- **Pro 전용 기능 잠금 표시**: 시맨틱 검색, 지식 그래프, API 키 등에 자물쇠 아이콘
- **클립 저장 한도 도달 다이얼로그**: AddClipDialog에서 100개 초과 시 업그레이드 안내
- **Footer 링크**: 업데이트, 문의하기, 도움말 센터, API 문서, 법적 고지 — 모두 href="#" 상태

## 에러/학습

### Vercel 환경변수 등록 시 주의
- `echo "value" | vercel env add` → 개행문자(\n) 포함되어 API 키 등 긴 값이 깨짐
- **올바른 방법**: `printf '%s' 'value' | vercel env add NAME production`
- 환경변수 변경 후 반드시 **새 배포** 트리거 필요 (기존 배포는 이전 값 사용)

### Lemon Squeezy API 키 주의
- API 키(JWT)는 1032자+ — 파이프/echo로 전달 시 잘림 위험
- `lemonsqueezy.ts`에서 API_KEY를 모듈 상수로 읽으면 serverless cold start 캐시 문제 → **함수 내부에서 process.env 직접 참조**로 수정

### 사이드바 배지 하드코딩
- app-shell.tsx에 "Pro" 텍스트가 하드코딩되어 있었음 → usePlan() 기반으로 수정

## 다음 세션 시작 시
- 에러 토스트 메시지 일반화 (디버깅용 상세 메시지 → 사용자 친화적 메시지)
- 실제 결제 테스트 → 웹훅 → Pro 전환 E2E 확인
- Footer 링크 정리
- Pro 전용 기능 잠금 표시 구현
