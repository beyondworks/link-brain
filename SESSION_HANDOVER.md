# Session Handover
## 날짜: 2026-03-31

## 완료
- **하단 Nav → FAB 전환**: 하단 메뉴바 제거, 우하단 FAB 버튼(+)으로 교체 (bottom 12px + safe-area, 중앙 정렬)
- **MCP 서버 인증 버그 수정**: `validateApiKey`가 반환하는 public users.id를 미들웨어가 auth_id로 오인 → ghost user 생성 → 빈 데이터 반환. 미들웨어에서 users 테이블로 auth_id 역조회하도록 수정. ghost user 삭제 완료
- **MCP 정상 작동 확인**: 새 API 키 `lb_ef25...`로 검색 성공 (Claude 관련 47개 클립 확인)
- **컬렉션 카운트 미갱신 수정**: 컬렉션 CRUD 시 `nav-counts` TanStack Query 캐시 무효화 추가
- **AI 채팅 키보드 가림 수정**: Capacitor Keyboard 플러그인 이벤트로 패널 bottom 동적 조정 + 웹 visualViewport fallback
- **사이드바 AI 채팅 클릭 시 사이드바 자동 닫기**
- **관리자 대시보드 전면 개선**:
  - 스크롤 안 되는 문제: min-h-screen → h-screen
  - 사용자 100명만 표시: .limit(100) 제거 → 전체 표시
  - 클립 수 0 표시: `get_user_clip_counts` RPC 함수 DB에 생성
  - 필터/정렬 추가: 검색(이름/이메일), 플랜/역할 필터, 6종 정렬(가입일/이름/클립수/플랜/역할/최근사용)
  - 마지막 사용일 컬럼 추가 (auth.admin.listUsers → last_sign_in_at)
  - 텍스트 가로 정렬 강제 (whitespace-nowrap + truncate)
- **macOS 복사 잔여물 삭제**: `.maestro/`, `... 2/` 파일들 삭제

## 미완료
| 우선순위 | 항목 | 다음 단계 |
|----------|------|-----------|
| P1 | YouTube 썸네일 깨짐 | maxresdefault → hqdefault fallback + Image onError 핸들러 추가 |
| P1 | DB 마이그레이션 025~028 | 번호 충돌 정리 후 `supabase db push` |
| P1 | Supabase 타입 재생성 | `as any` 30개 제거 |
| P2 | Apple Developer 가입 | APNs + TestFlight |
| P2 | 관리자 클립/시스템 페이지 필터링 | 사용자 페이지와 동일 패턴 적용 |

## 에러/학습
- **API 키 인증 설계 결함**: `api_keys.user_id`는 FK → `users.id` (public). 미들웨어는 이를 auth_id로 간주해 `ensurePublicUser` 호출 → ghost user 생성. 수정: apiKey 분기에서 users 테이블로 auth_id 역조회, ensurePublicUser 호출 제거
- **Capacitor fixed 요소 + 키보드**: `KeyboardResize.Body`는 body만 줄이고 viewport는 유지. `position: fixed; bottom: 0`은 viewport 기준이라 body resize를 따르지 않음. 해결: Capacitor Keyboard 플러그인 이벤트에서 keyboardHeight를 감지해 bottom을 동적 설정
- **RPC 함수 누락**: `get_user_clip_counts`가 코드에서 호출되지만 DB에 미생성 → 에러가 조용히 0으로 처리됨. 항상 RPC 존재 여부를 먼저 확인할 것
- **Xcode CLI 빌드 한계**: Capacitor SPM 의존성은 CLI에서 modulemap 생성 불가 → GUI에서만 빌드 가능

## 다음 세션 시작 시
1. YouTube 썸네일 fallback 구현 (maxresdefault → hqdefault → placeholder)
2. `admin/clips`, `admin/system` 페이지 필터링 추가 (사용자 페이지 패턴 재사용)
3. DB 마이그레이션 번호 충돌 정리
