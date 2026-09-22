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

test.describe.configure({ timeout: 180_000 });

function newUser() {
  const stamp = Date.now();
  return {
    account: `eu_${String(stamp).slice(-8)}`,
    nickname: `N${String(stamp).slice(-8)}`,
    nicknameUpdated: `N${String(stamp).slice(-7)}X`,
    email: `e2e_${stamp}@test.local`,
    phone: uniquePhone(),
    password: 'Test@123456',
  };
}

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
  const addBtn = page.getByRole('button', { name: /添加新用户/ });
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();
  const dialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  return dialog;
}

async function createUser(page: Page) {
  const user = newUser();
  const dialog = await openCreateUserDialog(page);
  await selectAntOption(page, { optionText: '普通人' });
  await expect(dialog).toBeVisible();
  await fillStable(dialog.getByPlaceholder('请输入账号'), user.account);
  await fillStable(dialog.getByPlaceholder('请输入密码'), user.password);
  await fillStable(dialog.getByPlaceholder('请输入昵称'), user.nickname);
  await fillStable(dialog.getByPlaceholder('请输入邮箱'), user.email);
  await fillStable(dialog.getByPlaceholder('请输入手机号'), user.phone);
  await confirmDialogSave(page);
  return user;
}

test.describe('CRUD 用户管理', () => {
  test('新增用户', async ({ page }) => {
    await openPage(page);
    const user = await createUser(page);
    await searchByAccount(page, user.account);
    await expect(tableRow(page, user.account)).toBeVisible({ timeout: 15_000 });
  });

  test('查找用户', async ({ page }) => {
    await openPage(page);
    const user = await createUser(page);
    await searchByAccount(page, user.account);
    await expect(tableRow(page, user.account)).toBeVisible({ timeout: 15_000 });
    await expect(tableRow(page, user.account)).toContainText(user.nickname);
  });

  test('更新用户', async ({ page }) => {
    await openPage(page);
    const user = await createUser(page);
    await searchByAccount(page, user.account);
    await expect(tableRow(page, user.account)).toBeVisible({ timeout: 15_000 });

    await tableRow(page, user.account).getByRole('button', { name: /编\s*辑|修\s*改/ }).first().click();
    const editDialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    await fillStable(editDialog.getByPlaceholder('请输入昵称'), user.nicknameUpdated);
    await confirmDialogSave(page);

    await searchByAccount(page, user.account);
    await expect(tableRow(page, user.account)).toContainText(user.nicknameUpdated);
  });

  test('删除用户', async ({ page }) => {
    await openPage(page);
    const user = await createUser(page);
    await searchByAccount(page, user.account);
    await expect(tableRow(page, user.account)).toBeVisible({ timeout: 15_000 });

    await tableRow(page, user.account).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await searchByAccount(page, user.account);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: user.account })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
