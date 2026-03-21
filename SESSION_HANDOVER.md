# Session Handover

## 날짜: 2026-03-21 (오후)
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### PWA 하단 메뉴바 여백 수정
- iOS PWA standalone 모드에서 하단 메뉴바 아래 큰 여백 발생
- 원인: `paddingBottom: env(safe-area-inset-bottom)` 이 아이콘 아래에 34px+ 여백 생성
- 수정: `bottom: env(safe-area-inset-bottom)` 으로 메뉴바 자체를 safe area 위에 배치, 내부 패딩 제거
- `bg-glass-heavy`(반투명) → `bg-background`(불투명) 변경
- root `layout.tsx`에 하단 safe area 커버 div 추가 (상단 패턴과 동일)
- 파일: `mobile-bottom-nav.tsx`, `layout.tsx`

### 관리자 대시보드 모바일 헤더 safe area 대응
- iOS PWA에서 admin 헤더가 노치/다이내믹 아일랜드 뒤로 가려지는 문제
- `paddingTop: env(safe-area-inset-top, 0px)` 추가
- 파일: `admin/layout.tsx`

### 기타 미커밋 변경사항 (이전 세션 포함)
- `clip-card.tsx`, `clip-headline.tsx`, `clip-row.tsx`: 변경 (3줄씩)
- `clip-peek-panel.tsx`: 19줄 추가
- `app-shell.tsx`: 3줄 변경
- `use-share-extension-sync.ts`, `use-clips.ts`, `use-realtime-invalidation.ts`: 네이티브 연동 관련

## 미완료

### PWA 하단 메뉴바 — 실기기 검증 필요 (우선순위 높음)
- 변경 적용 후 iOS PWA에서 아직 미확인
- Playwright에서는 env(safe-area-inset-bottom)=0이라 데스크톱에서 차이 재현 불가
- **다음 세션에서 사용자 피드백 확인 후 추가 조정 가능성 있음**

### 관리자 대시보드 헤더 — 실기기 검증 필요
- safe-area-inset-top 패딩 추가했으나 실기기 미확인

### 이전 세션 미완료 (변동 없음)
- 스크린샷 + AI Vision URL 추출 API (`screenshot-save`)
- Apple Developer 가입 후 APNs, 실기기 빌드/테스트
- Xcode 빌드 필요 항목 (SaveClipIntent, ShareExtension 등)
- DB 마이그레이션 025~028 미적용
- Supabase 타입 재생성

## 에러/학습

### Playwright + localhost 연결 이슈
- `.next` 캐시 손상 시 500 에러 + Playwright 타임아웃
- 두 개의 next dev 프로세스 동시 실행 시 포트 충돌 + 서버 행
- 해결: 프로세스 전부 kill → `.next` 삭제 → 단일 재시작

### PWA safe-area-inset-bottom 처리 패턴
- `paddingBottom: env(safe-area-inset-bottom)` → 아이콘 아래 눈에 띄는 여백 생성
- 더 나은 패턴: `bottom: env(safe-area-inset-bottom)` 으로 컴포넌트 위치를 올리고, 별도 커버 div로 safe area 채우기
- 네이티브(Capacitor)에서는 WKWebView가 safe area를 직접 처리하므로 같은 문제 없음

## 다음 세션 시작 시
1. 사용자에게 iOS PWA에서 하단 메뉴바 / 관리자 헤더 확인 결과 물어보기
2. 문제 있으면 스크린샷 받아서 추가 조정
3. 미커밋 변경사항 12개 파일 — 논리적 단위로 커밋 분리 필요
