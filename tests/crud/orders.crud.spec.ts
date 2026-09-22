/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { clickFilterButton, selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/orders/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 訂單列表', () => {
  test('查找订单', async ({ page }) => {
    const listApi = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.ok() && /order/i.test(r.url()),
      { timeout: 15_000 },
    ).catch(() => null);

    await openPage(page);
    await page.getByPlaceholder(/订单编号|收货人/).fill('');
    await clickFilterButton(page);
    const resp = await listApi;
    expect(resp, '訂單列表應打到後端 API').toBeTruthy();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '資料庫尚無訂單（下單入口在 POS）');

    const detailBtn = rows.first().getByRole('button', { name: /查\s*看|详\s*情/ }).first();
    if (await detailBtn.isVisible().catch(() => false)) await detailBtn.click();
    else await rows.first().locator('a, button').first().click();

    await expect(page.getByText(/订单|商品|金额|支付|状态|详情/).first()).toBeVisible({ timeout: 20_000 });
    await expectPageReady(page);
  });
});
