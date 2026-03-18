# Session Handover

## 날짜: 2026-03-18 (세션 10)

---

## 완료

### Status bar 동기화 인프라 구축
- `useStatusBarSync` 훅 생성 (`src/lib/hooks/use-status-bar-sync.ts`)
- CSS 변수 `--app-bg`, `--sidebar-bg`, `--drawer-bg` 추가 (globals.css)
- `ThemeColorScript` / `ThemeColorSync` 정확한 hex 값으로 업데이트 (#f9fafb / #2e2e2e)
- fill div를 root layout body 직접 자식으로 이동 (인라인 스타일, z-index: 99999)
- `viewport.themeColor: '#f9fafb'` 복원 → HTML에 theme-color meta 포함
- `statusBarStyle` 제거 (초기 상태 복원)
- manifest.json theme_color → #f9fafb
- SW 캐시 v1→v3 강제 갱신
- overlay clip-path 방식 적용 (`clip-path: inset(env(safe-area-inset-top) 0 0 0)`)

---

## 미완료

### P0 — Status bar 색상 경계 (미해결)
- **증상**: 사이드바/피크패널(Sheet) 열릴 때 status bar 영역이 검게 변함
- **원인 확정**: Sheet overlay(`bg-black/50`)가 status bar 영역까지 덮고 있음
- **시도한 것들 (모두 실패)**:
  1. fill div z-200 (앱 레이아웃 내부) → Radix Portal과 다른 stacking context
  2. body::before CSS → Tailwind v4가 빌드 시 purge
  3. fill div z-9999 Tailwind class → 컴파일됨(확인)
  4. fill div z-99999 인라인 스타일 body 직접 자식 → iOS에서 동작 미확인
  5. viewport.themeColor 복원 → HTML에 포함됨(확인), iOS 반영 미확인
  6. overlay `top: env()` → iOS에서 무시될 가능성
  7. overlay `clip-path: inset(env() 0 0 0)` → iOS 반영 미확인
- **다음 단계**:
  - **TestSprite MCP로 iOS 실기기 스크린샷 + DOM 디버깅 필수**
  - TestSprite MCP: npm 캐시 에러 해결됨 (`chmod +x`), Claude Code 재시작 필요
  - `~/.claude.json`의 `TestSprite` MCP 서버 설정 확인됨
  - iOS에서 확인해야 할 것:
    1. fill div가 실제로 렌더되는지 (height > 0px 인지)
    2. fill div의 z-index가 Sheet overlay 위에 있는지
    3. clip-path가 overlay에 적용되는지
    4. `env(safe-area-inset-top)`이 반환하는 실제 값

### P1
- [ ] DDD 경량 도입
- [ ] `as any` 30개 제거
- [ ] Stripe 결제 연동

---

## 에러/학습

1. **Tailwind v4 purge**: `@layer base` 안의 커스텀 CSS 규칙, `body::before` pseudo-element 모두 빌드 시 제거됨. 인라인 스타일이나 별도 CSS 파일 필요
2. **SW cache-first**: `.css`/`.js`를 캐시에서 우선 반환 → 배포해도 PWA에 반영 안 됨. 캐시 버전 bump 필수
3. **viewport.themeColor 제거 금지**: Next.js viewport export에서 themeColor를 빼면 서버 HTML에 `<meta name="theme-color">`가 사라짐. iOS PWA는 JS로 동적 추가한 meta를 무시할 수 있음
4. **statusBarStyle 'default'**: iOS가 시스템 테마에 따라 status bar 색상 결정. 앱 테마와 무관
5. **oklch→hex 실제 값**: Light bg-background = `#f9fafb`, Dark = `#2e2e2e` (이전 하드코딩 #ffffff/#363636과 불일치)
6. **iOS 실기기 테스트 없이 PWA 디버깅 불가**: 추측→배포→실패 반복. TestSprite MCP 활용 필수

---

## 다음 세션 시작 시

1. Claude Code 재시작 (TestSprite MCP 연결을 위해)
2. `MEMORY.md` + `SESSION_HANDOVER.md` 읽기
3. TestSprite MCP로 iOS 시뮬레이터에서 linkbrain.cloud 열기
4. 사이드바/피크패널 열어서 status bar 영역 스크린샷 캡처
5. DOM inspector로 fill div, overlay의 실제 렌더 상태 확인
6. 확인된 사실 기반으로 수정 → 즉시 iOS에서 검증
