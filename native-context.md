# Native Context — Linkbrain v2

## 기존 준비 상태
- next.config.ts: CAPACITOR_BUILD 환경변수 분기 이미 구현 (output: 'export', images.unoptimized, trailingSlash)
- package.json scripts: build:native, cap:sync, cap:ios, cap:android 이미 정의
- layout.tsx: iOS safe-area 커버 div 이미 존재 (z-[9999])
- viewport: viewportFit: "cover", maximumScale: 1, userScalable: false
- PWA: manifest.json, sw-register, appleWebApp 설정 존재

## 미구현
- @capacitor 패키지 미설치
- capacitor.config.ts 없음
- ios/ 디렉토리 없음
- src/lib/platform.ts 없음
- src/**/native/ 폴더 없음

## SSR 호환성: LOW
- 'use server' 디렉티브: 0건
- Route Handlers: 40+ (배포 서버 API로 접근, 정적 export에 영향 없음)
- 미들웨어: auth redirect용 (정적 export에서 무시됨, 네이티브에서는 서버 API 접근)
- 인증: Supabase Auth (클라이언트 사이드)
- 데이터: TanStack Query + Supabase 클라이언트 (클라이언트 사이드)
- 동적 라우트: clip/[clipId], collections/[collectionId], images/[albumId], s/[token], c/[token], p/[clipId]

## 필요 플러그인
- @capacitor/status-bar (상태바 스타일링)
- @capacitor/splash-screen (스플래시)
- @capacitor/haptics (터치 피드백)
- @capacitor/keyboard (키보드 관리)
- @capacitor/share (공유 기능 — 클립 공유에 사용)
- @capacitor/clipboard (클립보드 — URL 붙여넣기)
- @capacitor/browser (외부 링크 열기)
