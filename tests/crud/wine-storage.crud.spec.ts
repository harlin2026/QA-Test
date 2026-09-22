/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { clickFilterButton, fillStable, selectStoreMenu, waitForWriteApi, expectPersisted } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

test.describe('CRUD 存酒列表', () => {
  test('查找存酒', async ({ page }) => {
    const listApi = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.ok() && /wine|storage|deposit/i.test(r.url()),
      { timeout: 15_000 },
    ).catch(() => null);

    await page.goto('/wine-storage/list');
    await expectAuthenticated(page);
    await expectAppShell(page);
    const storeItem = page.locator('.ant-menu-item', { hasText: STORE }).first();
    if (await storeItem.isVisible().catch(() => false)) await selectStoreMenu(page, STORE);

    await fillStable(page.getByPlaceholder(/客户名称|会员号/), 'E2E');
    await clickFilterButton(page);
    const resp = await listApi;
    expect(resp, '存酒列表應打到後端 API').toBeTruthy();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('更新存酒设置', async ({ page }) => {
    await page.goto('/wine-storage/setting');
    await expectAuthenticated(page);
    await selectStoreMenu(page, STORE);
    const save = page.getByRole('button', { name: '保存更改' });
    await expect(save).toBeVisible();
    const waitResp = waitForWriteApi(page, 15_000);
    await save.click();
    const resp = await waitResp;
    await expectPersisted(page, resp, '存酒設置保存');
  });
});
