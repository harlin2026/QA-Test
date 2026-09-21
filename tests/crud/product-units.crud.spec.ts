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

/**
 * CRUD：商品單位庫 新增 → 更新 → 刪除
 * 名稱用短字串，避免單位名稱 maxlength 截斷。
 */
test.describe.configure({ mode: 'serial' });

const unitName = `U${String(Date.now()).slice(-8)}`;
const unitNameUpdated = `U${String(Date.now()).slice(-7)}X`;
/** 後續刪除用目前實際名稱（更新成功則用新名） */
let currentName = unitName;

async function openUnitLibrary(page: Page) {
  await page.goto('/goods/product-units');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await page.getByRole('tab', { name: '单位库管理' }).click();
}

async function filterByUnitName(page: Page, name: string) {
  const input = page.getByPlaceholder('按单位名称');
  await fillStable(input, name);
  await page.locator('button.ant-btn-primary', { hasText: /^筛选$/ }).click();
  await page.waitForTimeout(400);
}

test.describe('CRUD 商品单位', () => {
  test('新增單位並可搜尋到', async ({ page }) => {
    await openUnitLibrary(page);
    await page.getByRole('button', { name: '新建单位' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await fillStable(dialog.getByPlaceholder('请输入单位名称'), unitName);
    await confirmDialogSave(page);

    await filterByUnitName(page, unitName);
    await expect(tableRow(page, unitName)).toBeVisible({ timeout: 15_000 });
    currentName = unitName;
  });

  test('更新刚建立的單位名稱', async ({ page }) => {
    await openUnitLibrary(page);
    await filterByUnitName(page, currentName);
    await expect(tableRow(page, currentName)).toBeVisible({ timeout: 15_000 });

    const row = tableRow(page, currentName);
    const editBtn = row.getByRole('button', { name: /编\s*辑|修\s*改/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await fillStable(dialog.getByPlaceholder('请输入单位名称'), unitNameUpdated);
    await confirmDialogSave(page);

    // 先確認新名稱可搜到；若不行，再確認舊名稱是否仍在（方便判斷是更新失敗）
    await filterByUnitName(page, unitNameUpdated);
    const updatedVisible = await tableRow(page, unitNameUpdated)
      .isVisible()
      .catch(() => false);
    if (!updatedVisible) {
      await filterByUnitName(page, currentName);
      const oldStillThere = await tableRow(page, currentName).isVisible().catch(() => false);
      throw new Error(
        oldStillThere
          ? '更新未落庫：舊名稱仍可搜到（不是新增沒寫入 DB，而是更新沒成功）'
          : '更新後新舊名稱都搜不到，請檢查後端寫入或列表快取',
      );
    }
    currentName = unitNameUpdated;
  });

  test('刪除剛建立的單位', async ({ page }) => {
    await openUnitLibrary(page);
    await filterByUnitName(page, currentName);
    await expect(tableRow(page, currentName)).toBeVisible({ timeout: 15_000 });

    await tableRow(page, currentName).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);

    await filterByUnitName(page, currentName);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: currentName })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
