/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickOrderStatusTab, clickPosNav, openPosPage, orderListBody } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 訂單與廚房', () => {
  test('1. 訂單列表可篩選狀態', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });

    await clickOrderStatusTab(page, '制作中');
    await expect(page).toHaveURL(/\/pages\/orders\/index/);
    await expect(orderListBody(page)).toBeVisible({ timeout: 15_000 });

    await clickOrderStatusTab(page, '全部');
    await expect(page).toHaveURL(/\/pages\/orders\/index/);
    await expect(orderListBody(page)).toBeVisible({ timeout: 15_000 });
  });

  test('2. 制作进度頁可查看出餐入口', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/待制作|制作中|完成制作|重打小票|已完成/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
