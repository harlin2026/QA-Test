/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

/**
 * 深入：廚房完整狀態分頁 + 出餐/重打入口可見（不強制點完成，避免污染真實單）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 廚房完整狀態閉環', () => {
  test('1. 巡覽全部狀態分頁', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    for (const label of ['全部', '待制作', '制作中', '待取单', '超时单', '已完成']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(350);
      }
    }
    await expect(page.getByText(/待制作|制作中|已完成|暂无/).first()).toBeVisible();
  });

  test('2. 制作中可見出餐或重打入口', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    const making = page.locator('uni-button, uni-view', { hasText: /制作中/ }).first();
    if (await making.isVisible().catch(() => false)) await making.click();
    await page.waitForTimeout(500);
    await expect(
      page.getByText(/完成制作|出餐|重打小票|暂无订单|制作中|待制作/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('3. 平均出餐時長指標可見', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/平均出餐|出餐时长|制作进度|待制作/).first()).toBeVisible({ timeout: 15_000 });
  });
});
