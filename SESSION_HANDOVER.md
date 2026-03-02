# Session Handover

## 날짜: 2026-03-02

## 완료

### E2E UX 테스트 (Playwright MCP)
- 랜딩(/), 로그인, 회원가입, 대시보드, 클립추가 모달, Peek 패널(side/center), 탐색, 즐겨찾기, 컬렉션, 설정, 아카이브, 나중에 읽기, 스튜디오, 모바일(390x844) 전체 테스트 완료

### UX 문제 수정 (4건)
1. **Supabase `users` 테이블 404 에러** — `use-current-user.ts`에서 PGRST204/404 graceful 처리 + `retry: false`
2. **Dialog 접근성 경고** — `clip-peek-panel.tsx` center 모드에 `DialogTitle` 추가, `add-clip-dialog.tsx`에 `aria-describedby={undefined}`
3. **Explore 로그인 버튼** — `explore/layout.tsx`를 client component로 전환, `useSupabase()` 인증 체크 → 로그인 시 "대시보드" 버튼 표시
4. **모바일 FAB + 하단 네비 겹침** — FAB를 `hidden lg:flex`로 모바일 숨김 (하단 네비에 이미 추가 버튼 존재)

### 이전 세션에서 이어받은 완료 작업
- Dialog 중앙 정렬 (flex wrapper 패턴으로 Tailwind v4 animate-in 충돌 해결)
- Clip Peek 패널 (side/center/full 3모드)
- 사이드바 카테고리 섹션 + 컬렉션 네비게이션
- 고급 필터 패널

### 민트색 글로우/블러 감소
- `--shadow-brand` 반경 50%, 투명도 40% 감소
- `--shadow-brand-glow`, `glow-brand-sm`, `bg-glass-heavy` blur, `pulse-brand` 모두 축소

## 미완료

### Supabase `users` 테이블 생성 (DB 작업 필요)
- 현재 `users` 테이블이 Supabase에 존재하지 않아 REST API 404 발생
- 훅에서 에러를 graceful 처리하지만 네트워크 레벨 404는 브라우저 콘솔에 여전히 표시
- **다음 단계**: Supabase 대시보드에서 `001_initial_schema.sql` 기반으로 `users` 테이블 생성

### 카테고리/컬렉션 사이드바 플랜 실행
- 플랜 파일: `.claude/plans/kind-sniffing-hellman.md`
- Step 2-7 미구현 (카테고리 CRUD 뮤테이션, 대시보드 필터 연동, 클립 카테고리 할당, 고급 필터 패널)
- **다음 단계**: 플랜 Step 2부터 순서대로 실행

### favicon.ico 404
- `/public/favicon.ico` 파일 없음
- **다음 단계**: 브랜드 로고 기반 favicon 추가

## 에러/학습

### Tailwind v4 + Radix Dialog 중앙 정렬
- `animate-in`의 `transform: translate3d(0,0,0)`이 `translate-x-[-50%] translate-y-[-50%]` 방식 덮어씀
- **해결 패턴**: flex wrapper (`fixed inset-0 flex items-center justify-center`) + content `relative`
- `dialog.tsx`에 이미 적용됨 — 향후 새 Dialog에서도 이 패턴 유지

### Explore layout `'use client'` 전환
- `useSupabase()` 훅 사용을 위해 Server Component → Client Component 전환
- 정상 동작 확인 (SSR은 유지, hydration 이후 인증 체크)

## 다음 세션 시작 시
1. `npm run dev`로 개발 서버 시작 확인
2. Supabase `users` 테이블 생성 여부 확인 → 생성 안 됐으면 SQL 실행
3. 카테고리 플랜 Step 2 (뮤테이션 훅) 부터 구현 시작
4. favicon.ico 추가
