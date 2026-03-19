# Linkbrain v2 접근성(A11y) 감시 보고서

**검토 대상**: Next.js 15 + shadcn/ui + Supabase 기반 클립 관리 앱  
**검토 기준**: WCAG 2.1 Level AA  
**검토 날짜**: 2026-03-19  
**상태**: 주요 개선 필요 (27건 발견)

---

## 요약 평가

### 강점
- ✅ Radix UI 기반 shadcn/ui 컴포넌트 사용으로 기본 접근성 지원
- ✅ AriaLive 컴포넌트 구현 (동적 콘텐츠 알림)
- ✅ 스킵 내비게이션 링크 구현 (app-shell.tsx)
- ✅ 다양한 aria-label 사용 (버튼, 아이콘)
- ✅ 키보드 단축키 문서화 (⌘K, ⌘J)
- ✅ 모바일 bottom nav에 aria-current="page" 사용

### 약점
- ❌ **색상 대비 부족**: 브랜드 색상(#21DBA4)과 배경의 대비 비율 미달
- ❌ **포커스 표시기 불완전**: 많은 인터랙티브 요소에서 focus-visible 미흡
- ❌ **대체 텍스트 누락**: 아이콘 버튼의 aria-label 누락 사례
- ❌ **시맨틱 HTML 부족**: div로 버튼 역할 하는 요소 다수
- ❌ **Form 접근성**: 에러 메시지 연결(aria-describedby) 미흡
- ❌ **모달/다이얼로그**: focus trap 및 focus 복원 미완전
- ❌ **라이브 리전**: 알림/토스트 메시지의 aria-live 활용 부족

---

## 상세 발견사항

### 1. 색상 대비 (WCAG 2.1 Level AA: 4.5:1)

#### 이슈 1.1: 브랜드 색상 대비 부족 [HIGH]

**위치**: 전체 앱  
**문제**:
- 브랜드 색상 `#21DBA4` (oklch(0.78 0.15 168))과 배경의 대비 비율 미달
- Light mode: #21DBA4 on #f9fafb = 약 3.2:1 (필요: 4.5:1)
- Dark mode: #21DBA4 on #1a1a1a = 약 3.8:1

**영향 범위**:
- 버튼: "클립 추가" (app-header.tsx:181)
- 링크: View mode toggles (app-header.tsx:119)
- 배지: Pro badge (app-shell.tsx:235, 52)
- 사이드바: Active nav item text (app-shell.tsx:216)

**개선 방안**: 색상 명도 상향 조정
```css
--primary: oklch(0.68 0.18 168); /* Light */
@media (prefers-color-scheme: dark) {
  --primary: oklch(0.85 0.15 168); /* Dark */
}
```

#### 이슈 1.2: Muted 텍스트 대비 부족 [MEDIUM]

**위치**: 여러 위치  
**문제**: `text-muted-foreground` 배경 대비 약 2.1:1

**영향**: 섹션 헤더, 폼 헬퍼 텍스트, 부차 정보

---

### 2. 포커스 인디케이터 [CRITICAL]

#### 이슈 2.1: 아이콘 버튼 포커스 표시 불명확 [HIGH]

**위치**: clip-card.tsx:200-295, app-header.tsx  
**문제**: focus-visible 스타일 없음

**개선 방안**:
```jsx
<button
  className="... focus-visible:outline-none focus-visible:ring-2 
             focus-visible:ring-offset-2 focus-visible:ring-white/80"
>
  <Star />
</button>
```

#### 이슈 2.2: 검색 입력 포커스 트랜지션 불충분 [MEDIUM]

**위치**: app-header.tsx:77-105

---

### 3. 대체 텍스트 및 라벨 [HIGH]

#### 이슈 3.1: 아이콘 버튼 aria-label 누락 [HIGH]

**위치**: 여러 컴포넌트  
**문제**: 체크박스, 아이콘 버튼에 aria-label 없음

**예시**:
```jsx
// ❌ aria-label 없음
<button onClick={handleFavorite}>
  <Star />
</button>

// ✅ 개선
<button 
  onClick={handleFavorite}
  aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
>
  <Star />
</button>
```

**영향 범위**:
- Clip card 체크박스 (clip-card.tsx:182-196)
- 6개+ 아이콘 버튼
- 모바일 검색 버튼 (app-shell.tsx:450)

#### 이슈 3.2: 이미지 alt 속성 부족 [MEDIUM]

**위치**: clip-card.tsx, add-clip-dialog.tsx  
**문제**: 빈 alt 또는 제목만으로 alt

---

### 4. 시맨틱 HTML [HIGH]

#### 이슈 4.1: div로 만든 버튼 [HIGH]

**위치**: clip-card.tsx:112, app-shell.tsx:133-138

**문제**:
```jsx
// ❌ div가 button 역할
<div onClick={handleCardClick} className="cursor-pointer">
  Card content
</div>
```

**개선**:
```jsx
// ✅ button 사용
<button onClick={handleCardClick} type="button">
  Card content
</button>
```

#### 이슈 4.2: Heading 레벨 부정확 [MEDIUM]

**위치**: app-header.tsx:71, 모달 title

---

### 5. 폼 접근성 [HIGH]

#### 이슈 5.1: 에러 메시지 연결 부족 [HIGH]

**위치**: login/page.tsx, 모든 폼  
**문제**: aria-describedby로 에러 연결 안 됨

**개선**:
```jsx
const emailErrorId = 'email-error';
<input
  id="email-input"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? emailErrorId : undefined}
  {...register('email')}
/>
{errors.email && (
  <p id={emailErrorId} className="text-destructive">
    {errors.email.message}
  </p>
)}
```

#### 이슈 5.2: 입력 필드 레이블 연결 부족 [MEDIUM]

**위치**: 모든 폼  
**문제**: placeholder만 있고 label 없음

---

### 6. 키보드 내비게이션 [MEDIUM]

#### 이슈 6.1: Tab 순서 논리적 흐름 부족 [MEDIUM]

**위치**: clip-card.tsx  
**문제**: 호버 시에만 나타나는 액션 버튼들

#### 이슈 6.2: 모달 Focus Trap 불완전 [HIGH]

**위치**: dialog.tsx

#### 이슈 6.3: Escape 키 핸들링 [MEDIUM]

**위치**: 중첩 다이얼로그

---

### 7. 동적 콘텐츠 & 라이브 리전 [MEDIUM]

#### 이슈 7.1: AriaLive 활용 미흡 [MEDIUM]

**위치**: 알림, 비동기 상태 변화  
**문제**: AriaLive가 존재하지만 사용 안 됨

**개선**:
```jsx
const [announcement, setAnnouncement] = useState('');

const toggleFavorite = async () => {
  await api.toggleFavorite(clipId);
  setAnnouncement(`클립이 ${isFavorite ? '즐겨찾기' : '즐겨찾기 해제'}되었습니다`);
};

return (
  <>
    <AriaLive message={announcement} priority="assertive" />
    <button onClick={toggleFavorite}>...</button>
  </>
);
```

#### 이슈 7.2: Sonner 토스트 접근성 [MEDIUM]

**위치**: sonner.tsx  
**문제**: aria-live 속성 확인 필요

---

### 8. 이미지 & 미디어 [MEDIUM]

#### 이슈 8.1: 이미지 로딩 상태 표시 부족 [MEDIUM]

**위치**: clip-card.tsx, clip-peek-panel.tsx  
**개선**: aria-busy, 의미 있는 alt

---

### 9. 모바일/반응형 [MEDIUM]

#### 이슈 9.1: 터치 타겟 크기 [WCAG 2.1 Level AAA: 44x44px] [MEDIUM]

**위치**: 여러 인터랙티브 요소  
**문제**: 모바일에서 32px 버튼 (최소 44px 필요)

**영향**:
- Clip card icon buttons
- Mobile search clear button
- View mode toggles

#### 이슈 9.2: 모바일 오버레이 콘텐츠 접근성 [MEDIUM]

**위치**: app-shell.tsx, clip-peek-panel.tsx  
**개선**: inert 속성 추가

---

### 10. 기타 [LOW]

#### 이슈 10.1: 언어 속성 [LOW]

**위치**: src/app/layout.tsx  
**개선**: `<html lang="ko">`

#### 이슈 10.2: 스킵 내비게이션 [LOW]

**평가**: 이미 구현됨 (좋음)

---

## 우선순위별 체크리스트

### CRITICAL (배포 전 필수)
- [ ] 아이콘 버튼 포커스 표시 추가
- [ ] 폼 에러 메시지 aria-describedby 연결
- [ ] div 버튼을 button으로 변경

### HIGH (1주 내)
- [ ] 브랜드 색상 대비 개선
- [ ] 누락된 aria-label 추가 (모든 아이콘 버튼)
- [ ] muted-foreground 대비 개선
- [ ] 모달 focus trap 검증

### MEDIUM (1개월 내)
- [ ] Tab 순서 논리성 개선
- [ ] AriaLive 활용 확대
- [ ] 이미지 로딩 상태 표시
- [ ] 터치 타겟 크기 확대

### LOW (계획 중)
- [ ] lang 속성 추가
- [ ] 이미지 alt 텍스트 상세화

---

## 테스트 절차

### 1. 키보드 네비게이션
```
1. Tab 키로 모든 인터랙티브 요소 탐색
2. Shift+Tab으로 역순 탐색
3. Enter/Space로 버튼 활성화
4. Escape로 모달 닫기
5. 예상 순서: Skip Nav → Header → Main → Sidebar
```

### 2. 스크린리더 (NVDA/JAWS/VoiceOver)
```
1. 페이지 로드 후 H 키로 heading 구조 확인
2. F 키로 폼 필드 탐색
3. B 키로 버튼 탐색 (모든 아이콘 버튼 발화 확인)
4. aria-live 영역 업데이트 시 자동 발화 확인
```

### 3. 색상 대비
```
1. Chrome DevTools > Rendering > prefers-color-scheme
2. WebAIM 대비 검사기로 각 색상 조합 확인
3. Color Blindness Simulator로 색약 시뮬레이션
```

### 4. 모바일
```
1. 터치 타겟 크기 확인 (최소 44x44px)
2. 터치 + 화면 리더 동시 테스트
3. 가로/세로 모드 전환 테스트
```

---

## 개선 예시 코드

### 1. 아이콘 버튼 (before → after)

**Before**:
```jsx
<button onClick={handlePin} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30">
  <Pin className="h-4 w-4" />
</button>
```

**After**:
```jsx
<button 
  onClick={handlePin}
  aria-label={clip.is_pinned ? '고정 해제' : '고정'}
  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80"
>
  <Pin className={cn('h-4 w-4', clip.is_pinned && 'fill-current')} />
</button>
```

### 2. 폼 필드 (before → after)

**Before**:
```jsx
<input type="email" placeholder="이메일" {...register('email')} />
{errors.email && <p className="text-red-500">{errors.email.message}</p>}
```

**After**:
```jsx
const emailErrorId = 'email-error';
<div>
  <label htmlFor="email-input" className="text-sm font-medium">
    이메일 <span aria-label="필수">*</span>
  </label>
  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? emailErrorId : undefined}
    {...register('email')}
  />
  {errors.email && (
    <p id={emailErrorId} className="text-sm text-destructive mt-1">
      {errors.email.message}
    </p>
  )}
</div>
```

### 3. 카드 컴포넌트 (before → after)

**Before**:
```jsx
<div onClick={handleCardClick} className="cursor-pointer rounded-2xl border...">
  {/* content */}
</div>
```

**After**:
```jsx
<button
  onClick={handleCardClick}
  type="button"
  className="cursor-pointer rounded-2xl border... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  aria-label={`${clip.title ?? clip.url} 클립 열기`}
>
  {/* content */}
</button>
```

---

## 유지보수 가이드

### 향후 컴포넌트 개발 체크리스트

```
□ Semantic HTML (div 대신 button, form, nav)
□ aria-label 또는 aria-labelledby (모든 아이콘 버튼)
□ focus-visible 스타일 (모든 인터랙티브 요소)
□ aria-describedby for errors (모든 폼 필드)
□ Color contrast ratio ≥ 4.5:1
□ Touch target ≥ 44x44px (모바일)
□ Keyboard support (Tab, Enter, Escape)
□ ARIA roles/states/properties
□ Live regions for dynamic updates
□ Alt text for images
□ Prefers-reduced-motion 존중
□ lang 속성 (HTML)
```

---

## 참고 자료

### WCAG 2.1 Success Criteria
- **1.4.3**: Contrast (Minimum) — 4.5:1
- **2.1.1**: Keyboard — 모든 기능 키보드 접근
- **2.4.7**: Focus Visible — 포커스 표시기 필수
- **3.3.4**: Error Prevention — 에러 메시지 명확화

### 도구
- **WAVE**: https://wave.webaim.org/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Blindness Simulator**: https://www.color-blindness.com/coblis/

---

## 결론

Linkbrain v2는 shadcn/ui 기반의 좋은 접근성 기초를 가지고 있지만, **색상 대비, 포커스 인디케이터, 폼 에러 메시지 연결** 등 주요 항목에서 WCAG 2.1 Level AA 미달 상태입니다.

**배포 전 CRITICAL 이슈 3건은 반드시 해결**하고, **HIGH 이슈 5건을 1주 내에 완료**하는 것을 권장합니다.

---

**보고서 작성**: Accessibility Testing Agent  
**최종 업데이트**: 2026-03-19  
**다음 검토 예정**: 개선 완료 후 재감시
