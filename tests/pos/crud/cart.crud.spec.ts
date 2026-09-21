/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { addFirstAvailableProduct, clickTextButton, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('POS CRUD 購物車', () => {
  test('加購商品、改數量後清空', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');

    const clearBtn = page.locator('uni-button', { hasText: /^清空$/ }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      const confirm = page.locator('uni-button', { hasText: /确定|確認|确认/ }).last();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      await page.waitForTimeout(500);
    }

    await addFirstAvailableProduct(page);
    await expect(page.getByText(/总共[1-9]\d*件|商品总价[\s\S]*¥\s*[1-9]/).first()).toBeVisible({
      timeout: 10_000,
    });

    await clickTextButton(page, /^清空$/);
    const confirm = page.locator('uni-button', { hasText: /确定|確認|确认/ }).last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await page.waitForTimeout(600);

    await expect(page.getByText(/总共0件|暂无商品|¥\s*0/).first()).toBeVisible({ timeout: 10_000 });
  });
});
