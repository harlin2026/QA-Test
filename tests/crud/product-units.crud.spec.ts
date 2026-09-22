/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDestructive,
  confirmDialogSave,
  fillStable,
  tableRow,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

function newUnitName() {
  return `U${String(Date.now()).slice(-8)}`;
}

async function openUnitLibrary(page: Page) {
  await page.goto('/goods/product-units');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await page.getByRole('tab', { name: '单位库管理' }).click();
}

async function filterByUnitName(page: Page, name: string) {
  await fillStable(page.getByPlaceholder('按单位名称'), name);
  await page.locator('button.ant-btn-primary', { hasText: /^筛选$/ }).click();
  await page.waitForTimeout(400);
}

async function createUnit(page: Page, name = newUnitName()) {
  await page.getByRole('button', { name: '新建单位' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await fillStable(dialog.getByPlaceholder('请输入单位名称'), name);
  await confirmDialogSave(page);
  return name;
}

test.describe('CRUD 商品单位', () => {
  test('新增单位', async ({ page }) => {
    await openUnitLibrary(page);
    const name = await createUnit(page);
    await filterByUnitName(page, name);
    await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('查找单位', async ({ page }) => {
    await openUnitLibrary(page);
    const name = await createUnit(page);
    await filterByUnitName(page, name);
    await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('更新单位', async ({ page }) => {
    await openUnitLibrary(page);
    const name = await createUnit(page);
    const updated = `U${String(Date.now()).slice(-7)}X`;
    await filterByUnitName(page, name);
    await tableRow(page, name).getByRole('button', { name: /编\s*辑|修\s*改/ }).first().click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    await fillStable(editDialog.getByPlaceholder('请输入单位名称'), updated);
    await confirmDialogSave(page);
    await filterByUnitName(page, updated);
    await expect(tableRow(page, updated)).toBeVisible({ timeout: 15_000 });
  });

  test('删除单位', async ({ page }) => {
    await openUnitLibrary(page);
    const name = await createUnit(page);
    await filterByUnitName(page, name);
    await tableRow(page, name).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await filterByUnitName(page, name);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: name })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
