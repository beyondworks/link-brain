# Session Handover

## 날짜: 2026-03-20
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### PR #62 — ShareExtension 토큰 동기화 수정
- `onAuthStateChange` 구독 추가 (TOKEN_REFRESHED, SIGNED_IN 시 즉시 App Group 동기화)
- `visibilitychange` 리스너 참조 버그 수정 (메모리 누수 방지)
- 앱 복귀 시 clips/nav-counts 쿼리 무효화 (공유된 클립 즉시 표시)
- 빈 catch 블록에 console.warn 로깅 추가

### PR #63 — iOS 위젯 3종 + SaveClipIntent
- **StatsWidget** (small): 전체 클립, 오늘 저장, 즐겨찾기 수
- **RecentClipsWidget** (medium): 최근 클립 4개 (제목 + 플랫폼 아이콘)
- **QuickSaveWidget** (small): 탭으로 클립보드 링크 저장
- **SaveClipIntent**: 단축어/Siri/뒷면탭에서 클립보드 URL 저장
- **useWidgetSync**: navCounts/clips 변경 시 App Group에 자동 동기화

### PR #64 — 위젯 딥링크 핸들러
- `linkbrain://save-clipboard` → 클립 추가 모달 열기
- `linkbrain://clip/{id}` → 클립 peek 열기

### PR #65 — 푸시 알림 시스템 + todayClips RPC + Cron Jobs
- **todayClips**: get_nav_counts RPC에 today 카운트 추가 (027 마이그레이션)
- **DB 테이블**: notification_preferences (사용자별 ON/OFF + quiet hours), notification_log (028 마이그레이션)
- **push-service.ts**: APNs HTTP/2 발송 (키 미설정 시 graceful skip)
- **notification-triggers.ts**: 8가지 알림 트리거 함수
- **API**: /api/v1/notifications (GET/PATCH), /api/v1/notification-preferences (GET/PUT)
- **Cron Jobs**: notify-unread(매 시간), notify-reminders(매 10분), grant-credits(매월 1일)
- **기존 코드 트리거**: process-clip→분석완료, insights→인사이트완료, plan-service→크레딧부족

### 로컬 전용 (ios/ — git 미추적)
- pbxproj: DEVELOPMENT_TEAM, IPHONEOS_DEPLOYMENT_TARGET(Widget 17.0, ShareExt 15.0), ProvisioningStyle, CODE_SIGN_ENTITLEMENTS
- LinkbrainWidgetExtension.entitlements 생성 (App Group)
- ShareViewController: pending_clips JSON 직렬화 + 409 성공 처리
- BiometricPlugin: switch exhaustive (.none 케이스 추가)
- ControlWidget/LiveActivity 템플릿 제거, @main 중복 해결
- 구버전 ios/ShareExtension/ 삭제
- SaveClipIntent.swift, 위젯 3종 Swift 코드

## 미완료

### Apple Developer 가입 후 진행
1. **APNs `.p8` 키 발급** → 환경변수 등록 (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8, APNS_BUNDLE_ID)
2. **실기기 빌드/테스트**: 위젯, SaveClipIntent + 뒷면탭, 푸시 수신
3. **App Store 배포 준비**: 프로비저닝 프로파일, 앱 심사

### DB 마이그레이션 적용
- 025 (remind_at), 026 (device_tokens), 027 (nav_counts today), 028 (notification tables) 미적용
- `npx supabase login` → `npx supabase db push` 필요 (토큰 만료 상태)

### QuickSaveWidget 클립보드 자동 저장
- 현재: 위젯 탭 → 앱 열림 → 클립 추가 모달만 표시
- 구현 필요: 딥링크 핸들러에서 클립보드 URL 읽어 자동 저장

### Supabase 타입 재생성
- `npx supabase gen types typescript --project-id ucflmznygocgdwreoygc --schema public > src/types/supabase.ts`

## 에러/학습

### Xcode Extension 빌드 실패 원인
- Extension 타겟에 DEVELOPMENT_TEAM 누락 → 클린 빌드 시 서명 실패 → appex 탈락
- Xcode 26.3 기본 배포 타겟 26.2 → 대부분 기기에서 Extension 로드 불가
- ControlWidget은 iOS 18+ 전용 → 배포 타겟 15.0으로 낮추면 빌드 에러 → 제거하고 17.0으로

### ShareExtension 401 원인 (복합)
- access_token JWT 1시간 TTL + onAuthStateChange 미연결 → 만료 토큰 사용
- 구버전 ShareViewController(Keychain 기반)가 잔존 → JS는 UserDefaults에만 쓰므로 항상 nil
- pending_clips NSArray↔String 포맷 불일치 → JS에서 읽기 불가

### pbxproj 직접 편집
- Xcode GUI 권장이지만, DEVELOPMENT_TEAM/IPHONEOS_DEPLOYMENT_TARGET 등 단순 값 추가는 CLI에서도 안전
- @main 중복은 Xcode가 fallback 코드 자동 생성할 때 발생 — 수동 정리 필수

## 다음 세션 시작 시
1. Apple Developer 가입 여부 확인 → APNs 키 발급 및 환경변수 등록
2. Supabase 마이그레이션 적용 (025~028)
3. Vercel 배포 확인 (PR #62~#65 반영 여부)
4. 실기기 빌드 테스트 (위젯/SaveClipIntent/푸시)
