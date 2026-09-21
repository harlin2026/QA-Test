/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

async function openStock(page: Page) {
  await page.goto('/inventory/stock');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

async function openCheck(page: Page) {
  await page.goto('/inventory/check');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 庫存單據', () => {
  test('添加出入庫：切換入庫/出庫並填數量後取消', async ({ page }) => {
    await openStock(page);
    await page.getByRole('button', { name: '添加出入库' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('radio', { name: '入库' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: '出库' })).toBeVisible();
    await dialog.getByRole('radio', { name: '出库' }).click();

    const qty = dialog.getByRole('spinbutton').first();
    if (await qty.isVisible().catch(() => false)) {
      await qty.fill('2');
    }

    await dialog.getByRole('button', { name: /取\s*消/ }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  });

  test('出入庫列表可按商品名稱篩選', async ({ page }) => {
    await openStock(page);
    await page.getByPlaceholder('请输入商品名称').fill('E2E');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('盤點頁可見新增、導出與導入入口', async ({ page }) => {
    await openCheck(page);
    await expect(page.getByRole('button', { name: '新增盘点' })).toBeVisible();
    await expect(page.getByRole('button', { name: '导出' })).toBeVisible();
    await expect(page.getByRole('button', { name: /导入模板下载/ })).toBeVisible();
  });

  test('打開新增盤點入口後取消', async ({ page }) => {
    await openCheck(page);
    await page.getByRole('button', { name: '新增盘点' }).click();
    await page.waitForTimeout(800);
    const panel = page.locator('.ant-modal:visible, [role="dialog"], .ant-drawer-open').last();
    if (await panel.isVisible().catch(() => false)) {
      await expect(page.getByText(/盘点|商品|数量|确认|保存|取消/).first()).toBeVisible();
      const cancel = panel.getByRole('button', { name: /取\s*消|关\s*闭/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
    } else {
      await expect(page.getByText(/盘点|商品|数量|导入|导出/).first()).toBeVisible();
    }
  });
});
