# Session Handover

## 날짜: 2026-03-20 (오후 세션)
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### iOS 모바일 뷰포트 스크롤 오버플로우 수정
- app-shell 루트 컨테이너: `h-screen` → `fixed inset-0` (vh/dvh 호환 문제 해결)
- body: `overscroll-behavior-y: none` (iOS 바운스 스크롤 차단)
- PullToRefreshWrapper: `min-h-0` 추가 (flex 스크롤 규칙 준수)
- PWA: `html, body { height: 100%; overflow: hidden }` 추가
- 네이티브: `contentInset: 'automatic'` → `'never'` (WKWebView 이중 safe area 해결)

### Vercel 배포 실패 해결 (Cron Jobs)
- 원인: Hobby 플랜 cron 2개/일 1회 제한 vs 5개/10분
- `vercel.json` crons 완전 제거
- GitHub Actions 2개 워크플로우로 대체:
  - `cron-notifications.yml`: 매 10분 (reminders + unread)
  - `cron-daily-tasks.yml`: 매일 03:00 (aggregate + retry + grant-credits)
- GitHub secrets 등록: `CRON_SECRET`, `APP_URL`
- Vercel env에 `CRON_SECRET` 동기화 완료
- 5개 개별 cron 라우트 → 2개 통합 라우트 (`/api/cron/notifications`, `/api/cron/daily-tasks`)

### ShareExtension 즉시 저장 (Xcode 빌드 필요)
- `SLComposeServiceViewController` → `UIViewController` 교체
- 메모/올리기 화면 제거 → "앱으로 링크를 보냈습니다" 1초 표시 → 자동 닫힘
- Fire-and-forget API 호출 (응답 안 기다림)
- App Group에 `last_shared_url`, `last_shared_at` 플래그 기록
- 앱 복귀 시 `checkSharedClipFlag()` → 토스트 "링크를 받았습니다" 표시

### 모바일 UI 수정
- 모바일 헤더에 `NotificationCenter` 알림 아이콘 추가
- 알림 팝오버: 모바일 너비 `w-[calc(100vw-2rem)]`, `align="start"`, `collisionPadding`
- 클립 시트 패널: toolbar에 `safe-area-inset-top` 패딩 (노치 뒤 버튼 숨김 해결)
- 모드 전환기 모바일 숨김 (`hidden sm:flex`), 액션 버튼 `ml-auto`로 오른쪽 정렬

## 미완료

### Apple Developer 가입 후 진행
1. **APNs `.p8` 키 발급** → 환경변수 등록 (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8, APNS_BUNDLE_ID)
2. **실기기 빌드/테스트**: 위젯, SaveClipIntent + 뒷면탭, 푸시 수신
3. **App Store 배포 준비**: 프로비저닝 프로파일, 앱 심사

### Xcode 빌드 필요 항목 (웹 배포와 무관)
- ShareExtension 즉시 저장 (Swift 코드 수정 완료)
- `contentInset: 'never'` 적용 (capacitor.config 수정 완료)
- ios/App/App/capacitor.config.json도 로컬에서 수정 완료 (git 미추적)

### DB 마이그레이션 적용
- 025 (remind_at), 026 (device_tokens), 027 (nav_counts today), 028 (notification tables) 미적용
- `npx supabase login` → `npx supabase db push` 필요

### QuickSaveWidget 클립보드 자동 저장
- 현재: 위젯 탭 → 앱 열림 → 클립 추가 모달만 표시
- 구현 필요: 딥링크 핸들러에서 클립보드 URL 읽어 자동 저장

### Supabase 타입 재생성
- `npx supabase gen types typescript --project-id ucflmznygocgdwreoygc --schema public > src/types/supabase.ts`

### 알림 팝오버 위치 미확인
- `align="start"`로 변경했으나 사용자 확인 미완료
- 이상하면 스크린샷 기반으로 재조정 필요

## 에러/학습

### iOS 뷰포트 높이 호환 문제
- `100vh`: Safari에서 주소창 포함 → 실제 뷰포트보다 큼
- `100dvh`: Capacitor WKWebView에서 safe area 제외 → 하단 여백 발생
- `h-screen` + `style={{ height: '100dvh' }}` fallback도 WKWebView에서 dvh 지원하므로 실패
- **최종 해결**: `fixed inset-0` — vh/dvh 무관하게 실제 뷰포트를 정확히 채움

### Capacitor contentInset
- `automatic`: WKWebView 자체 safe area 인셋 + CSS safe area 패딩 = 이중 여백
- `never`: WKWebView 전체 화면 + CSS만으로 safe area 처리 = 정상

### Vercel Hobby 플랜 Cron 제한
- 최대 2개, 최소 주기 1일 1회
- 에러 링크(`vercel.link/3Fpeeb1`)가 cron pricing 페이지로 리다이렉트
- `vercel.json` crons 존재만으로 배포 차단 (빌드 성공 무관)
- GitHub Actions로 대체하면 제한 없음

### 시트 패널 + safe area
- Sheet/Dialog는 `fixed inset-y-0`으로 열림 → 네이티브 앱에서 toolbar이 노치 뒤에 숨겨짐
- `paddingTop: max(0.75rem, env(safe-area-inset-top))` 추가로 해결

## 다음 세션 시작 시
1. 알림 팝오버 위치 사용자 확인 (align 조정 필요할 수 있음)
2. Xcode 빌드 후 ShareExtension + contentInset 네이티브 테스트
3. Supabase 마이그레이션 적용 (025~028)
4. Apple Developer 가입 여부 → APNs 키 발급
