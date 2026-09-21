/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/wine-storage/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
  const storeItem = page.locator('.ant-menu-item', { hasText: STORE }).first();
  if (await storeItem.isVisible().catch(() => false)) {
    await selectStoreMenu(page, STORE);
  }
}

test.describe('CRUD 存酒列表', () => {
  test('可搜尋、重置並看到導出入口', async ({ page }) => {
    await openPage(page);
    await expect(page.getByPlaceholder(/客户名称|会员号/)).toBeVisible();
    await expect(page.getByRole('button', { name: /导出到 Excel|导\s*出/ })).toBeVisible();

    await page.getByPlaceholder(/客户名称|会员号/).fill('E2E');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();

    await page.getByRole('button', { name: /重\s*置/ }).click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
