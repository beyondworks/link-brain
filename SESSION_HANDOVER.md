# Session Handover

## 날짜: 2026-03-17 (세션 9 연장)

---

## 완료

### Firebase → Supabase 데이터 마이그레이션
- 5단계 파이프라인 (`scripts/migration/` 01~05 + rollback)
- 299명 유저, 1523 클립, 295 카테고리, 20 컬렉션, 3417 태그 전량 이전
- 검증 8/8 PASS

### 도메인 전환
- `linkbrain.cloud` → v2(`link-brain`) Vercel 프로젝트 이동 완료

### 모바일 UX 개선 (PR #35~#48)
- 모바일 헤더: 스크롤 컨테이너 밖으로 이동 (sticky → flex child)
- 롱터치 메뉴: 바텀 액션 바 (createPortal로 body에 렌더)
- 스크롤 좌우 흔들림: overflow-x-hidden
- pull-to-refresh: overscroll-y-none + preventDefault 추가
- 일괄선택 툴바: 모바일 레이아웃 최적화
- iOS 터치: touch-none-native CSS 클래스, 400ms 타이머

### 노치/status bar 색상 (PR #37~#48)
- ThemeColorScript: React 렌더 전 inline script로 theme-color 즉시 설정
- ThemeColorSync: 런타임 테마 변경 시 동적 업데이트
- 실제 페이지 색상: 라이트 #ffffff, 다크 #363636
- manifest.json 생성 + appleWebApp 메타 태그 추가
- 오버레이 분류: Sheet/사이드바/채팅 → 노치 제외, Dialog/모달 → 노치 포함

---

## 미완료

### P0
- [ ] 노치 색상 최종 검증 — PR #48 배포 후 실기기 + PWA에서 확인 필요 (PWA는 삭제 후 재추가)
- [ ] 롱터치 iOS 네이티브 하이라이트 — CSS/JS로 완전 차단 안 됨, 추가 조사 필요

### P1
- [ ] DDD 경량 도입
- [ ] `as any` 30개 제거
- [ ] Stripe 결제 연동

---

## 에러/학습

1. **겉핥기 금지**: 동일 패턴 grep으로 전체 검색 후 한번에 수정. 한 곳씩 고치면서 10번 배포 반복 금지
2. **var(--sat) 레이스 컨디션**: JS에서 CSS 변수를 0으로 설정하면 env() fallback이 영원히 무시됨 → env() 직접 사용
3. **iOS PWA vs Safari**: Safari는 theme-color, PWA는 apple-mobile-web-app-status-bar-style 필수
4. **black-translucent**: 이름대로 검정 반투명 오버레이 → default가 깨끗한 status bar
5. **실제 색상 확인 필수**: oklch → hex 변환 추정하지 말고 실제 rendered 색상 확인 (라이트 #ffffff, 다크 #363636)
6. **Supabase .in() 한글 배치**: 500개 → 0 결과. 배치 50개로 제한
7. **tsconfig exclude**: scripts/ 폴더 미제외 시 Firebase 타입이 Next.js 빌드에 포함

---

## 다음 세션 시작 시

1. PR #48 배포 확인 (Vercel production READY 상태)
2. 실기기에서 PWA 삭제 → 재추가 → 노치 색상 확인
3. 시뮬레이터에서 라이트/다크 모드 전환 테스트
4. 노치 OK면 → 롱터치 하이라이트 잔여 이슈 조사
5. `MEMORY.md` + `SESSION_HANDOVER.md` 읽고 작업 재개
