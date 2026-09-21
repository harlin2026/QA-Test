/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, trySearchFirstInput } from '../helpers/e2e';

/**
 * E2E：系統管理閉環（模板 → 通知 → 用戶 → 角色 → 日誌）
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 系統管理閉環', () => {
  test('1. 單據模板頁可用', async ({ page }) => {
    await openAppPage(page, '/system/receipt-template');
    await expect(
      page.locator('.ant-table, .ant-empty, button').first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('2. 通知管理可切換開關', async ({ page }) => {
    await openAppPage(page, '/system/notifications');
    const sw = page.getByRole('switch').first();
    await expect(sw).toBeVisible({ timeout: 15_000 });
    const before = await sw.isChecked();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'false' : 'true');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'true' : 'false');
  });

  test('3. 用戶管理列表可篩選', async ({ page }) => {
    await openAppPage(page, '/system/users');
    await expectListUsable(page);
    await trySearchFirstInput(page, 'admin');
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('4. 角色管理列表可用', async ({ page }) => {
    await openAppPage(page, '/system/roles');
    await expectListUsable(page);
  });

  test('5. 登錄日誌列表可用', async ({ page }) => {
    await openAppPage(page, '/system/logs');
    await expectListUsable(page);
  });
});
