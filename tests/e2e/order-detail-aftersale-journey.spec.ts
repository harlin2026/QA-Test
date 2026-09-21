/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE, openAppPage } from '../helpers/e2e';
import { clickFilter } from '../helpers/store';

/**
 * 閉環：訂單列表 → 訂單詳情 → 售後頁 → 銷量報表（讀寫入口與狀態流轉核對）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 訂單詳情與售後閉環', () => {
  let orderHint = '';

  test('1. 訂單列表篩選並打開詳情', async ({ page }) => {
    await openWithStore(page, '/orders/list', STORE);
    await expectListUsable(page);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '無訂單可看詳情');

    const text = (await rows.first().innerText()).trim();
    orderHint = text.split(/\s+/)[0]?.slice(0, 24) || '';

    const detailBtn = rows.first().getByRole('button', { name: /查\s*看|详\s*情|订单详情/ }).first();
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click();
    } else {
      await rows.first().locator('a, button').first().click();
    }

    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/订单|商品|金额|收货|支付|状态|详情|基本信息/).first(),
    ).toBeVisible({ timeout: 20_000 });

    const back = page.getByRole('button', { name: /返\s*回/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
  });

  test('2. 售後/退貨列表可按關鍵字篩選', async ({ page }) => {
    await openWithStore(page, '/orders/refund', STORE);
    await expectListUsable(page);
    const input = page.locator('input[placeholder]:visible').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(orderHint || 'E2E');
      await clickFilter(page).catch(() => {});
    }
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 訂單銷量與財務類報表可開啟', async ({ page }) => {
    await openAppPage(page, '/inventory/report/order-sales');
    await expect(page.getByText(/订单|销量|金额|统计/).first()).toBeVisible({ timeout: 15_000 });
    await openAppPage(page, '/report/cashier-stats');
    await expect(page.getByText(/收银|金额|统计|收款|支付/).first()).toBeVisible({ timeout: 15_000 });
  });
});
