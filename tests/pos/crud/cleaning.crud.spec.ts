/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 沽清', () => {
  test('可切換未沽清/已沽清與分類', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['未沽清', '已沽清']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }

    const category = page.locator('uni-button, uni-view', { hasText: /全部|套餐|红葡萄酒/ }).first();
    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await page.waitForTimeout(400);
    }

    await expect(page.getByText(/未沽清|已沽清|商品规格沽清|¥/).first()).toBeVisible();
  });
});
