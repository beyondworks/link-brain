import { test, expect } from '@playwright/test';
test('basic', async ({ page }) => {
  // Use commit (earliest navigation event) to avoid redirect frame-detach issues
  const res = await page.goto('/', { waitUntil: 'commit' });
  expect(res?.status()).toBeLessThan(400);
  await page.waitForTimeout(3000);
  // After loading, take screenshot
  await page.screenshot({ path: 'e2e/screenshots/smoke-landing.png' });
});
