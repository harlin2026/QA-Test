/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

/**
 * 深入：訂單售後分頁與日期篩選閉環（不強制改單）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 訂單售後篩選閉環', () => {
  test('1. 巡覽訂單全狀態分頁', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    for (const label of ['全部', '待支付', '待制作', '制作中', '待取单', '超时单', '已完成', '售后']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(label) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(280);
      }
    }
    await expect(page.getByText(/售后|订单编号|暂无|交易|退/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 日期快捷今天/昨天可用', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    for (const label of ['今天', '昨天']) {
      const btn = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(350);
      }
    }
    await expect(page.getByText(/订单编号|暂无|堂食|自提|交易/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('3. 回到全部分頁確認列表殼', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    const all = page.locator('uni-button, uni-view', { hasText: /^全部$/ }).first();
    if (await all.isVisible().catch(() => false)) await all.click();
    await expect(page.getByText(/全部|订单编号|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });
  });
});
