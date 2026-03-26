# Session Handover

## 날짜: 2026-03-26
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 1. 미커밋 변경 커밋 분리 (2개 커밋)
- `f0c3dab` feat: 비동기 최적화 (10개 파일)
- `d799458` style: PWA safe-area 수정 (3개 파일)

### 2. Admin 대시보드 성능 + UI 개선
- `2464ce7` feat: Admin 대시보드 성능 최적화 + UI 개선
- 플랫폼 분포: 1000행 클라이언트 집계 → `get_platform_distribution` RPC 서버 집계
- 클립 카운트: 5000행 클라이언트 집계 → `get_user_clip_counts` RPC 서버 집계
- nav를 Client Component 분리 (`admin/_components/admin-nav.tsx`) + usePathname active 하이라이트
- 사용자 테이블에 플랜 칼럼 추가
- DB 마이그레이션: `029_admin_platform_distribution.sql` (2개 RPC 함수)

### 3. Screenshot → AI Vision URL 추출 API
- `c5f4d4f` feat: POST /api/v1/screenshot-save
- `extractUrlsFromScreenshot()` — GPT-4o-mini vision으로 스크린샷 URL 추출
- URL 정규화 + 중복 제거 + SSRF 방어
- autoSave 옵션: 추출 URL 자동 클립 저장

### 4. 하단 메뉴바(MobileBottomNav) iOS safe area 대응 (다수 커밋)
- **근본 원인**: AppShell의 `fixed inset-0 overflow-hidden`이 iOS WebKit에서 nav를 수직 클리핑 + layout.tsx 하단 커버 div `z-[9999]`가 nav 위를 덮음
- **최종 해결**:
  - MobileBottomNav를 root `layout.tsx`로 이동 (overflow-hidden 조상 없음)
  - `bottom: 0` + `paddingBottom: env(safe-area-inset-bottom)` (네이티브 env=0, PWA env=34pt)
  - 커버 div z-index `9999→20` (nav z-30 아래)
  - 앱 경로에서만 표시하도록 pathname 체크 추가
- 관련 커밋: f87ddfb → 72529ec → 6d8b73b → c9bc94b → 89bc65c → 5e5e769 → f77c417 → c0c8b7e → 9043444 → 236da34

### 5. 사이드바 하단 safe area 패딩
- `c03c7de` fix: 사이드바 bottom section에 `paddingBottom: env(safe-area-inset-bottom)` 추가

## 미완료

### PWA 하단 여백 미세 조정
- 네이티브: 정상 (bottom: 0, env=0)
- PWA: nav 배경이 safe area까지 확장되지만 여전히 home indicator 영역(34pt) 여백 존재
- 사용자 피드백 기반으로 추가 조정 필요할 수 있음
- **다음 단계**: 배포 후 PWA 스크린샷 확인

### 이전 세션 미완료
- Apple Developer 가입 후 APNs, 실기기 빌드/테스트
- DB 마이그레이션 025~028 미적용 (029는 적용)
- Supabase 타입 재생성 (`supabaseAdmin as any` 30개 제거용)

## 에러/학습

### iOS WebKit overflow-hidden 클리핑 (핵심)
- `position: fixed` + `overflow: hidden` 조합에서 iOS WebKit은 fixed 자식도 수직 클리핑
- Chrome/Firefox와 다른 동작 (CSS 스펙 위반)
- `overflow-x: hidden`도 CSS 스펙상 overflow-y를 auto로 변환하여 여전히 클리핑
- **해결**: fixed position 요소를 overflow-hidden 컨테이너 밖에 배치

### z-index 커버 div 함정
- layout.tsx 하단 커버 div가 z-[9999]로 모든 fixed 요소 위에 불투명 렌더
- nav를 bottom: 0으로 내렸을 때 커버 div가 nav 하단 34px을 가림
- **해결**: z-[9999] → z-20 (nav z-30 아래)

### env(safe-area-inset-bottom) 플랫폼 차이
- Capacitor native (`contentInset: "never"`): env() = 0
- PWA (viewport-fit: cover): env() = 34pt
- 동일 CSS로 두 환경 모두 대응: `paddingBottom: env()` (0이면 효과 없음)

### z-sticky 미정의
- Tailwind v4에서 `z-sticky`는 기본 유틸리티 아님 (globals.css @theme에도 미정의)
- `z-30` 하드코딩으로 교체

## 다음 세션 시작 시
1. `SESSION_HANDOVER.md` 읽기
2. PWA 하단 여백 사용자 피드백 확인 → 추가 조정 필요 여부
3. 남은 미완료 작업 우선순위 확인
