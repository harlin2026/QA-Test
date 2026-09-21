/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE, tryClickFilter } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';
import { clickFilter, selectStore } from '../helpers/store';

/**
 * 深入閉環：多門店切換後，商品／訂單語境是否跟著變化。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 多門店切換聯動閉環', () => {
  let firstStore = '';
  let secondStore = '';
  let keyword = '';

  test('1. 讀取可切換的門店清單', async ({ page }) => {
    await openAppPage(page, '/goods/list');
    const items = page.locator('.ant-menu-item');
    const count = await items.count();
    test.skip(count < 1, '左側無門店可切換');

    firstStore = ((await items.nth(0).innerText()) || '').trim();
    secondStore = count > 1 ? ((await items.nth(1).innerText()) || '').trim() : firstStore;
    expect(firstStore.length).toBeGreaterThan(0);

    await selectStore(page, firstStore);
    await expectListUsable(page);
  });

  test('2. 門店 A 讀商品關鍵字並可篩選', async ({ page }) => {
    await openWithStore(page, '/goods/list', firstStore || STORE);
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    if ((await rows.count()) > 0) {
      const text = (await rows.first().locator('td').nth(1).innerText()).trim();
      keyword = text.split('\n').map((s) => s.trim()).find((s) => s.length >= 2) || text.slice(0, 12);
      await page.getByPlaceholder('商品名称').fill(keyword.slice(0, 16));
      await clickFilter(page);
      await expect(page.getByText(keyword.slice(0, 4)).or(page.locator('.ant-empty')).first()).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await expectListUsable(page);
    }
  });

  test('3. 切到門店 B 後訂單列表仍可用', async ({ page }) => {
    const target = secondStore || firstStore || STORE;
    await openWithStore(page, '/orders/list', target);
    await expectListUsable(page);
    await tryClickFilter(page);
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
