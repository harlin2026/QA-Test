/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { selectStoreMenu, uniqueLabel } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';
const productName = uniqueLabel('E2E商品').slice(0, 24);

async function openPage(page: Page) {
  await page.goto('/goods/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 商品列表', () => {
  test('可見添加、排序與批量操作入口', async ({ page }) => {
    await openPage(page);
    await expect(page.getByRole('button', { name: '添加商品' })).toBeVisible();
    await expect(page.getByRole('button', { name: /排\s*序/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '批量上架' })).toBeVisible();
    await expect(page.getByRole('button', { name: '批量下架' })).toBeVisible();
    await expect(page.getByRole('button', { name: '批量复制' })).toBeVisible();
  });

  test('打開添加商品頁並填寫名稱後返回', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: '添加商品' }).click();
    await expect(page).toHaveURL(/\/goods\/good/, { timeout: 15_000 });
    await expectPageReady(page);

    const nameInput = page.getByPlaceholder(/请输入商品名称|商品名称/).first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(productName);
      await expect(nameInput).toHaveValue(productName);
    } else {
      await expect(page.getByText(/商品|规格|价格|分类/).first()).toBeVisible({ timeout: 10_000 });
    }

    const back = page.getByRole('button', { name: /返\s*回|取\s*消/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
    else await page.goBack();
    await expect(page).toHaveURL(/\/goods\/list/, { timeout: 15_000 });
  });

  test('可按商品名稱篩選', async ({ page }) => {
    await openPage(page);
    await page.getByPlaceholder('商品名称').fill('E2E');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
