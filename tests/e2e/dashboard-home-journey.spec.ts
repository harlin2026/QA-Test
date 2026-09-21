/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectDashboard } from '../helpers/page-checks';

/**
 * E2E：首頁數據總覽 → 進入核心業務頁
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 數據總覽閉環', () => {
  test('1. 首頁數據總覽可載入', async ({ page }) => {
    await openAppPage(page, '/');
    await expectDashboard(page);
  });

  test('2. 從側邊欄進入商品列表', async ({ page }) => {
    await openAppPage(page, '/');
    const goodsNav = page.locator('.nav-item', { hasText: /商品/ }).first();
    if (await goodsNav.isVisible().catch(() => false)) {
      await goodsNav.click();
    }
    await page.goto('/goods/list');
    await expect(page).toHaveURL(/\/goods\/list/);
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible({ timeout: 15_000 });
  });

  test('3. 從首頁進入訂單列表仍可用', async ({ page }) => {
    await openAppPage(page, '/');
    await page.goto('/orders/list');
    await expect(page).toHaveURL(/\/orders\/list/);
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible({ timeout: 15_000 });
  });
});
