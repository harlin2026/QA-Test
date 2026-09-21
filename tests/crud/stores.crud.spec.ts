/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { uniqueLabel, uniquePhone } from '../helpers/crud';

const storeName = uniqueLabel('E2E门店');
const phone = uniquePhone();

async function openPage(page: Page) {
  await page.goto('/shop/stores');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 门店管理', () => {
  test('打開创建门店表單並填寫基礎欄位後取消', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: '创建门店' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('请输入名称').fill(storeName);
    await dialog.getByPlaceholder(/手机号/).fill(phone);
    await dialog.getByPlaceholder('请输入经度').fill('113.5767');
    await dialog.getByPlaceholder('请输入纬度').fill('22.2707');
    await dialog.getByPlaceholder('请输入地址').fill('E2E测试地址');
    await expect(dialog.getByPlaceholder('请输入名称')).toHaveValue(storeName);

    await dialog.getByRole('button', { name: /取\s*消/ }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  });

  test('列表具備筛选與创建入口', async ({ page }) => {
    await openPage(page);
    await expect(page.getByPlaceholder('请输入门店名称')).toBeVisible();
    await expect(page.getByRole('button', { name: '创建门店' })).toBeVisible();
    await page.getByPlaceholder('请输入门店名称').fill('珠海');
    await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
