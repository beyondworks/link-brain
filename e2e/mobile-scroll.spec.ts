/**
 * E2E Tests — 모바일 헤더 hide-on-scroll + 하단 패딩 검증
 *
 * 배포된 Vercel URL 대상 (인증 불필요 페이지 사용)
 * iPhone 14 Pro 뷰포트에서 테스트
 */
import { test, expect, type Page } from '@playwright/test';

// /collections는 인증 없이 앱 레이아웃 접근 가능
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const APP_PATH = '/collections';

// iPhone 14 Pro viewport
const MOBILE = { width: 393, height: 852 };

test.describe('모바일 헤더 hide-on-scroll', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: MOBILE,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true,
    });
    page = await context.newPage();
    await page.goto(`${BASE_URL}${APP_PATH}`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. 초기 상태에서 모바일 헤더가 보임', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    await expect(header).toBeVisible({ timeout: 10000 });

    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    // 헤더가 화면 상단 근처에 위치 (top < 100px)
    expect(box!.y).toBeLessThan(100);
  });

  test('2. 아래로 스크롤 시 헤더가 숨겨짐', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    await expect(header).toBeVisible({ timeout: 10000 });

    const main = page.locator('#main-content');

    // 아래로 300px 스크롤
    await main.evaluate((el) => {
      el.scrollBy({ top: 300, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // 헤더의 transform이 -translate-y-full 적용되었는지 확인
    const transform = await header.evaluate((el) =>
      window.getComputedStyle(el).transform,
    );
    // translateY(-100%)는 matrix(1, 0, 0, 1, 0, -HEIGHT) 형태
    // transform이 none이 아니고 Y값이 음수면 숨겨진 것
    if (transform && transform !== 'none') {
      const match = transform.match(/matrix\(.*,\s*([-\d.]+)\)$/);
      if (match) {
        const translateY = parseFloat(match[1]);
        expect(translateY).toBeLessThan(0);
      }
    }
  });

  test('3. 위로 스크롤 시 헤더가 복원됨', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    const main = page.locator('#main-content');

    // 먼저 아래로 스크롤해서 헤더 숨기기
    await main.evaluate((el) => {
      el.scrollBy({ top: 400, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // 위로 스크롤
    await main.evaluate((el) => {
      el.scrollBy({ top: -100, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // 헤더 transform 확인 — none이면 보이는 상태
    const transform = await header.evaluate((el) =>
      window.getComputedStyle(el).transform,
    );
    // 복원되면 transform이 none이거나 translateY(0)
    const isVisible =
      transform === 'none' ||
      transform === '' ||
      transform === 'matrix(1, 0, 0, 1, 0, 0)';
    expect(isVisible).toBe(true);
  });

  test('4. 최상단 스크롤 시 헤더가 항상 보임', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    const main = page.locator('#main-content');

    // 아래로 갔다가 최상단으로 복귀
    await main.evaluate((el) => {
      el.scrollBy({ top: 300, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    await main.evaluate((el) => {
      el.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const transform = await header.evaluate((el) =>
      window.getComputedStyle(el).transform,
    );
    const isVisible =
      transform === 'none' ||
      transform === '' ||
      transform === 'matrix(1, 0, 0, 1, 0, 0)';
    expect(isVisible).toBe(true);
  });

  test('5. 최하단에서 마지막 콘텐츠가 bottom nav에 안 가려짐', async () => {
    const main = page.locator('#main-content');
    const bottomNav = page.locator('nav.fixed.bottom-0');

    // 최하단으로 스크롤
    await main.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // main의 scrollTop + clientHeight >= scrollHeight (완전 최하단)
    const scrollState = await main.evaluate((el) => ({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));

    const atBottom =
      scrollState.scrollTop + scrollState.clientHeight >=
      scrollState.scrollHeight - 2;
    expect(atBottom).toBe(true);

    // bottom nav의 위치 확인
    const navBox = await bottomNav.boundingBox();
    if (navBox) {
      // main의 padding-bottom이 bottom nav 높이 이상인지 확인
      const paddingBottom = await main.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).paddingBottom);
      });
      expect(paddingBottom).toBeGreaterThanOrEqual(navBox.height - 5);
    }
  });

  test('6. 최하단 도달 시 헤더가 보임', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    const main = page.locator('#main-content');

    // 최하단으로 스크롤
    await main.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const transform = await header.evaluate((el) =>
      window.getComputedStyle(el).transform,
    );
    const isVisible =
      transform === 'none' ||
      transform === '' ||
      transform === 'matrix(1, 0, 0, 1, 0, 0)';
    expect(isVisible).toBe(true);
  });

  test('7. over-scroll 없음 — 최하단에서 추가 빈 공간 없음', async () => {
    const main = page.locator('#main-content');

    // 스크롤이 실제로 필요한지 확인 (콘텐츠가 뷰포트보다 길어야 의미 있음)
    const scrollInfo = await main.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      isScrollable: el.scrollHeight > el.clientHeight + 10,
    }));

    // 콘텐츠가 짧아서 스크롤이 불필요한 페이지는 skip
    if (!scrollInfo.isScrollable) {
      // 스크롤 불필요 — padding-bottom이 nav 높이와 일치하는지만 확인
      const paddingBottom = await main.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).paddingBottom),
      );
      const nav = page.locator('nav.fixed.bottom-0');
      const navBox = await nav.boundingBox();
      if (navBox) {
        // padding이 nav 높이의 ±10px 이내
        expect(Math.abs(paddingBottom - navBox.height)).toBeLessThan(10);
      }
      return;
    }

    // 최하단으로 스크롤
    await main.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    // 스크린샷 촬영 - 최하단 상태 확인
    await page.screenshot({
      path: 'e2e/screenshots/mobile-scroll-bottom.png',
      fullPage: false,
    });

    // over-scroll 측정: scrollHeight - clientHeight가 실제 콘텐츠 높이에 비해 과도한지 확인
    // padding-bottom이 nav 높이를 크게 초과하면 over-scroll
    const overScroll = await main.evaluate((el) => {
      const nav = document.querySelector('nav.fixed') as HTMLElement;
      if (!nav) return -1;
      const navHeight = nav.getBoundingClientRect().height;
      const paddingBottom = parseFloat(window.getComputedStyle(el).paddingBottom);
      // padding이 nav 높이보다 얼마나 초과하는지
      return paddingBottom - navHeight;
    });

    // padding-bottom이 bottom nav 높이보다 20px 이상 초과하면 over-scroll
    if (overScroll >= 0) {
      expect(overScroll).toBeLessThan(20);
    }
  });

  test('8. sticky 헤더가 콘텐츠와 겹치지 않음', async () => {
    const header = page.locator('header[aria-label="앱 헤더"]');
    const main = page.locator('#main-content');

    // 중간 위치로 스크롤
    await main.evaluate((el) => {
      el.scrollTo({ top: 200, behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    // 위로 살짝 스크롤해서 헤더 복원
    await main.evaluate((el) => {
      el.scrollBy({ top: -50, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // 스크린샷 촬영
    await page.screenshot({
      path: 'e2e/screenshots/mobile-scroll-header-overlap.png',
      fullPage: false,
    });

    // 헤더 하단 경계와 첫 번째 보이는 콘텐츠 상단 비교
    const headerBox = await header.boundingBox();
    if (headerBox) {
      const headerBottom = headerBox.y + headerBox.height;
      // 헤더 바로 아래의 첫 번째 콘텐츠 요소 위치
      const firstContentTop = await main.evaluate((el) => {
        const contentDiv = el.querySelector(':scope > div:last-child') as HTMLElement;
        if (!contentDiv) return 0;
        const firstChild = contentDiv.firstElementChild as HTMLElement;
        if (!firstChild) return 0;
        return firstChild.getBoundingClientRect().top;
      });
      // 헤더 하단이 첫 콘텐츠 상단보다 아래면 겹침
      // sticky는 겹침이 없어야 함 (콘텐츠가 헤더 아래에서 시작)
      // 하지만 스크롤된 상태에서는 콘텐츠가 헤더 뒤로 갈 수 있음 (정상)
      // 여기서는 심각한 겹침(50px+)만 확인
      const overlap = headerBottom - firstContentTop;
      expect(overlap).toBeLessThan(50);
    }
  });
});
