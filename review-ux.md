# Linkbrain v2 — UX 감사 보고서

> 작성일: 2026-03-19
> 감사 범위: `src/app/(app)/`, `src/app/(auth)/`, `src/app/(marketing)/`, `src/components/`
> 기준 문서: `CLAUDE.md`, `review-context.md`

---

## 목차

1. [총평](#총평)
2. [심각도 분류 기준](#심각도-분류-기준)
3. [발견된 이슈 목록](#발견된-이슈-목록)
   - [CRITICAL](#critical)
   - [HIGH](#high)
   - [MEDIUM](#medium)
   - [LOW](#low)
4. [잘 구현된 부분](#잘-구현된-부분)
5. [액션 아이템 요약](#액션-아이템-요약)

---

## 총평

전반적으로 UX 완성도가 높은 편입니다. 4상태 비동기 UX(loading/success/empty/error)가 주요 페이지에 충실히 구현되어 있고, optimistic update, 토스트 피드백, 접근성 기본기(aria-label, aria-current, skip navigation 링크)가 잘 갖추어져 있습니다.

그러나 **인증 흐름에 비밀번호 관련 기능 공백**, **일부 파괴적 액션의 확인 절차 부재**, **모바일 바텀 내비게이션과 사이드 내비게이션 간의 구조적 불일치**, **다크 모드 하드코딩 색상** 등 배포 전 수정이 필요한 이슈들이 발견되었습니다.

---

## 심각도 분류 기준

| 등급 | 설명 |
|------|------|
| CRITICAL | 기능 작동 불가 또는 사용자 데이터 손실 위험 |
| HIGH | 사용자 흐름을 크게 방해하거나 사용자 이탈을 유발 |
| MEDIUM | 사용성 저하, 혼란 유발, 명세 불일치 |
| LOW | 시각적 세련도 또는 일관성 관련 |

---

## 발견된 이슈 목록

### CRITICAL

---

#### C-01. 계정 삭제가 실제 작동하지 않음 — 고객센터 안내만 제공

**위치:** `src/app/(app)/settings/settings-client.tsx` L1040–1047

**현상:**
```tsx
onClick={() => toast.error('계정 삭제는 고객센터에 문의해 주세요.')}
```
"위험 구역" 섹션에서 계정 삭제 버튼이 에러 토스트만 표시하고 실제 기능이 없습니다. 이 상태로 배포되면 GDPR / 개인정보보호법상 **사용자 데이터 삭제권** 미이행에 해당할 수 있습니다.

**권장 조치:**
- API 라우트 `/api/v1/account` DELETE 구현 후 AlertDialog 확인 단계 추가
- 또는 배포 전까지 섹션을 숨기고 고객센터 이메일 링크로 대체

---

#### C-02. 비밀번호 재설정 흐름 없음

**위치:** `src/app/(auth)/login/page.tsx`

**현상:**
로그인 폼에 "비밀번호 찾기" 링크가 없습니다. 전체 프로젝트 검색 결과 `forgotPassword`, `resetPassword`, `비밀번호 재설정` 관련 코드가 존재하지 않습니다. 비밀번호를 잊은 사용자는 이메일 로그인으로 접근할 수 없게 됩니다.

**권장 조치:**
`/forgot-password` 페이지 생성 후 `supabase.auth.resetPasswordForEmail()` 연동. 로그인 폼 비밀번호 필드 우측 상단에 링크 추가.

---

### HIGH

---

#### H-01. 로그인 폼과 회원가입 폼의 구글 버튼 스타일 불일치

**위치:**
- `src/app/(auth)/login/page.tsx` L94–95
- `src/app/(auth)/signup/page.tsx` L128

**현상:**
로그인 페이지의 Google 버튼은 인라인 `style` 속성으로 `background: "#ffffff", color: "#1a2e2a"`를 하드코딩합니다. 다크 모드에서 흰 배경에 어두운 텍스트가 그대로 노출되어 가독성이 깨집니다. 반면 회원가입 페이지는 Tailwind 시맨틱 클래스를 올바르게 사용합니다.

```tsx
// login/page.tsx — 문제 있음
style={{ borderColor: "rgba(0,0,0,0.12)", background: "#ffffff", color: "#1a2e2a" }}

// signup/page.tsx — 올바름
className="... bg-background text-foreground ..."
```

**권장 조치:**
로그인 버튼의 `style` 속성 제거 후 회원가입 페이지와 동일한 Tailwind 클래스 패턴으로 통일.

---

#### H-02. 모바일 바텀 내비게이션과 사이드바 내비게이션 구조 불일치

**위치:** `src/components/layout/mobile-bottom-nav.tsx`

**현상:**
모바일 바텀 내비게이션은 홈 / 즐겨찾기 / 탐색 / 설정 4개 항목만 제공합니다. 사이드바에는 아카이브, 나중에읽기, 컬렉션, 인사이트, 그래프, 하이라이트, 이미지 등 다수 항목이 존재하지만 모바일에서는 접근 방법이 사이드바(햄버거 메뉴) 열기뿐입니다.

모바일 사용자 입장에서 주요 섹션(`/archive`, `/read-later`, `/collections`)에 접근하려면 항상 햄버거 메뉴를 열어야 하며, 이는 탭 내비게이션의 기본 목적에 어긋납니다.

**권장 조치:**
바텀 내비게이션에 "더 보기" 탭 추가 후 Sheet 또는 Drawer로 나머지 항목 노출. 또는 현재 탐색(`/explore`) 탭을 `/read-later` 또는 `/collections`로 교체 (사용 빈도 기준 결정 필요).

---

#### H-03. 비밀번호 입력 필드에 표시/숨기기 토글 없음

**위치:**
- `src/app/(auth)/login/page.tsx` L173–194
- `src/app/(auth)/signup/page.tsx` L231–251

**현상:**
두 폼 모두 `type="password"` 입력만 존재하며 내용을 보여주는 Eye 아이콘 토글이 없습니다. 특히 회원가입 폼에는 8자 이상의 복잡한 비밀번호 강도 표시까지 구현했음에도 입력 확인이 불가능합니다. 비밀번호 확인 필드(재입력)도 없습니다.

**권장 조치:**
- 비밀번호 필드 우측에 `Eye`/`EyeOff` Lucide 아이콘 토글 추가
- 회원가입 폼에 비밀번호 확인 필드 추가 + zod `.refine()` 일치 검증

---

#### H-04. 대시보드 로딩 상태가 스켈레톤 없이 텍스트만 표시

**위치:** `src/app/(app)/dashboard/dashboard-client.tsx` L528–531

**현상:**
```tsx
{isLoading ? (
  <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
    불러오는 중...
  </div>
) : ...}
```
클립 목록 로딩 중 단순 텍스트 스피너만 표시됩니다. CLAUDE.md 명세(loading: 스켈레톤)와 불일치하며, 다른 페이지(`FavoritesClient` 등)는 `ClipListSkeleton`을 올바르게 사용합니다.

**권장 조치:**
`<ClipListSkeleton viewMode={viewMode} count={6} />` 컴포넌트로 교체.

---

#### H-05. 설정 페이지의 언어 변경이 실제 앱 언어에 반영되지 않음

**위치:** `src/app/(app)/settings/settings-client.tsx` L255–272

**현상:**
언어 설정이 DB에 저장되고 토스트 확인까지 나오지만 앱 UI는 여전히 한국어로 고정됩니다. 앱 전체에 i18n 라이브러리나 언어 전환 로직이 없습니다. 사용자는 "English"를 선택해도 아무것도 변하지 않아 설정이 작동하지 않는다고 인식합니다.

**권장 조치:**
단기: 영어 옵션 비활성화 또는 "곧 지원 예정" 배지 추가.
장기: `next-intl` 또는 `next-i18next` 도입.

---

#### H-06. GitHub 카드에 하드코딩된 가상 데이터(12.4k stars, 1.8k forks)

**위치:** `src/app/(app)/clip/[clipId]/clip-detail-client.tsx` L115–119

**현상:**
```tsx
<span className="flex items-center gap-1.5 text-sm text-yellow-400">
  <Star size={14} fill="currentColor" /> 12.4k
</span>
<span className="flex items-center gap-1.5 text-sm text-white/50">
  <GitFork size={14} /> 1.8k
</span>
```
GitHub 플랫폼 클립의 히어로 섹션에 실제 데이터와 무관한 숫자가 하드코딩되어 있습니다. 모든 GitHub 클립이 동일한 star/fork 수를 표시합니다.

**권장 조치:**
실제 GitHub API 데이터를 저장하거나, hero 섹션에서 star/fork 수 표시 제거.

---

### MEDIUM

---

#### M-01. 삭제 확인 다이얼로그가 일부 컴포넌트에만 구현됨

**위치:**
- `src/components/clips/clip-list.tsx` — AlertDialog 사용 (올바름)
- `src/app/(app)/collections/collections-client.tsx` — `confirmDelete` 상태 존재
- `src/app/(app)/images/images-client.tsx` — `confirmDelete` 상태 존재
- `src/components/settings/tag-manager.tsx` — `confirmDelete` 상태 존재

vs.

- `src/app/(app)/highlights/highlights-client.tsx` — 확인 단계 없이 즉시 삭제 가능성 있음
- `src/app/(app)/images/[albumId]/album-detail-client.tsx` — 확인 단계 불명확

**현상:**
삭제 확인 AlertDialog 구현 여부가 컴포넌트마다 다릅니다. 파괴적 액션에 대한 일관된 정책이 없습니다.

**권장 조치:**
모든 영구 삭제 액션에 `AlertDialog` 적용. 아카이브(가역)와 삭제(불가역) 시각적 구분 강화.

---

#### M-02. 로그아웃 시 확인 단계 없음

**위치:** `src/components/layout/app-shell.tsx` L107–110

**현상:**
```tsx
const handleSignOut = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};
```
DropdownMenu의 "로그아웃" 항목 클릭 시 즉시 로그아웃됩니다. 미저장 작업(AddClipDialog 입력 중, 메모 편집 중 등)이 있을 경우 데이터 손실 위험이 있습니다.

**권장 조치:**
로그아웃 전 AlertDialog 확인 추가. 또는 미저장 작업 여부를 ui-store에서 감지하여 경고.

---

#### M-03. 대시보드 로딩 중 StatCard가 "—" 표시 후 flickering

**위치:** `src/app/(app)/dashboard/dashboard-client.tsx` L386–412

**현상:**
`StatCard`의 `loading` prop이 true일 때 animate-pulse placeholder가 올바르게 표시되지만, `statsLoading`이 false로 전환되는 순간 "—" 텍스트가 잠깐 노출된 뒤 실제 숫자로 교체되는 flickering이 발생합니다.

```tsx
value={statsLoading ? '—' : String(stats?.totalClips ?? 0)}
loading={statsLoading}
```

**권장 조치:**
`loading={statsLoading}` 상태에서는 value 접근을 막고, pulse placeholder만 표시. `loading ? null : value` 패턴 적용.

---

#### M-04. Suspense fallback이 빈 div

**위치:** `src/app/(auth)/login/page.tsx` L247–249

**현상:**
```tsx
<Suspense fallback={<div className="flex flex-col gap-6" />}>
  <LoginForm />
</Suspense>
```
Suspense boundary의 fallback이 내용 없는 빈 div입니다. `useSearchParams()` 사용으로 인한 Suspense wrapping은 올바르지만, 로딩 중 빈 화면이 순간적으로 나타납니다.

**권장 조치:**
fallback을 스켈레톤 형태의 로그인 폼 구조로 교체.

---

#### M-05. 회원가입 성공 후 UX 흐름 불명확

**위치:** `src/app/(auth)/signup/page.tsx` L106–108

**현상:**
```tsx
toast.success('이메일을 확인해주세요. 인증 링크를 발송했습니다.');
router.push('/login');
```
이메일 인증이 필요한데 사용자를 로그인 페이지로 즉시 이동시킵니다. 이 시점에 로그인 시도를 하면 실패합니다. 이메일 확인 안내 전용 페이지가 없어 사용자가 혼란스러울 수 있습니다.

**권장 조치:**
`/signup/verify-email` 페이지 생성 후 "이메일을 확인하세요" 안내 + 재전송 버튼 제공. 또는 로그인 페이지에 `?message=check-email` 파라미터 처리 추가.

---

#### M-06. 설정 페이지에 스크롤 내비게이션 없음 (섹션 12개)

**위치:** `src/app/(app)/settings/settings-client.tsx`

**현상:**
설정 페이지에 12개 섹션(프로필, 연결된 계정, 외관, 언어, 알림, 데이터 관리, 플랜, AI 모델, 태그, API 키, 중복 클립, 웹훅)이 단순 vertical scroll로 나열됩니다. 데스크탑에서 특정 섹션으로 바로 이동할 방법이 없습니다.

**권장 조치:**
좌측 앵커 내비게이션 패널(sticky) 추가 또는 섹션별 탭 그룹화.

---

#### M-07. 클립 상세 페이지 메타 타이틀이 정적

**위치:** `src/app/(app)/clip/[clipId]/page.tsx`

**현상:**
```tsx
export const metadata: Metadata = {
  title: '클립 상세',
  description: '클립의 상세 내용을 확인하세요.',
};
```
동적 라우트임에도 정적 메타데이터를 사용합니다. 브라우저 탭에 "클립 상세 — Linkbrain"만 표시되어 여러 탭을 열면 구분이 불가능합니다.

**권장 조치:**
`generateMetadata()` 함수로 교체 후 Supabase에서 클립 제목을 조회하여 동적 title 설정.

---

#### M-08. 인사이트 페이지 에러 상태에 재시도 버튼 없음

**위치:** `src/app/(app)/insights/insights-client.tsx` L63–73

**현상:**
```tsx
if (isError || !data) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      ...
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요</p>
    </div>
  );
}
```
에러 상태에서 재시도 버튼이 없습니다. CLAUDE.md의 "4상태 비동기 UX: error(원인+해결책)" 명세 미충족.

**권장 조치:**
`<ErrorRetry onRetry={() => refetch()} />` 컴포넌트 사용 (FavoritesClient 패턴 참조).

---

#### M-09. 모바일 바텀 내비게이션에 label 텍스트 크기가 극소 (10px)

**위치:** `src/components/layout/mobile-bottom-nav.tsx` L73–82

**현상:**
바텀 내비게이션 아이콘 하단 레이블이 `text-[10px]`입니다. iOS HIG 권장 최소 텍스트 크기(11pt)와 WCAG AA 가이드라인(최소 12px) 미달.

**권장 조치:**
`text-[10px]` → `text-xs`(12px)로 변경.

---

#### M-10. API 키 삭제 시 확인 다이얼로그 없음

**위치:** `src/app/(app)/settings/settings-client.tsx` L876–886

**현상:**
```tsx
onClick={() => void handleDeleteKey(apiKey.id)}
```
API 키 삭제 버튼 클릭 시 즉시 삭제됩니다. API 키는 생성 시 1회만 조회 가능하기 때문에 실수로 삭제하면 복구 불가입니다.

**권장 조치:**
AlertDialog 확인 추가. "이 API 키를 사용하는 외부 연동이 즉시 중단됩니다" 경고 문구 포함.

---

### LOW

---

#### L-01. 로그인/회원가입 버튼의 border-radius 불일치

**위치:**
- `src/app/(auth)/login/page.tsx` L200 — 로그인 버튼 `rounded-full`
- `src/app/(auth)/signup/page.tsx` L297 — 회원가입 버튼 `rounded-xl`

**현상:**
동일한 인증 플로우의 주 CTA 버튼이 서로 다른 border-radius를 사용합니다.

**권장 조치:**
`rounded-xl`로 통일 (다른 앱 버튼과 일관성 유지).

---

#### L-02. 설정 페이지 Breadcrumbs가 단일 항목으로 사실상 무의미

**위치:** `src/app/(app)/settings/settings-client.tsx` L441–443

**현상:**
```tsx
<Breadcrumbs items={[{ label: '설정', href: undefined }]} />
```
항목이 1개뿐인 breadcrumb는 탐색 목적에 기여하지 않습니다.

**권장 조치:**
breadcrumb 제거 또는 서브섹션 진입 시에만 표시.

---

#### L-03. 클립 카드 hover 오버레이 액션이 7개로 과밀

**위치:** `src/components/clips/clip-card.tsx` L200–295

**현상:**
카드 hover 시 즐겨찾기, 아카이브, 원본 열기, 고정, 나중에읽기, 공유, 재처리 등 7개 버튼이 동시에 나타납니다. 특히 모바일(hover 불가)에서는 하단 액션 바와 중복됩니다.

**권장 조치:**
hover 오버레이는 핵심 3개(즐겨찾기, 원본 열기, 더보기)로 축소. 나머지는 ContextMenu로 이동.

---

#### L-04. 다크 모드에서 GitHub 히어로의 `bg-gray-950` 하드코딩

**위치:** `src/app/(app)/clip/[clipId]/clip-detail-client.tsx` L102–104

**현상:**
```tsx
className="mb-7 animate-fade-in-up rounded-2xl border border-border/60 bg-gray-950 p-6 shadow-card"
```
라이트 모드에서도 `bg-gray-950`이 적용됩니다. 시맨틱 색상 변수 사용 원칙에 위배됩니다.

**권장 조치:**
`bg-gray-950`을 `bg-card dark:bg-gray-950`으로 수정, 또는 시맨틱 변수(`bg-surface-raised`) 활용.

---

#### L-05. 대시보드 인사말 텍스트의 이름 중복 fallback 로직

**위치:** `src/app/(app)/dashboard/dashboard-client.tsx` L339–344

**현상:**
`app-shell.tsx`에도 동일한 displayName 추출 로직이 존재합니다. `authUser?.user_metadata?.display_name ?? authUser?.user_metadata?.full_name ?? authUser?.email?.split('@')[0] ?? 'LinkBrain'` 패턴이 최소 두 곳에 중복됩니다.

**권장 조치:**
공통 유틸 `getDisplayName(user)` 함수로 추출 후 재사용.

---

#### L-06. 설정 페이지 알림 토글이 localStorage에만 저장 (DB 미반영)

**위치:** `src/app/(app)/settings/settings-client.tsx` L146–161

**현상:**
알림 설정이 `localStorage`에만 저장됩니다. 다른 기기 또는 브라우저에서 접속하면 설정이 초기화됩니다. 동일 계정에서 여러 기기 사용 시 설정이 동기화되지 않습니다.

**권장 조치:**
단기: 설명 텍스트에 "이 기기에만 적용됩니다" 안내 추가.
장기: `users` 테이블에 `notification_settings` JSONB 컬럼 추가 후 동기화.

---

#### L-07. Suspense fallback 로딩 화면에서 app-level loading.tsx와 외형 불일치

**위치:**
- `src/app/(app)/loading.tsx` — Loader2 스피너 + "로딩 중..." 텍스트
- `src/app/(auth)/loading.tsx` — (별도 존재 여부 미확인, 인증 레이아웃 fallback 불명확)

**현상:**
페이지 레벨 loading.tsx와 컴포넌트 레벨 Skeleton 패턴이 혼용됩니다. 사용자 경험 관점에서 loading.tsx의 스피너 방식보다 Skeleton이 레이아웃 이동(CLS)을 줄입니다.

**권장 조치:**
`loading.tsx`를 각 페이지의 실제 레이아웃을 반영한 Skeleton 구조로 교체.

---

#### L-08. 모바일 검색 입력창의 placeholder 텍스트가 조건 없이 항상 "키워드로 클립 검색..."

**위치:** `src/components/layout/app-shell.tsx` L468

**현상:**
검색 입력창이 열리면 항상 동일한 placeholder가 표시됩니다. 현재 보고 있는 페이지 맥락(즐겨찾기 페이지에서는 "즐겨찾기에서 검색...", 아카이브에서는 "아카이브에서 검색..." 등)이 반영되지 않습니다.

**권장 조치:**
pathname 기반으로 placeholder 텍스트를 동적으로 변경. 또는 현재 텍스트 유지 (낮은 우선순위).

---

## 잘 구현된 부분

다음 항목들은 UX 관점에서 모범적으로 구현되었습니다.

1. **Optimistic Update 일관성**: 즐겨찾기, 아카이브, 핀, 나중에 읽기 모두 즉각 UI 반영 후 서버 오류 시 롤백.

2. **중복 URL 감지 (AddClipDialog)**: URL 입력 500ms 후 자동으로 중복 확인하고, 기존 클립 보기 / 그래도 저장 옵션 제공. UX 배려가 뛰어남.

3. **Skip Navigation 링크**: `app-shell.tsx`에 "본문으로 건너뛰기" 링크가 올바르게 구현됨.

4. **ClipList의 스크린리더 지원**: `AriaLive` 컴포넌트로 클립 수 변화를 스크린리더에 알림. `aria-current="page"` 모바일 내비게이션 적용.

5. **클립 처리 상태 시각화**: `clip-card.tsx`에서 pending/processing/failed 상태를 오버레이 + 재시도 버튼으로 명확하게 표시.

6. **FavoritesClient 4상태 패턴**: loading(ClipListSkeleton) / error(ErrorRetry) / empty(EmptyState) / success(ClipList) 완전 구현. 다른 페이지의 기준이 됨.

7. **API 키 생성 후 1회 노출 UX**: 생성 직후 Dialog로 키를 복사하도록 유도하고, "다시 볼 수 없습니다" 경고 명시.

8. **비밀번호 강도 표시기**: signup 폼의 실시간 강도 바 + 레이블 조합이 사용자에게 명확한 피드백 제공.

9. **Pull-to-refresh + Edge swipe**: 모바일 네이티브 UX 패턴 구현.

10. **다크 모드 디자인 토큰 시스템**: CSS 변수 기반 3-tier 시스템(Primitive → Semantic → Component)으로 체계적으로 구성됨.

---

## 액션 아이템 요약

### 배포 전 필수 수정 (CRITICAL + HIGH)

| 번호 | 이슈 | 파일 |
|------|------|------|
| C-01 | 계정 삭제 기능 구현 또는 임시 숨김 | `settings-client.tsx` |
| C-02 | 비밀번호 재설정 흐름 추가 | `/forgot-password` 신규 |
| H-01 | 로그인 Google 버튼 다크 모드 수정 | `login/page.tsx` |
| H-03 | 비밀번호 보기 토글 + 확인 필드 추가 | `login/page.tsx`, `signup/page.tsx` |
| H-04 | 대시보드 로딩 스켈레톤 교체 | `dashboard-client.tsx` |
| H-05 | 언어 설정 미작동 사용자 안내 | `settings-client.tsx` |
| H-06 | GitHub 카드 하드코딩 데이터 제거 | `clip-detail-client.tsx` |

### 배포 후 우선 개선 (MEDIUM)

| 번호 | 이슈 |
|------|------|
| M-01 | 삭제 확인 다이얼로그 일관성 확보 |
| M-02 | 로그아웃 확인 단계 추가 |
| M-05 | 회원가입 이메일 인증 안내 페이지 |
| M-08 | 인사이트 에러 상태 재시도 버튼 |
| M-09 | 바텀 내비게이션 레이블 12px 이상 |
| M-10 | API 키 삭제 확인 다이얼로그 |

---

*이 보고서는 코드 정적 분석 기반이며 실제 브라우저 렌더링 검증이 포함되지 않았습니다. 배포 전 Playwright E2E 테스트로 실제 흐름을 재확인하는 것을 권장합니다.*
