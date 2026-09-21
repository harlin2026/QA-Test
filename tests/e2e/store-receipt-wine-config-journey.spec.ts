/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * 閉環：門店配置 → 小票機 → 單據模板 → 存酒設置（前台出票/存酒依賴鏈）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 門店出票與存酒配置閉環', () => {
  test('1. 門店管理列表可用', async ({ page }) => {
    await openAppPage(page, '/shop/stores');
    await expectListUsable(page);
  });

  test('2. 小票機頁可開啟配置入口', async ({ page }) => {
    await openAppPage(page, '/shop/printers');
    await expect(page.locator('.ant-table, .ant-empty, button').first()).toBeVisible({ timeout: 15_000 });
    const addBtn = page.getByRole('button', { name: /添\s*加|新\s*建|绑定/ }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(600);
      const cancel = page.getByRole('button', { name: /取\s*消|关\s*闭|返\s*回/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
    }
  });

  test('3. 單據模板頁可用', async ({ page }) => {
    await openAppPage(page, '/system/receipt-template');
    await expect(page.locator('.ant-table, .ant-empty, button').first()).toBeVisible({ timeout: 15_000 });
  });

  test('4. 存酒設置與列表可互通', async ({ page }) => {
    await openAppPage(page, '/wine-storage/setting');
    await expect(page.getByText(/存酒|设置|保存|规则|天数/).first()).toBeVisible({ timeout: 15_000 });
    const save = page.getByRole('button', { name: /保\s*存/ }).first();
    if (await save.isVisible().catch(() => false)) {
      await expect(save).toBeEnabled();
    }

    await openWithStore(page, '/wine-storage/list', STORE).catch(async () =>
      openAppPage(page, '/wine-storage/list'),
    );
    await expectListUsable(page);
  });
});
