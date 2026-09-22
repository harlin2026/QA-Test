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
  uniqueLabel,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

async function openPage(page: Page) {
  await page.goto('/goods/filter-models');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function searchByName(page: Page, name: string) {
  await fillStable(page.getByRole('textbox', { name: '请输入筛选名称' }).first(), name);
  await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
  await page.waitForTimeout(400);
}

async function selectFirstFilterType(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.locator('.ant-select-selector').first().click();
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  await dropdown.locator('.ant-select-item-option').first().click();
}

async function createFilter(page: Page, name = uniqueLabel('E2E筛选')) {
  await page.getByRole('button', { name: /添加数据/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await fillStable(dialog.getByPlaceholder('请输入筛选名称'), name);
  await selectFirstFilterType(page);
  await fillStable(dialog.getByPlaceholder(/多个筛选值/), 'red,blue');
  await confirmDialogSave(page);
  return name;
}

test.describe('CRUD 筛选模型', () => {
  test('新增筛选模型', async ({ page }) => {
    await openPage(page);
    const name = await createFilter(page);
    await searchByName(page, name);
    await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('查找筛选模型', async ({ page }) => {
    await openPage(page);
    const name = await createFilter(page);
    await searchByName(page, name);
    await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('更新筛选模型', async ({ page }) => {
    await openPage(page);
    const name = await createFilter(page);
    const updated = `${name}-U`;
    await searchByName(page, name);
    await tableRow(page, name).getByRole('button', { name: /编\s*辑|修\s*改/ }).first().click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    await fillStable(editDialog.getByPlaceholder('请输入筛选名称'), updated);
    await confirmDialogSave(page);
    await searchByName(page, updated);
    await expect(tableRow(page, updated)).toBeVisible({ timeout: 15_000 });
  });

  test('删除筛选模型', async ({ page }) => {
    await openPage(page);
    const name = await createFilter(page);
    await searchByName(page, name);
    await tableRow(page, name).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await searchByName(page, name);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: name })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
