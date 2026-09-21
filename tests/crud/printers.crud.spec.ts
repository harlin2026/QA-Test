/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/shop/printers');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 小票机管理', () => {
  test('選門店後可見新增與绑定入口', async ({ page }) => {
    await openPage(page);
    await expect(page.getByRole('button', { name: '新增小票机' })).toBeVisible();
    await expect(page.getByRole('button', { name: /商品绑定/ })).toBeVisible();
  });

  test('點擊新增小票机後頁面仍可用', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: '新增小票机' }).click();
    // 可能彈窗、抽屜或短暫提示；最終頁面殼層仍在
    await expect(page.locator('.nav-item').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '新增小票机' }).or(page.locator('.ant-modal, .ant-drawer')).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
