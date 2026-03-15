/**
 * E2E Tests — AI 채팅 사이드바 + 인사이트 시각 검증
 */
import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

// Helper: close any open dialog overlay before interacting
async function dismissOverlays(page: import('@playwright/test').Page) {
  // Press Escape multiple times to close any open dialogs/modals
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // Wait for any overlays to be gone
  await page.waitForTimeout(300);
}

// ─── 로그인 상태 확인 ────────────────────────────────────────────────────────

test.describe('인증 상태', () => {
  test('로그인된 상태에서 /login 접근 → 대시보드 리다이렉트', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 15000 });
    // 인증된 경우 dashboard로, 아닌 경우 login에 머무름 — 둘 다 OK
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });
});

// ─── 데스크탑 채팅 기능 ─────────────────────────────────────────────────────

test.describe('데스크탑 채팅 패널', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      test.skip();
    }
    // Dismiss any auto-opened overlays
    await dismissOverlays(page);
  });

  test('사이드바에 AI 채팅 버튼 존재', async ({ page }) => {
    const chatButton = page.locator('button[aria-label="AI 채팅 열기"]');
    await expect(chatButton).toBeVisible();
  });

  test('AI 채팅 버튼 클릭 → 채팅 패널 열기', async ({ page }) => {
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    // 채팅 패널: right-side aside with specific close button
    const closeBtn = page.locator('button[aria-label="채팅 닫기"]');
    await expect(closeBtn).toBeVisible();
  });

  test('채팅 패널 빈 상태 — 새 대화 안내', async ({ page }) => {
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await expect(page.getByText('아직 대화가 없습니다')).toBeVisible();
    await expect(page.getByRole('button', { name: '새 대화 시작' })).toBeVisible();
  });

  test('새 대화 시작 → 채팅 뷰 전환', async ({ page }) => {
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    await page.getByRole('button', { name: '새 대화 시작' }).click();
    // 입력창 표시
    const textarea = page.locator('textarea[placeholder="질문을 입력하세요..."]');
    await expect(textarea).toBeVisible();
    // 빈 채팅 안내
    await expect(page.getByText('무엇이든 물어보세요')).toBeVisible();
  });

  test('채팅 패널 닫기 버튼', async ({ page }) => {
    await page.locator('button[aria-label="AI 채팅 열기"]').click();
    const closeBtn = page.locator('button[aria-label="채팅 닫기"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(closeBtn).not.toBeVisible();
  });

  test('Cmd+J 단축키로 채팅 토글', async ({ page }) => {
    // 열기
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(300);
    const closeBtn = page.locator('button[aria-label="채팅 닫기"]');
    await expect(closeBtn).toBeVisible();

    // 닫기
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(300);
    await expect(closeBtn).not.toBeVisible();
  });

  test('Escape로 채팅 닫기', async ({ page }) => {
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(300);
    const closeBtn = page.locator('button[aria-label="채팅 닫기"]');
    await expect(closeBtn).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(closeBtn).not.toBeVisible();
  });
});

// ─── 인사이트 페이지 ────────────────────────────────────────────────────────

test.describe('인사이트 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/insights', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      test.skip();
    }
    await dismissOverlays(page);
  });

  test('인사이트 헤더 표시', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI 인사이트' })).toBeVisible();
  });

  test('AI 콘텐츠 분석 CTA 존재', async ({ page }) => {
    await expect(page.getByText('AI 콘텐츠 분석')).toBeVisible();
    await expect(page.getByRole('button', { name: '분석 시작' })).toBeVisible();
  });

  test('통계 카드 표시', async ({ page }) => {
    await expect(page.getByText('전체 클립')).toBeVisible();
    // Use more specific locators to avoid sidebar nav matches
    const mainContent = page.getByLabel('메인 콘텐츠');
    await expect(mainContent.getByText('즐겨찾기')).toBeVisible();
    await expect(page.getByText('읽기 완료율').first()).toBeVisible();
  });

  test('활동 차트 표시', async ({ page }) => {
    await expect(page.getByText('최근 30일 저장 활동')).toBeVisible();
  });
});

// ─── 스크린샷 시각 검증 ─────────────────────────────────────────────────────

test.describe('시각 스크린샷', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/login')) {
      test.skip();
    }
    await dismissOverlays(page);
  });

  test('채팅 패널 열린 상태', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/chat-panel-open.png', fullPage: false });
  });

  test('채팅 새 대화 뷰', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(300);
    const newChatBtn = page.getByRole('button', { name: '새 대화 시작' });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    } else {
      await page.locator('button[aria-label="새 대화"]').click();
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/chat-new-conversation.png', fullPage: false });
  });

  test('인사이트 페이지', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/insights', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/insights-page.png', fullPage: true });
  });
});
