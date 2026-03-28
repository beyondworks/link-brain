# Session Handover

## 날짜: 2026-03-28
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 1. 하단 Nav 디버그 — 근본 원인 확정
- 실기기 디버그 오버레이 배포하여 env() 값 실측:
  ```
  innerH: 812, screen: 402x874, safeBot: 0, standalone: true
  ```
- **근본 원인 확정**: iOS standalone PWA 모드에서 `viewport-fit: cover`가 작동하지 않음
  - `env(safe-area-inset-bottom)` = **0px** (CSS safe area 완전 무효)
  - 뷰포트 812px, 화면 874px → 하단 ~34px는 OS가 theme-color로 채우는 영역
  - 앱 코드로 접근 불가 (뷰포트 밖)
- PWA 삭제 → 재추가, `apple-mobile-web-app-capable` 메타 태그 추가 등 모두 시도 → **효과 없음**

### 2. layout.tsx / globals.css 변경 원복
- `apple-mobile-web-app-capable` 메타 태그 추가 → 테마 색상 깨짐 → 원복
- bottom safe area cover div 추가 → 효과 없음 → 원복
- `height: 100dvh` 추가 → 효과 없음 → 원복
- **현재 layout.tsx, globals.css는 원본 상태와 동일** (diff 없음)

### 3. mobile-bottom-nav.tsx 정리
- 디버그 오버레이 추가/제거 (최종 제거 완료)
- nav 높이: h-12 (48px), 아이콘 20px, 라벨 10px
- `paddingBottom: env(safe-area-inset-bottom, 0px)` 유지 (Capacitor에서 정상 작동 대비)
- 불필요한 래퍼 div, glow 효과 등 정리

## 미완료

### P0: 하단 Nav 여백 — Capacitor 네이티브 빌드로 전환
- **iOS standalone PWA에서는 해결 불가능** (OS 한계 확정)
- **Capacitor 네이티브 빌드가 유일한 해결책**:
  - `capacitor.config.ts`에 `contentInset: 'never'` 설정됨 (WebView 전체 화면)
  - 라이브 서버 모드 (`linkbrain.cloud`) 사용 중 → 배포된 코드 즉시 반영
  - Xcode GUI에서 빌드 필요 (CLI scheme 문제 미해결)
- **다음 단계**:
  1. Xcode에서 `ios/App/App.xcworkspace` 열기
  2. 실기기 선택 → Run (Personal Team 서명 필요)
  3. Capacitor WebView에서 `env(safe-area-inset-bottom)` 정상 반환되는지 확인
  4. 정상이면 nav가 safe area 위에 배치되고 하단 여백 해결

### 이전 세션 미완료 (변동 없음)
- Apple Developer 가입 후 APNs, TestFlight 배포
- DB 마이그레이션 025~028 미적용 (번호 충돌 정리 필요)
- Supabase 타입 재생성 (`supabaseAdmin as any` 30개 제거)
- Xcode scheme에 시뮬레이터 destination 추가 (GUI에서)

## 에러/학습

### iOS standalone PWA의 viewport-fit 한계 (핵심 발견)
- `viewport-fit: cover` 메타 태그가 있어도 standalone PWA에서 뷰포트가 safe area로 확장되지 않음
- `env(safe-area-inset-bottom)` = 0 → 모든 safe area CSS 무효
- `apple-mobile-web-app-capable` 추가해도 변함없음
- PWA 삭제 → 재추가해도 변함없음
- **결론**: iOS PWA에서 하단 safe area 제어는 불가능. Capacitor 네이티브만 가능.

### `apple-mobile-web-app-capable` 메타 태그 사이드이펙트
- Next.js의 `other` 메타데이터로 추가 시 기존 `mobile-web-app-capable`과 충돌
- 테마 모드 무시하고 배경/노치 색상이 다크모드로 고정되는 현상 발생
- **교훈**: Next.js metadata API의 apple 관련 태그는 `appleWebApp` 필드만 사용, `other`로 직접 추가 금지

## 다음 세션 시작 시
1. `SESSION_HANDOVER.md` 읽기
2. **최우선**: Xcode에서 Capacitor 앱 빌드 → 실기기에서 하단 여백 확인
3. Capacitor에서 해결 확인되면 → PWA 하단 여백은 "iOS 한계" 문서화하고 close
4. 미해결 시 → Capacitor WebView의 safe area 설정 디버깅
