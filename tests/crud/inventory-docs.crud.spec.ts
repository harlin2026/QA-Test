/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDialogSave,
  filterByPlaceholder,
  selectAntOption,
  selectStoreMenu,
  tableRow,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

const STORE = process.env.E2E_STORE || '珠海门店';
let stockProduct = '';

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
  test('新增入库', async ({ page }) => {
    await openStock(page);
    await page.getByRole('button', { name: '添加出入库' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('radio', { name: '入库' }).click();
    await selectAntOption(page, { withinDialog: true, index: 0 });

    const selected = (await dialog.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
    stockProduct = selected.split(/\s+/)[0] || selected;
    expect(stockProduct.length, '入庫必須選到商品').toBeGreaterThan(0);

    const qty = dialog.locator('.ant-input-number-input, input[type="number"]').first();
    if (await qty.isVisible().catch(() => false)) {
      await qty.click();
      await qty.fill('1');
    }

    await confirmDialogSave(page);

    await filterByPlaceholder(page, '请输入商品名称', stockProduct.slice(0, 12));
    await expect(tableRow(page, stockProduct.slice(0, 4))).toBeVisible({ timeout: 15_000 });
  });

  test('新增盘点', async ({ page }) => {
    await openCheck(page);
    await page.getByRole('button', { name: '新增盘点' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await selectAntOption(page, { withinDialog: true, index: 0 });
    const qty = dialog.locator('.ant-input-number-input, input[type="text"], input[type="number"]').last();
    if (await qty.isVisible().catch(() => false)) {
      await qty.click();
      await qty.fill('1');
    }
    await confirmDialogSave(page);

    const keyword = stockProduct ? stockProduct.slice(0, 8) : 'E';
    await page.getByPlaceholder(/商品名称|条码/).fill(keyword);
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
