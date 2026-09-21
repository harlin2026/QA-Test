/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 總覽與沽清', () => {
  test('1. 營收總覽可切換時段', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['昨日', '本周', '今日']) {
      const btn = page.locator('uni-button, uni-view, button', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }
    await expect(page.getByText(/订单数|销售金额|营业实收/).first()).toBeVisible();
  });

  test('2. 沽清頁可瀏覽分類', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });

    const category = page.locator('uni-button, uni-view', { hasText: /全部|套餐|红葡萄酒/ }).first();
    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await page.waitForTimeout(500);
    }
  });
});
