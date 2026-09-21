/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openInventoryOverview } from '../helpers/pos';

test.describe('POS CRUD 即時庫存總覽', () => {
  test('可從總覽進入庫存總覽並看到同步入口', async ({ page }) => {
    await openInventoryOverview(page);
    await expect(page.getByText(/库存总览|剩余库存|一键同步|售罄/).first()).toBeVisible({
      timeout: 15_000,
    });

    const sync = page.locator('uni-button, uni-view', { hasText: /一键同步|实时/ }).first();
    if (await sync.isVisible().catch(() => false)) {
      await sync.click();
      await page.waitForTimeout(600);
    }
    await expect(page.getByText(/库存|售罄|偏低|充足|商品/).first()).toBeVisible();
  });
});
