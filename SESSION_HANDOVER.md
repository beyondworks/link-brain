# Session Handover

## 날짜: 2026-03-19 (5차)
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### 1. Pre-Deploy Review (6개 에이전트 병렬)
- 코드 품질, 보안, UX, 빈 기능, 아키텍처, 접근성 6관점 리뷰 완료
- 총 87개 이슈 발견 (Critical 12, High 22, Medium 33, Low 20)
- 리포트 파일: `review-report.md` (종합), `review-*.md` (개별 6개)

### 2. Critical 12건 수정 완료
- `.env.check` → `.gitignore` 추가
- Gemini API 키 URL → `x-goog-api-key` 헤더로 이동
- 모듈 레벨 `process.env` 5곳 → 함수 내부 읽기 (webhook, process-clip, backfill, model-resolver, clip-service)
- `autoTagClip` 전체 tags 풀 스캔 → `.in('name', keywords)` 필터링
- `execListTags` 전체 클립 풀 스캔 → `.limit(500)` 추가
- `remind_at` 마이그레이션 생성 (`025_add_remind_at.sql`)
- Puppeteer 스텁 호출 4개 fetcher에서 skip + import 제거
- 마케팅 푸터 `href="#"` → 실제 링크 교체 + 소셜 링크 제거
- 계정 삭제 → 이메일 문의 링크로 교체
- 비밀번호 재설정 → `/forgot-password` 페이지 생성 + 로그인 링크

### 3. 빈 기능 6건 추가 수정
- 팔로워 알림 토글 제거 + "이 기기에만 적용" 안내
- 언어 설정 영어 `disabled` + "(준비 중)"
- GitHub 카드 하드코딩 stars/forks 제거
- console.log 프로덕션 2건 제거
- Feature flags 미사용 3개 주석 처리

### 4. Capacitor iOS 네이티브 앱 셋업
- 패키지 설치: @capacitor/core, cli, ios + 7개 플러그인
- `capacitor.config.ts` 생성 (라이브 서버 모드 → `/dashboard` 진입)
- `src/lib/platform.ts` — isNative, isIOS, isWeb 유틸
- `ios/` Xcode 프로젝트 생성 + 시뮬레이터 정상 동작 확인

### 5. 네이티브 기능 구현 (4개 에이전트 병렬)
- **Haptic Feedback** — `lib/native/haptics.ts` + clip mutations, pull-to-refresh, bulk actions 연동
- **StatusBar 테마 동기화** — `hooks/native/use-native-status-bar.ts`
- **Keyboard 관리** — `hooks/native/use-native-keyboard.ts`
- **Deep Links / Universal Links** — `lib/native/deep-links.ts` + AASA 파일 + `use-deep-links.ts`
- **Native UX** — `styles/native.css` + `NativeProvider` (overscroll, tap highlight, 44px 터치 타겟)

### 6. 네이티브 고급 기능 구현 (3개 에이전트 병렬)
- **Face ID / Touch ID** — Swift `BiometricPlugin` + JS 브릿지 + `use-biometric` 훅
- **Push Notification** — `@capacitor/push-notifications` + API route + DB 마이그레이션 (`026_device_tokens.sql`)
- **Share Extension** — Swift 소스 코드 (`ios/ShareExtension/`)
- **iOS 위젯 3종** — Swift 소스 코드 (`ios/LinkbrainWidget/`) + `WidgetBridgePlugin`
- **Widget 데이터 동기화** — `widget-bridge.ts` JS 브릿지

### 7. 앱 라우팅 최적화
- Capacitor 진입점 `/dashboard`로 변경 → 로그인 상태면 즉시 홈, 미로그인이면 /login

### 8. XcodebuildMCP 설치
- `claude mcp add xcodebuild` — 재시작 후 활성화 필요

## 미완료

### Xcode 수동 작업 (다음 세션 최우선)
1. **App Groups 이름 수정** — 현재 `group.com.linkbrain.app` → `group.cloud.linkbrain.app`로 변경 필요 (Swift 코드와 일치)
2. **Share Extension 타겟 추가** — `ios/ShareExtension/` 소스 준비됨, Xcode에서 타겟 생성 필요
3. **Widget Extension 타겟 추가** — `ios/LinkbrainWidget/` 소스 준비됨
4. **Keychain Sharing 설정** — Share Extension 인증 토큰 공유용
- 가이드: `docs/ios-extensions-setup.md`
- XcodebuildMCP 활성화 후 자동화 가능

### DB 마이그레이션 적용
- `025_add_remind_at.sql` — 리마인더 컬럼
- `026_device_tokens.sql` — 푸시 알림 토큰 테이블
- 적용: `supabase db push`

### 앱 UI 개선 (사용자 요청 대기)
- 앱 아이콘 + 스플래시 네이티브 커스터마이징
- 온보딩 화면 (최초 설치 시)
- Sign in with Apple 추가

### Pre-Deploy Review 잔여 이슈
- HIGH 22건, MEDIUM 33건 미수정 (상세: `review-report.md` 액션 플랜 참조)
- 주요: 인메모리 rate limiter → Upstash Redis, supabaseAdmin as any 51건, AI 라우트 분리

## 에러/학습
- Capacitor 라이브 서버 모드: 40+ API 라우트가 있는 앱은 정적 export 불가 → `server.url`로 배포 서버 직접 로드가 현실적
- Capacitor 8 커스텀 플러그인: `CAPBridgedPlugin` 프로토콜 + `pluginMethods` 배열 필수
- Share Extension은 별도 프로세스 → WebView 접근 불가, App Groups + Keychain으로 데이터 공유
- XcodebuildMCP로 타겟 추가 자동화 가능 (재시작 필요)
- `xcrun simctl io booted screenshot` — iOS 시뮬레이터 스크린샷 캡처 가능

## 다음 세션 시작 시
1. Claude Code 재시작 (XcodebuildMCP 활성화)
2. `SESSION_HANDOVER.md` 읽기
3. App Groups 이름 확인/수정 (`group.cloud.linkbrain.app`)
4. XcodebuildMCP로 Share Extension + Widget 타겟 추가
5. `supabase db push`로 마이그레이션 적용
6. 시뮬레이터에서 전체 기능 검증
