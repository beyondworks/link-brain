# Session Handover

## 날짜: 2026-03-27
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 1. Maestro UI 테스트 환경 구축
- Maestro CLI 2.3.0 설치 (`~/.maestro/bin/maestro`)
- `.maestro/` 디렉토리에 테스트 플로우 YAML 5개 작성
- simctl + Maestro 조합으로 시뮬레이터 스크린샷 자동 캡처 파이프라인 구축
- iPhone 17 Pro 시뮬레이터 (iOS 26.1)에서 PWA 홈화면 추가 후 풀스크린 테스트

### 2. PWA/모바일 UI 검토 (스크린샷 기반)
- 랜딩, 로그인, 탐색, 요금제, 대시보드, 즐겨찾기, 설정 페이지 캡처 및 분석
- 실기기 스크린샷 2장 수신 → 하단 Nav 아래 과도한 여백 이슈 확인

### 3. 하단 Nav safe area 여백 축소 (1차 시도)
- `aba4ab4` fix: 하단 Nav safe area 여백 축소
  - layout.tsx: 불필요한 하단 커버 div 제거
  - mobile-bottom-nav: h-16→h-14, +버튼 h-12→h-11
  - pull-to-refresh: 콘텐츠 하단 패딩 4rem→3.5rem
- **결과: 실기기에서 여전히 문제 미해결** — 추가 조정 필요

## 미완료

### P0: 하단 Nav 여백 실기기 문제 (진행 중)
- 1차 수정(8px 감소)으로 불충분
- **근본 원인 후보**:
  1. env(safe-area-inset-bottom)이 기기별로 34pt보다 클 수 있음
  2. nav paddingBottom(34pt) 자체가 시각적으로 과도
  3. 콘텐츠 영역의 추가 padding이 누적될 가능성
- **다음 단계**:
  1. 실기기 현재 스크린샷 확인하여 정확한 문제 영역 파악
  2. JS로 실제 env() 값을 표시하는 디버그 오버레이 추가하여 배포 → 실측
  3. 또는 nav 구조 자체 변경: `bottom: env(safe-area-inset-bottom)` 방식으로 nav를 safe area 위에 배치 + 아래는 bg 확장만
- **사용자에게 현재 상태 스크린샷 요청한 상태**

### 네이티브 앱 시뮬레이터 빌드 실패
- Xcode 프로젝트 scheme이 시뮬레이터 destination 미지원
- CLI 빌드 설정 오버라이드 (`SUPPORTED_PLATFORMS`) 도 작동하지 않음
- **해결**: Xcode GUI에서 직접 빌드하거나 scheme 설정 수정 필요

### 이전 세션 미완료 (변동 없음)
- Apple Developer 가입 후 APNs, 실기기 빌드/테스트
- DB 마이그레이션 025~028 미적용 (번호 충돌 정리 필요)
- Supabase 타입 재생성 (`supabaseAdmin as any` 30개 제거용)

## 에러/학습

### Maestro + iOS 시뮬레이터 주의사항
- `swipe direction: UP` → Safari 탭 뷰 전환 트리거. `start/end` 좌표 지정 필요
- Safari 시스템 앱은 `clearState: true` 불가
- 시뮬레이터 erase 후 Safari 쿠키 초기화됨 → 로그인 필요
- `takeScreenshot` 저장 경로가 불확실 → `xcrun simctl io booted screenshot` 조합이 더 신뢰성 높음
- 시뮬레이터와 실기기의 env(safe-area-inset-bottom) 값이 다를 수 있음

### Xcode CLI 빌드 한계
- scheme에 시뮬레이터 destination이 없으면 `SUPPORTED_PLATFORMS` CLI 오버라이드가 무시됨
- scheme 설정은 Xcode GUI에서만 안전하게 수정 가능 (MEMORY 규칙 준수)

## 다음 세션 시작 시
1. `SESSION_HANDOVER.md` 읽기
2. **최우선**: 실기기 하단 여백 스크린샷 확인 → 디버그 오버레이 배포하여 env() 실측값 파악
3. 측정 결과 기반으로 nav 구조 변경 (paddingBottom 방식 → bottom 위치 방식 등)
4. 수정 후 실기기 재확인
