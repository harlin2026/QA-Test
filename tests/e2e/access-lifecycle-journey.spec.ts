/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, trySearchFirstInput } from '../helpers/e2e';
import { confirmDestructive, selectAntOption, tableRow, uniqueLabel, uniquePhone } from '../helpers/crud';

/**
 * 閉環：建立臨時用戶 → 搜尋驗證 → 刪除清理（權限帳號生命週期）。
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const account = `e2e_acl_${stamp}`;
const nickname = uniqueLabel('E2E权限');
const email = `e2e_acl_${stamp}@test.local`;
const phone = uniquePhone();
const password = 'Test@123456';

test.describe('E2E 帳號權限生命週期閉環', () => {
  test('1. 角色列表可用，作為權限基底', async ({ page }) => {
    await openAppPage(page, '/system/roles');
    await expectListUsable(page);
  });

  test('2. 新增臨時用戶並可搜尋', async ({ page }) => {
    await openAppPage(page, '/system/users');
    await page.getByRole('button', { name: /添加新用户/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await selectAntOption(page, { optionText: '普通人' });
    await dialog.getByPlaceholder('请输入账号').fill(account);
    await dialog.getByPlaceholder('请输入密码').fill(password);
    await dialog.getByPlaceholder('请输入昵称').fill(nickname);
    await dialog.getByPlaceholder('请输入邮箱').fill(email);
    await dialog.getByPlaceholder('请输入手机号').fill(phone);
    await dialog.getByRole('button', { name: /确\s*认/ }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    await page.getByRole('textbox', { name: '请输入账号' }).first().fill(account);
    await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });
  });

  test('3. 刪除臨時用戶並確認消失', async ({ page }) => {
    await openAppPage(page, '/system/users');
    await page.getByRole('textbox', { name: '请输入账号' }).first().fill(account);
    await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
    await expect(tableRow(page, account)).toBeVisible({ timeout: 15_000 });
    await tableRow(page, account).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await page.getByRole('textbox', { name: '请输入账号' }).first().fill(account);
    await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).click();
    await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: account })).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('4. 登錄日誌可查詢', async ({ page }) => {
    await openAppPage(page, '/system/logs');
    await expectListUsable(page);
    await trySearchFirstInput(page, 'admin');
  });
});
