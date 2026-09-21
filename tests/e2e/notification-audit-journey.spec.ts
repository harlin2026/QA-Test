/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, trySearchFirstInput } from '../helpers/e2e';

/**
 * 深入閉環：單據模板 → 用戶篩選 → 角色 → 登錄日誌（營運稽核鏈）。
 * 註：通知管理頁目前常出現「资源不存在」，故不納入此閉環起點。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 用戶稽核聯動閉環', () => {
  test('1. 單據模板頁可用', async ({ page }) => {
    await openAppPage(page, '/system/receipt-template');
    await expect(page.locator('.ant-table, .ant-empty, button').first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 用戶管理可篩選', async ({ page }) => {
    await openAppPage(page, '/system/users');
    await expectListUsable(page);
    await trySearchFirstInput(page, 'admin');
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 角色與登錄日誌可開啟', async ({ page }) => {
    await openAppPage(page, '/system/roles');
    await expectListUsable(page);
    await openAppPage(page, '/system/logs');
    await expectListUsable(page);
  });
});
