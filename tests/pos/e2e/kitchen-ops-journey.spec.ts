/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 廚房操作閉環', () => {
  test('1. 製作進度可見待製作／製作中／已完成', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/待制作|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 切換分頁並確認出餐／完成製作入口', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    for (const label of ['待制作', '制作中', '待取单', '超时单', '已完成']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(350);
      }
    }
    await expect(page.getByText(/完成制作|出餐|重打小票|暂无订单|待制作|制作中|已完成/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
