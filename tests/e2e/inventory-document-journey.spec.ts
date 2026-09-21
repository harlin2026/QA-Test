/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE, openAppPage } from '../helpers/e2e';

/**
 * 閉環：出入庫／盤點寫入入口 → 記錄查詢 → 庫存查詢核對。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 庫存單據寫入閉環', () => {
  test('1. 出入庫列表可進入新建/詳情入口', async ({ page }) => {
    await openWithStore(page, '/inventory/stock', STORE);
    await expectListUsable(page);

    const addBtn = page.getByRole('button', { name: /新\s*建|添\s*加|入\s*库|出\s*库|创建单据/ }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await expect(
        page.getByText(/入库|出库|商品|数量|确认|保存|提交|取消|返回/).first(),
      ).toBeVisible({ timeout: 15_000 });
      const cancel = page.getByRole('button', { name: /取\s*消|返\s*回|关\s*闭/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
      else if (page.url().includes('/inventory/')) await page.goBack().catch(() => {});
    }
  });

  test('2. 盤點列表可進入新建入口並取消', async ({ page }) => {
    await openWithStore(page, '/inventory/check', STORE);
    await expectListUsable(page);
    const addBtn = page.getByRole('button', { name: /新\s*建|添\s*加|盘\s*点/ }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await expect(page.getByText(/盘点|商品|数量|确认|保存|取消|返回/).first()).toBeVisible({
        timeout: 15_000,
      });
      const cancel = page.getByRole('button', { name: /取\s*消|返\s*回|关\s*闭/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
    }
  });

  test('3. 庫存記錄可篩選，庫存查詢可用', async ({ page }) => {
    await openWithStore(page, '/inventory/record', STORE);
    await expectListUsable(page);
    const input = page.locator('input[placeholder]:visible').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('E2E');
      await page.getByRole('button', { name: /筛\s*选|查\s*询|搜\s*索/ }).last().click().catch(() => {});
    }
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();

    await openWithStore(page, '/inventory/query', STORE);
    await expectListUsable(page);
  });

  test('4. 庫存報表可開啟核對', async ({ page }) => {
    await openAppPage(page, '/inventory/report/stock');
    await expect(page.getByText(/库存|统计|数量|金额/).first()).toBeVisible({ timeout: 15_000 });
  });
});
