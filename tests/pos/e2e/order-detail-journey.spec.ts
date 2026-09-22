/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickOrderStatusTab, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 訂單詳情閉環', () => {
  test('1. 訂單列表可篩選', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|已完成|订单编号/).first()).toBeVisible({ timeout: 15_000 });
    await clickOrderStatusTab(page, '全部');
    await expect(page).toHaveURL(/\/pages\/orders\/index/);
  });

  test('2. 打開訂單詳情或確認列表仍可用', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    const detail = page.locator('uni-button, uni-view', { hasText: /详情|查看详情/ }).first();
    if (await detail.isVisible().catch(() => false)) {
      await detail.click();
      await expect(page).toHaveURL(/\/pages\/orders\/detail/, { timeout: 15_000 });
      await expect(page.getByText(/订单详情|订单编号|商品|金额|支付/).first()).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await expect(page.getByText(/订单编号|暂无|堂食|自提|交易/).first()).toBeVisible();
    }
  });
});
