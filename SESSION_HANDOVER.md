# Session Handover

## 날짜: 2026-03-21
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### SaveClipIntent 클립보드 읽기 개선 (Xcode 빌드 필요)
- `resolveURL()` 3단계 fallback: `UIPasteboard.general.url` → `.string` trim → `NSDataDetector` 텍스트 속 URL 추출
- `@Parameter inputURL` 추가 — Shortcuts에서 Safari URL 직접 전달 가능
- 기존: `.string`만 읽어서 URL 타입 클립보드, 공백 포함 텍스트 등에서 실패
- 파일: `ios/App/App/SaveClipIntent.swift`

### 딥링크 `/save-clipboard` 자동 저장
- 기존: 모달만 열림 → 개선: 클립보드에서 URL 읽어 바로 저장, URL 없으면 모달 fallback
- `quick-save.ts` 유틸 신규 생성 — 클립보드 읽기 → URL 추출 → API 호출 → 토스트/알림
- 위젯 탭, 딥링크 모두 자동 저장 적용
- 파일: `src/lib/utils/quick-save.ts` (신규), `src/hooks/native/use-deep-links.ts` (수정)

### 뒷면 탭 iOS 제약 사항 분석
- iOS 샌드박스: 다른 앱의 현재 URL 접근 불가 (Safari/Chrome/Threads 무관)
- 뒷면 탭 = Shortcuts 트리거만 가능, 우회 불가
- **우회 방안 4가지 도출** (아래 미완료 참조)

## 미완료

### 스크린샷 + AI Vision URL 추출 (우선순위 높음, 사용자 관심)
- 뒷면 탭 → Shortcut이 스크린샷 → API로 전송 → AI Vision이 주소창 URL 추출 → 저장
- 모든 앱에서 복사 없이 작동 가능
- 구현 필요: `POST /api/v1/screenshot-save` 엔드포인트 + Shortcut 레시피
- AI 크레딧 소모 (~0.01$/회), 2-3초 딜레이
- 사용자에게 4가지 우회 방안 제시 완료, 선택 대기 중

### 우회 방안 나머지 3개 (필요 시)
1. Safari Web Extension — Safari 전용, Extension이 URL을 App Group에 기록
2. 로컬 VPN/DNS 모니터링 — 모든 앱, 복잡/배터리/심사 까다로움
3. Shortcuts JS 실행 — Safari 전용, `document.location.href` 추출

### Apple Developer 가입 후 진행
1. APNs `.p8` 키 발급 → 환경변수 등록
2. 실기기 빌드/테스트: 위젯, SaveClipIntent + 뒷면탭, 푸시 수신
3. App Store 배포 준비

### Xcode 빌드 필요 항목 (웹 배포와 무관)
- SaveClipIntent 클립보드 개선 (이번 세션 수정)
- ShareExtension 즉시 저장 (이전 세션 수정)
- `contentInset: 'never'` 적용 (이전 세션 수정)

### DB 마이그레이션 적용
- 025~028 미적용. `npx supabase db push` 필요

### Supabase 타입 재생성
- `npx supabase gen types typescript --project-id ucflmznygocgdwreoygc --schema public > src/types/supabase.ts`

## 에러/학습

### iOS 클립보드 타입 다양성
- 앱에서 "링크 복사" → `UIPasteboard.general.url` (URL 타입)으로 저장되는 경우 多
- `.string`만 읽으면 nil 반환 → `.url` 우선 시도 필수
- 텍스트+URL 혼합 복사 → `NSDataDetector`로 추출 가능

### iOS 뒷면 탭 제약
- 뒷면 탭 = Shortcuts 트리거만 가능, 다른 메커니즘 없음
- AppIntent에서 다른 앱의 현재 URL 접근 불가 (샌드박스)
- 스크린샷 + AI Vision이 가장 범용적인 우회 방법

## 다음 세션 시작 시
1. 사용자가 스크린샷+AI 방식 선택했는지 확인 → 선택 시 `screenshot-save` API 구현
2. Xcode 빌드 후 SaveClipIntent 개선사항 실기기 테스트
3. Supabase 마이그레이션 적용 (025~028)
