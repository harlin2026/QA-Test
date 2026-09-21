/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE, openAppPage } from '../helpers/e2e';

/**
 * E2E：庫存運營閉環
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 庫存運營閉環', () => {
  test('1. 庫存查詢選門店後可用', async ({ page }) => {
    await openWithStore(page, '/inventory/query', STORE);
    await expectListUsable(page);
  });

  test('2. 出庫入庫列表可用', async ({ page }) => {
    await openWithStore(page, '/inventory/stock', STORE);
    await expectListUsable(page);
  });

  test('3. 庫存盤點列表可用', async ({ page }) => {
    await openWithStore(page, '/inventory/check', STORE);
    await expectListUsable(page);
  });

  test('4. 庫存記錄列表可用', async ({ page }) => {
    await openWithStore(page, '/inventory/record', STORE);
    await expectListUsable(page);
  });

  test('5. 庫存相關報表可開啟', async ({ page }) => {
    await openAppPage(page, '/inventory/report/stock');
    await expect(page.getByText(/库存|统计|数量|金额/).first()).toBeVisible({ timeout: 15_000 });

    await openAppPage(page, '/inventory/report/product-sales');
    await expect(page.getByText(/进销存|商品|统计|销量/).first()).toBeVisible({ timeout: 15_000 });

    await openAppPage(page, '/inventory/report/finance-receipts');
    await expect(page.getByText(/财务|收款|金额|统计/).first()).toBeVisible({ timeout: 15_000 });
  });
});
