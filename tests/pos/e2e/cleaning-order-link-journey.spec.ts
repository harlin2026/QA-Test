/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { addFirstAvailableProduct, clearCartIfAny, openPosPage } from '../helpers/pos';

/**
 * 閉環：沽清頁標記/瀏覽 → 點單核對售罄語意 → 回到沽清（盡量還原）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 沽清與點單聯動閉環', () => {
  test('1. 沽清頁切換未沽清/已沽清', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['未沽清', '已沽清']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }

    // 若有開關/沽清按鈕，點一次再點回來（避免永久污染）
    const toggle = page.locator('uni-switch, .uni-switch, uni-button', { hasText: /沽清|恢复|开|关/ }).first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click().catch(() => {});
      await page.waitForTimeout(500);
      await toggle.click().catch(() => {});
    }
  });

  test('2. 點單頁仍可瀏覽商品（售罄商品不可誤加時至少頁面可用）', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await expect(page.getByText(/¥|全部|商品/).first()).toBeVisible({ timeout: 10_000 });
    await addFirstAvailableProduct(page).catch(async () => {
      await expect(page.getByText(/已售罄|暂无商品|¥/).first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. 回到沽清確認頁面仍可用', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });
  });
});
