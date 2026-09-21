/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * 閉環：庫存盤點寫入入口 → 導出/導入模板 → 篩選 → 出入庫入口核對。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 庫存盤點寫入閉環', () => {
  test('1. 盤點列表可見新增、導出、導入', async ({ page }) => {
    await openWithStore(page, '/inventory/check', STORE);
    await expectListUsable(page);
    await expect(page.getByRole('button', { name: '新增盘点' })).toBeVisible();
    await expect(page.getByRole('button', { name: '导出' })).toBeVisible();
    await expect(page.getByRole('button', { name: /导入模板下载/ })).toBeVisible();
  });

  test('2. 打開新增盤點後關閉，並可篩選', async ({ page }) => {
    await openWithStore(page, '/inventory/check', STORE);
    await page.getByRole('button', { name: '新增盘点' }).click();
    await page.waitForTimeout(800);
    const panel = page.locator('.ant-modal:visible, [role="dialog"], .ant-drawer-open').last();
    if (await panel.isVisible().catch(() => false)) {
      const cancel = panel.getByRole('button', { name: /取\s*消|关\s*闭/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
      else await page.keyboard.press('Escape');
    }
    await page.getByPlaceholder(/商品名称|条码/).fill('E2E');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expectListUsable(page);
  });

  test('3. 出入庫添加入口仍可用', async ({ page }) => {
    await openWithStore(page, '/inventory/stock', STORE);
    await expect(page.getByRole('button', { name: '添加出入库' })).toBeVisible();
    await page.getByRole('button', { name: '添加出入库' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('radio', { name: '入库' })).toBeVisible();
    await dialog.getByRole('button', { name: /取\s*消/ }).click();
  });
});
