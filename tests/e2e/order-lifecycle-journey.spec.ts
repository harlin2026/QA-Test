/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, trySearchFirstInput, STORE, openAppPage } from '../helpers/e2e';

/**
 * E2E：訂單與售後閉環
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 訂單與售後閉環', () => {
  test('1. 訂單列表選門店後可篩選', async ({ page }) => {
    await openWithStore(page, '/orders/list', STORE);
    await expectListUsable(page);
    await trySearchFirstInput(page, 'E2E');
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('2. 退貨/售後訂單列表可用', async ({ page }) => {
    await openWithStore(page, '/orders/refund', STORE);
    await expectListUsable(page);
  });

  test('3. 訂單銷量報表可開啟', async ({ page }) => {
    await openAppPage(page, '/inventory/report/order-sales');
    await expect(page.getByText(/订单|销量|金额|统计|报表/).first()).toBeVisible({ timeout: 15_000 });
  });
});
