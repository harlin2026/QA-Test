/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDestructive,
  confirmDialogSave,
  fillStable,
  tableRow,
  uniqueLabel,
} from '../helpers/crud';

/**
 * CRUD：篩選模型 新增 → 更新 → 刪除
 */
test.describe.configure({ mode: 'serial' });

const filterName = uniqueLabel('E2E筛选');
const filterNameUpdated = `${filterName}-U`;
const filterValue = 'red,blue';
let currentName = filterName;

async function openPage(page: import('@playwright/test').Page) {
  await page.goto('/goods/filter-models');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function searchByName(page: import('@playwright/test').Page, name: string) {
  await fillStable(page.getByRole('textbox', { name: '请输入筛选名称' }).first(), name);
  await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
  await page.waitForTimeout(400);
}

async function selectFirstFilterType(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog');
  await dialog.locator('.ant-select-selector').first().click();
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  await dropdown.locator('.ant-select-item-option').first().click();
}

test.describe('CRUD 筛选模型', () => {
  test('新增並可搜尋', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: /添加数据/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await fillStable(dialog.getByPlaceholder('请输入筛选名称'), filterName);
    await selectFirstFilterType(page);
    await fillStable(dialog.getByPlaceholder(/多个筛选值/), filterValue);
    await confirmDialogSave(page);

    await searchByName(page, filterName);
    await expect(tableRow(page, filterName)).toBeVisible({ timeout: 15_000 });
    currentName = filterName;
  });

  test('更新刚建立的筛选名称', async ({ page }) => {
    await openPage(page);
    await searchByName(page, currentName);
    await expect(tableRow(page, currentName)).toBeVisible({ timeout: 15_000 });

    const row = tableRow(page, currentName);
    const editBtn = row.getByRole('button', { name: /编\s*辑|修\s*改/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await fillStable(dialog.getByPlaceholder('请输入筛选名称'), filterNameUpdated);
    await confirmDialogSave(page);

    await searchByName(page, filterNameUpdated);
    const updatedVisible = await tableRow(page, filterNameUpdated).isVisible().catch(() => false);
    if (!updatedVisible) {
      await searchByName(page, currentName);
      const oldStillThere = await tableRow(page, currentName).isVisible().catch(() => false);
      throw new Error(
        oldStillThere
          ? '更新未落庫：舊名稱仍可搜到（不是新增沒寫入 DB，而是更新沒成功）'
          : '更新後新舊名稱都搜不到，請檢查後端寫入或列表快取',
      );
    }
    currentName = filterNameUpdated;
  });

  test('刪除剛建立的資料', async ({ page }) => {
    await openPage(page);
    await searchByName(page, currentName);
    await expect(tableRow(page, currentName)).toBeVisible({ timeout: 15_000 });

    await tableRow(page, currentName).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);

    await searchByName(page, currentName);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: currentName })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
