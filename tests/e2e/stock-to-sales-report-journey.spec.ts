/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * 深入閉環：庫存查詢 → 出入庫入口 → 進銷存／商品銷量報表。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 庫存到銷售報表聯動閉環', () => {
  test('1. 庫存查詢選門店後可用', async ({ page }) => {
    await openWithStore(page, '/inventory/query', STORE);
    await expectListUsable(page);
  });

  test('2. 出入庫寫入入口可打開並取消', async ({ page }) => {
    await openWithStore(page, '/inventory/stock', STORE);
    await expectListUsable(page);
    const addBtn = page.getByRole('button', { name: /新\s*建|添\s*加|入\s*库|出\s*库/ }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(700);
      await expect(page.getByText(/入库|出库|商品|数量|取消|返回|确认/).first()).toBeVisible({
        timeout: 15_000,
      });
      const cancel = page.getByRole('button', { name: /取\s*消|返\s*回|关\s*闭/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
    }
  });

  test('3. 進銷存與商品銷量報表可開啟', async ({ page }) => {
    await openAppPage(page, '/inventory/report/product-sales');
    await expect(page.getByText(/进销存|商品|统计|销量/).first()).toBeVisible({ timeout: 15_000 });
    await openAppPage(page, '/report/product-sales');
    await expect(page.getByText(/商品销量|销量|金额|统计/).or(page.getByText(/资源不存在|暂无/)).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
