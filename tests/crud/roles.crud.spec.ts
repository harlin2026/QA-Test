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
 * CRUD：角色管理 新增 → 更新 → 刪除
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const roleName = `R${String(stamp).slice(-8)}`;
const roleNameUpdated = `R${String(stamp).slice(-7)}X`;
const roleCode = `e2e_r_${String(stamp).slice(-6)}`;
let currentName = roleName;

async function openPage(page: Page) {
  await page.goto('/system/roles');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function searchByName(page: Page, name: string) {
  await fillStable(page.getByRole('textbox', { name: '请输入角色名称' }).first(), name);
  await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
  await page.waitForTimeout(400);
}

test.describe('CRUD 角色管理', () => {
  test('新增角色並可搜尋', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: /添加新角色/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await fillStable(dialog.getByPlaceholder('请输入角色名称'), roleName);
    await fillStable(dialog.getByPlaceholder('请输入角色标识'), roleCode);
    await fillStable(dialog.getByPlaceholder('请输入备注内容'), 'E2E CRUD');
    await confirmDialogSave(page);

    await searchByName(page, roleName);
    await expect(tableRow(page, roleName)).toBeVisible({ timeout: 15_000 });
    currentName = roleName;
  });

  test('更新刚建立的角色名稱', async ({ page }) => {
    await openPage(page);
    await searchByName(page, currentName);
    await expect(tableRow(page, currentName)).toBeVisible({ timeout: 15_000 });

    const row = tableRow(page, currentName);
    const editBtn = row.getByRole('button', { name: /编\s*辑|修\s*改/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await fillStable(dialog.getByPlaceholder('请输入角色名称'), roleNameUpdated);
    await fillStable(dialog.getByPlaceholder('请输入备注内容'), 'E2E CRUD updated');
    await confirmDialogSave(page);

    await searchByName(page, roleNameUpdated);
    const updatedVisible = await tableRow(page, roleNameUpdated).isVisible().catch(() => false);
    if (!updatedVisible) {
      await searchByName(page, currentName);
      const oldStillThere = await tableRow(page, currentName).isVisible().catch(() => false);
      throw new Error(
        oldStillThere
          ? '更新未落庫：舊名稱仍可搜到（不是新增沒寫入 DB，而是更新沒成功）'
          : '更新後新舊名稱都搜不到，請檢查後端寫入或列表快取',
      );
    }
    currentName = roleNameUpdated;
  });

  test('刪除剛建立的角色', async ({ page }) => {
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
