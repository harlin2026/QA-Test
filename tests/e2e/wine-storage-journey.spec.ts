/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';
import { selectStore } from '../helpers/store';

/**
 * E2E：存酒管理閉環
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 存酒管理閉環', () => {
  test('1. 存酒列表可用', async ({ page }) => {
    await openAppPage(page, '/wine-storage/list');
    const storeItem = page.locator('.ant-menu-item', { hasText: STORE }).first();
    if (await storeItem.isVisible().catch(() => false)) {
      await selectStore(page, STORE);
    }
    await expectListUsable(page);
  });

  test('2. 存酒設置可選門店並看到保存', async ({ page }) => {
    await openAppPage(page, '/wine-storage/setting');
    const storeItem = page.locator('.ant-menu-item', { hasText: STORE }).first();
    if (await storeItem.isVisible().catch(() => false)) {
      await selectStore(page, STORE);
    }
    await expect(page.getByRole('button', { name: /保\s*存/ }).first()).toBeVisible({ timeout: 15_000 });
  });
});
