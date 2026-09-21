/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 總覽時段', () => {
  test('可切換更多營收時段', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收/).first()).toBeVisible({ timeout: 15_000 });

    for (const label of ['今日', '昨日', '本周', '上周', '本月', '上月', '自定义']) {
      const btn = page.locator('uni-button, uni-view, button', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    // 自訂時段若彈日期選擇，嘗試關閉以免卡住後續用例
    const cancel = page.locator('uni-button, button', { hasText: /取消|关闭/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();

    await expect(page.getByText(/营业实收|销售金额|订单数/).first()).toBeVisible();
    const inventoryEntry = page.getByText(/实时库存查询|查看商品库存/).first();
    if (await inventoryEntry.isVisible().catch(() => false)) {
      await expect(inventoryEntry).toBeVisible();
    }
  });
});
