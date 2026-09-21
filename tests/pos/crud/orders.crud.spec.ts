/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 訂單', () => {
  test('訂單列表可切換狀態並嘗試打開詳情', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|已完成|订单编号/).first()).toBeVisible({ timeout: 15_000 });

    const paid = page.locator('uni-button, uni-view', { hasText: /已完成|待支付|全部/ }).first();
    if (await paid.isVisible().catch(() => false)) await paid.click();

    const searchPh = page.locator('.uni-input-placeholder', { hasText: /订单编号|手机号/ }).first();
    if (await searchPh.count()) {
      const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
      await input.fill('1');
      const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
      if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
      await page.waitForTimeout(500);
    }

    const detail = page.locator('uni-button, uni-view', { hasText: /详情|查看详情/ }).first();
    if (await detail.isVisible().catch(() => false)) {
      await detail.click();
      await expect(page).toHaveURL(/\/pages\/orders\/detail/, { timeout: 15_000 });
      await expect(page.getByText(/订单详情|订单编号|商品|金额/).first()).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.getByText(/订单编号|暂无|堂食|自提|交易/).first()).toBeVisible();
    }
  });
});
