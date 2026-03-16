# Session Handover

## 날짜: 2026-03-16 (세션 9)

---

## 완료

### Firebase → Supabase 데이터 마이그레이션
- 5단계 파이프라인 구현 (`scripts/migration/` 01~05 + rollback)
- 299명 유저 전원 매핑 (기존 5명 + 신규 294명), 에러 0
- 1523 클립, 295 카테고리, 20 컬렉션, 3417 태그 이전 완료
- 검증 8/8 PASS (카운트, spot-check, orphan FK, 유저별 클립 수)
- Supabase `.in()` 한글 배치 50개 제한 발견 → 해결

### 도메인 전환
- `linkbrain.cloud` + `www.linkbrain.cloud`: v1(`linkbrain`) → v2(`link-brain`) Vercel 프로젝트 이동
- DNS 변경 불필요 (가비아 네임서버 → Vercel A 레코드 유지)

### 모바일 UX 개선
- 모바일 헤더를 스크롤 컨테이너 밖으로 이동 (sticky → flex child) — 스크롤 시 헤더 사라짐 해결
- 롱터치 컨텍스트 메뉴 → 바텀 액션 바 (createPortal로 body에 직접 렌더)
- iOS 터치 하이라이트/callout 차단 CSS (`.touch-none-native`)
- 롱터치 타이머 500ms → 400ms (iOS 네이티브보다 먼저 발동)
- pull-to-refresh: `overscroll-y-none` + `overflow-x-hidden` 추가
- 일괄선택 툴바: 모바일 패딩/텍스트 축소 (아이콘 shrink-0)
- `themeColor`를 배경색에 맞춤 (#fafafa / #2e2e2e)
- safe-area CSS 클래스 통일 (`.pt-safe-top`, `.h-safe-top`, `.pb-safe-bottom`)
- 스크롤 좌우 흔들림 해결 (`overflow-x-hidden`)
- tsconfig exclude에 `scripts/` 추가 (빌드 에러 수정)

---

## 미완료

### P0 — 모바일 UX 잔여
- [ ] 노치 색상 차이 (사이드바/클립 열 때) — localhost에서 `env(safe-area-inset-top)` 0 반환, 프로덕션(HTTPS)에서 확인 필요
- [ ] 롱터치 iOS 네이티브 하이라이트 — CSS/JS로 차단 시도했으나 iOS 26.1에서 완전 차단 안 됨, 추가 조사 필요
- [ ] pull-to-refresh 동작 미확인 — 프로덕션에서 테스트 필요

### P1
- [ ] DDD 경량 도입 (4개 도메인: clip, ai, credit, user)
- [ ] `as any` 30개 제거 (`supabase gen types typescript`)
- [ ] Stripe 결제 연동

---

## 에러/학습

1. **Supabase `.in()` URL 길이 제한**: 한글 500개 → 0 결과 반환 (에러 없음). 배치 50개로 줄여 해결
2. **tags UNIQUE(name) 충돌**: upsert `onConflict: 'id'`로 하면 name 충돌. 이름만 삽입 → DB 실제 ID 조회 → clip_tags 매핑
3. **fixed + transform containing block**: PullToRefreshWrapper 내 transform div 안의 `position: fixed`가 absolute처럼 동작 → `createPortal(document.body)` 해결
4. **Turbopack 캐시**: `.next` 삭제 + 서버 재시작해도 구 코드 서빙. `node_modules/.cache`도 삭제 필요
5. **tsconfig exclude 누락**: `scripts/migration/`이 Next.js 빌드에 포함 → `FirebaseFirestore` 타입 에러. `"scripts"` exclude 추가
6. **iOS Safari `env(safe-area-inset-top)`**: localhost(HTTP)에서 0 반환 가능 — 프로덕션(HTTPS)에서는 정상 동작 확인 필요
7. **iOS 롱터치 네이티브 메뉴**: `-webkit-touch-callout: none` + `user-select: none`이 iOS 26.1에서 완전 차단 안 됨

---

## 다음 세션 시작 시

1. Vercel 배포 상태 확인 (feat/ai-rag-chat-insights 브랜치, 커밋 `29328d6`)
2. 프로덕션에서 모바일 테스트: 노치 색상, 롱터치 바텀바, pull-to-refresh
3. 프로덕션에서 노치 OK면 → localhost는 HTTP 한계로 무시
4. 롱터치 하이라이트 잔여 이슈 → iOS 네이티브 동작 추가 조사
5. `MEMORY.md` + `SESSION_HANDOVER.md` 읽고 사용자 요청 대응
