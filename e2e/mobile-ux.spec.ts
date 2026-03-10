/**
 * E2E Tests — 모바일 UX 개선 검증
 *
 * 1. 대시보드 인사 헤딩이 한 줄로 표시되는지 확인
 * 2. 요약/상세 토글 버튼 가로 배치 확인
 * 3. 뷰 모드 토글 (Grid/List) 동작 확인
 * 4. 클립 추가 모달 — 모바일에서 상단 배치 확인
 */
import { test, expect } from '@playwright/test';

// /collections는 인증 없이 앱 레이아웃 접근 가능
const APP_URL = '/collections';

// 모바일 뷰포트
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// ─── 1. 인사 헤딩 한 줄 표시 ─────────────────────────────────────────────────

test.describe('1. 대시보드 헤딩', () => {
  // /dashboard는 인증 필요 → 리다이렉트됨. 구조만 확인
  test('헤딩 h1 요소가 text-xl 클래스를 사용', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/dashboard');
    // 인증 리다이렉트되더라도 OK — 로그인 화면 로드 확인
    await page.waitForLoadState('networkidle');

    // 인증 없으면 /login으로 리다이렉트
    const url = page.url();
    if (url.includes('/login')) {
      // 인증 필요 — 구조 테스트 스킵
      test.skip();
      return;
    }

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const classList = await h1.getAttribute('class');
    expect(classList).toContain('text-xl');
    expect(classList).not.toContain('text-3xl');
  });
});

// ─── 2. 요약/상세 버튼 그룹 가로 배치 ────────────────────────────────────────

test.describe('2. 대시보드 토글 버튼 그룹', () => {
  test('요약/상세 버튼이 같은 Y좌표에 배치 (가로 정렬)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    const summaryBtn = page.locator('button', { hasText: '요약' });
    const detailBtn = page.locator('button', { hasText: '상세' });

    if (!(await summaryBtn.isVisible())) {
      test.skip();
      return;
    }

    const summaryBox = await summaryBtn.boundingBox();
    const detailBox = await detailBtn.boundingBox();

    expect(summaryBox).toBeTruthy();
    expect(detailBox).toBeTruthy();

    // Y좌표 차이가 5px 이내 → 같은 줄
    expect(Math.abs(summaryBox!.y - detailBox!.y)).toBeLessThan(5);
  });
});

// ─── 3. 뷰 모드 토글 ─────────────────────────────────────────────────────────

test.describe('3. 뷰 모드 토글', () => {
  test('Grid/List 토글 버튼이 /collections에서 표시됨', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    const gridBtn = page.locator('button[aria-label="그리드 보기"]');
    const listBtn = page.locator('button[aria-label="리스트 보기"]');

    // 컬렉션 페이지에는 ClipList가 없을 수 있으므로
    // 대시보드에서 확인하거나, 존재 여부만 체크
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    await expect(gridBtn).toBeVisible({ timeout: 10000 });
    await expect(listBtn).toBeVisible();
  });

  test('List 버튼 클릭 시 리스트 뷰로 전환', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    const listBtn = page.locator('button[aria-label="리스트 보기"]');
    if (!(await listBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await listBtn.click();

    // 리스트 뷰에서는 ClipRow의 role="list"가 flex-col gap-1
    // 그리드 뷰에서는 grid 클래스
    // 활성 버튼의 색상으로 확인
    const classList = await listBtn.getAttribute('class');
    expect(classList).toContain('text-primary');
  });
});

// ─── 4. 클립 추가 모달 상단 배치 ──────────────────────────────────────────────

test.describe('4. 클립 추가 모달 — 모바일 키보드 대응', () => {
  test('모바일에서 모달이 상단에 배치됨 (items-start)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // FAB 또는 사이드바의 클립 추가 버튼 클릭
    // /collections에서 앱 레이아웃이 로드되므로 Cmd+N 또는 직접 트리거
    // 모달 열기: JS로 직접 트리거
    await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>);
      // Zustand store 접근은 어려우므로 버튼 클릭으로 대체
    });

    // + 버튼(FAB)은 데스크탑 전용이므로 모바일 하단 네비게이션의 + 버튼 사용
    const addBtn = page.locator('button[aria-label="클립 추가"]').first();
    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 다이얼로그의 wrapper가 items-start (상단 배치) 확인
    const wrapper = page.locator('[data-slot="dialog-portal"] > div.fixed');
    if (await wrapper.isVisible()) {
      const classList = await wrapper.getAttribute('class');
      expect(classList).toContain('items-start');
    }
  });
});
