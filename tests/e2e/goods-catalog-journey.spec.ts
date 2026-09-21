/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * E2E：商品目錄閉環（分類 → 篩選模型 → 單位 → 列表 → 添加商品）
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 商品目錄閉環', () => {
  test('1. 商品分類列表可用', async ({ page }) => {
    await openAppPage(page, '/goods/categories');
    await expectListUsable(page);
  });

  test('2. 篩選模型列表可用', async ({ page }) => {
    await openAppPage(page, '/goods/filter-models');
    await expectListUsable(page);
  });

  test('3. 商品單位設置可開啟', async ({ page }) => {
    await openAppPage(page, '/goods/product-units');
    const tab = page.getByRole('tab', { name: /单位/ }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
    await expect(page.locator('.ant-table, .ant-tabs, button').first()).toBeVisible({ timeout: 15_000 });
  });

  test('4. 選門店後商品列表有資料或空狀態', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    await expectListUsable(page);
  });

  test('5. 可進入添加商品頁並返回', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    const addBtn = page.getByRole('button', { name: /添加商品|新建商品|新增商品/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await expect(page).toHaveURL(/\/goods\/(good|add|create|edit)/, { timeout: 15_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/goods\/list/);
  });
});
