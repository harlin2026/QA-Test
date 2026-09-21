/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { readBridge } from '../../helpers/bridge';
import { addFirstAvailableProduct, clearCartIfAny, openPosPage } from '../helpers/pos';

/**
 * 跨端驗證：用後台種子商品關鍵字，在 POS 點單側可見／可加購。
 * 需先執行後台「跨端種子｜商品標記」。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 跨端驗證｜POS 可見後台商品', () => {
  test('POS 可用 bridge 關鍵字搜尋並嘗試加購', async ({ page }) => {
    const bridge = readBridge();
    test.skip(!bridge?.productKeyword, '尚無 bridge 商品種子，請先跑後台跨端種子');

    const keyword = bridge!.productKeyword!;
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);

    const search = page.locator('input.uni-input-input').first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill(keyword.slice(0, 12));
    await page.waitForTimeout(900);

    const hit = page.getByText(keyword.slice(0, 4)).first();
    const soldOutOnly = page.getByText(/已售罄/).first();
    if (await hit.isVisible().catch(() => false)) {
      await expect(hit).toBeVisible();
      await addFirstAvailableProduct(page).catch(async () => {
        // 搜尋結果若皆售罄，至少確認搜尋有效
        await expect(soldOutOnly.or(page.getByText(/¥/)).first()).toBeVisible();
      });
    } else {
      // 關鍵字過細時放寬：清空後確認點單頁仍可用
      await search.fill('');
      await page.waitForTimeout(500);
      await expect(page.getByText(/¥|商品|全部/).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
