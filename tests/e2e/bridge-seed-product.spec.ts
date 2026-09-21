/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { writeBridge } from '../helpers/bridge';
import { openWithStore, expectListUsable, STORE } from '../helpers/e2e';
import { clickFilter } from '../helpers/store';

/**
 * 跨端種子：從後台讀取門店商品關鍵字，寫入 bridge 供 POS 驗證。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 跨端種子｜後台商品標記', () => {
  test('選門店讀取商品關鍵字並寫入 bridge', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    await expectListUsable(page);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const hasRow = (await rows.count()) > 0;
    test.skip(!hasRow, '門店無商品，無法建立跨端種子');

    const cellText = (await rows.first().locator('td').nth(1).innerText()).trim();
    const keyword =
      cellText
        .split('\n')
        .map((s) => s.trim())
        .find((s) => s.length >= 2) || cellText.slice(0, 12);
    expect(keyword.length).toBeGreaterThan(0);

    await page.getByPlaceholder('商品名称').fill(keyword.slice(0, 20));
    await clickFilter(page);
    await expect(page.getByText(keyword.slice(0, 8)).first()).toBeVisible({ timeout: 15_000 });

    writeBridge({
      store: STORE,
      productKeyword: keyword.slice(0, 20),
      note: 'admin-seed-product',
    });
  });
});
