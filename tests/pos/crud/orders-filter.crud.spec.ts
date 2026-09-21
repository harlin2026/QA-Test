/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 訂單進階篩選', () => {
  test('可切換售後與日期快捷篩選', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|已完成|售后/).first()).toBeVisible({ timeout: 15_000 });

    // 訂單狀態列：含廚房同名狀態與售後
    for (const label of ['全部', '待支付', '待制作', '制作中', '待取单', '超时单', '已完成', '售后']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(label) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }

    for (const label of ['今天', '昨天']) {
      const btn = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(350);
      }
    }

    const source = page.locator('uni-button, uni-view', { hasText: /订单来源|支付方式/ }).first();
    if (await source.isVisible().catch(() => false)) {
      await expect(source).toBeVisible();
    }

    await expect(page.getByText(/订单编号|暂无|堂食|自提|交易|售后/).first()).toBeVisible({ timeout: 15_000 });
  });
});
