# Session Handover

## 날짜: 2026-03-18
## 프로젝트: Link-brain
## 브랜치: main

## 완료

### iOS PWA/모바일 status bar 경계 분리 문제 해결 (장기 이슈 종결)
- 8+ 세션, 12회 실패 후 "접근법 A: overlay 제거 + 콘텐츠 blur"로 최종 해결
- `sheet.tsx`: SheetOverlay `bg-black/50` 제거 → 투명 (클릭 핸들러만)
- `(app)/layout.tsx`: sidebar overlay `bg-surface-overlay` 제거, 메인 콘텐츠에 `blur-content-dim` 조건부 적용
- `globals.css`: `.blur-content-dim` + `body:has([data-slot="sheet-overlay"]) #app-content` blur 규칙
- `sw.js`: 캐시 v6 → v7
- 커밋: `6ef93d9`, main 푸시 + Vercel 배포 완료

### 이전 세션 커밋 (같은 이슈)
- `b6189b8` oklch→hex 색공간 통일
- `cce9af6` media-conditional theme-color + 로그인 bg 통일
- `49a6660` z-9999 status-bar-layer (실패, 이후 overlay 제거로 해결)

### 디버깅 메모리 문서화
- `debugging_statusbar_ios.md` — 12회 시행착오 + 성공 해결법 + banned methods
- `feedback_stop_repeating_direction.md` — 같은 방향 3회 실패 시 접근법 전환
- `feedback_overlay_removal_pattern.md` — 모바일 overlay → 콘텐츠 blur 패턴
- `MEMORY.md` 해결 상태 반영

### 변경된 파일
- `public/sw.js`
- `src/app/(app)/layout.tsx`
- `src/app/globals.css`
- `src/components/ui/sheet.tsx`

## 미완료
- 없음 (이번 세션 목표 완료)

## 핵심 학습
- **overlay를 수정하지 말고 제거하라**: `fixed inset-0 bg-black/50`는 OS status bar를 제어 불가. 색상 맞추기 불가능
- **env(safe-area-inset-top) 불안정**: Playwright + 일부 실기기에서 0 반환. 의존 금지
- **CSS `:has()` 활용**: Radix Portal data attribute 변경 감지 → JS 없이 Sheet 열림 감지
- **3회 실패 = 방향 전환**: 같은 방향 반복은 시간 낭비

## 다음 세션 시작 시
- 특별한 후속 작업 없음. 다른 기능 작업 진행 가능
