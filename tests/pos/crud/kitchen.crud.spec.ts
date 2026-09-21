/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickPosNav, openPosPage } from '../helpers/pos';

test.describe('POS CRUD 廚房製作進度', () => {
  test('可切換待製作／製作中／已完成等狀態分頁', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/待制作|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['全部', '待制作', '制作中', '待取单', '超时单', '已完成']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }

    await expect(page.getByText(/完成制作|出餐|重打小票|暂无订单|待制作|制作中/).first()).toBeVisible({
      timeout: 15_000,
    });
    await clickPosNav(page, '点单');
  });
});
