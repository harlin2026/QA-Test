/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDestructive,
  confirmDialogSave,
  fillStable,
  selectAntOption,
  tableRow,
  uniquePhone,
} from '../helpers/crud';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const account = `eu_${String(stamp).slice(-8)}`;
const nickname = `N${String(stamp).slice(-8)}`;
const nicknameUpdated = `N${String(stamp).slice(-7)}X`;
const email = `e2e_${stamp}@test.local`;
const phone = uniquePhone();
const password = 'Test@123456';
let currentNickname = nickname;

async function openPage(page: Page) {
  await page.goto('/system/users');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function searchByAccount(page: Page, value: string) {
  await fillStable(page.getByRole('textbox', { name: '请输入账号' }).first(), value);
  await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
  await page.waitForTimeout(400);
}

async function openCreateUserDialog(page: Page) {
  // 按鈕在表格下方，必要時先滾到可見
  const addBtn = page.getByRole('button', { name: /添加新用户/ });
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();

  const dialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(/添加|新增|用户/).first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
  return dialog;
}

test.describe('CRUD 用户管理', () => {
  test('新增用户並可搜尋', async ({ page }) => {
    await openPage(page);
    const dialog = await openCreateUserDialog(page);

    // 先選角色，再填欄位（下拉收起後不可再按 Escape，以免關掉彈窗）
    await selectAntOption(page, { optionText: '普通人' });
    await expect(dialog).toBeVisible();

    await fillStable(dialog.getByPlaceholder('请输入账号'), account);
    await fillStable(dialog.getByPlaceholder('请输入密码'), password);
    await fillStable(dialog.getByPlaceholder('请输入昵称'), nickname);
    await fillStable(dialog.getByPlaceholder('请输入邮箱'), email);
    await fillStable(dialog.getByPlaceholder('请输入手机号'), phone);
    await confirmDialogSave(page);

    await searchByAccount(page, account);
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });
    currentNickname = nickname;
  });

  test('更新刚建立的用户昵称', async ({ page }) => {
    await openPage(page);
    await searchByAccount(page, account);
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });

    const row = tableRow(page, account);
    const editBtn = row.getByRole('button', { name: /编\s*辑|修\s*改/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    const dialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await fillStable(dialog.getByPlaceholder('请输入昵称'), nicknameUpdated);
    await confirmDialogSave(page);

    await searchByAccount(page, account);
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });
    await expect(tableRow(page, account)).toContainText(nicknameUpdated);
    currentNickname = nicknameUpdated;
  });

  test('刪除剛建立的用户', async ({ page }) => {
    await openPage(page);
    await searchByAccount(page, account);
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });
    await expect(tableRow(page, account)).toContainText(currentNickname);
    await tableRow(page, account).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await searchByAccount(page, account);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: account })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
