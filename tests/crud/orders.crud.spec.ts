/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/orders/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 訂單列表', () => {
  test('可依訂單編號篩選', async ({ page }) => {
    await openPage(page);
    await page.getByPlaceholder(/订单编号|收货人/).fill('NO');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('可打開訂單詳情後返回', async ({ page }) => {
    await openPage(page);
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '無訂單可看詳情');

    const detailBtn = rows.first().getByRole('button', { name: /查\s*看|详\s*情/ }).first();
    if (await detailBtn.isVisible().catch(() => false)) await detailBtn.click();
    else await rows.first().locator('a, button').first().click();

    await expect(page.getByText(/订单|商品|金额|支付|状态|详情/).first()).toBeVisible({ timeout: 20_000 });
    await expectPageReady(page);
    const back = page.getByRole('button', { name: /返\s*回/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
  });
});
