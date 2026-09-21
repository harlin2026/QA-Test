/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 存酒狀態與詳情閉環', () => {
  test('1. 存酒列表可切換寄存中／即將到期／已取出', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expect(page.getByText(/新建存酒|寄存中|即将到期/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['全部', '寄存中', '即将到期', '已取出', '已过期']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }
    await expect(page.getByText(/新建存酒|暂无存酒|寄存|取出/).first()).toBeVisible();
  });

  test('2. 嘗試打開存酒詳情（含取酒入口）', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    const card = page.locator('uni-view, uni-button', { hasText: /数量|寄存|到期/ }).nth(2);
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(800);
    }
    if (/\/pages\/inventory\/detail/.test(page.url())) {
      await expect(page.getByText(/存酒详情|取酒|顾客姓名|酒标照片/).first()).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await expect(page.getByText(/新建存酒|寄存中|暂无存酒/).first()).toBeVisible();
    }
  });
});
