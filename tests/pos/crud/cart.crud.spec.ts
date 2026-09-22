/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  expectCartEmpty,
  expectCartHasItem,
  expectPosShell,
  openPosPage,
  selectDiningMode,
} from '../helpers/pos';

async function openOrderPage(page: import('@playwright/test').Page) {
  await openPosPage(page, '/pages/pos/index', '点单');
  await expectPosShell(page);
  await selectDiningMode(page, '堂食');
}

test.describe('POS CRUD 購物車', () => {
  test('購物車增加', async ({ page }) => {
    await openOrderPage(page);
    await clearCartIfAny(page);
    await expectCartEmpty(page);

    const name = await addFirstAvailableProduct(page);
    await expectCartHasItem(page, name);
    // 停在有商品的購物車，Dashboard 截圖才看得到右側列表
    await expect(page.getByText('暂无商品')).toHaveCount(0);
  });

  test('購物車刪除', async ({ page }) => {
    await openOrderPage(page);
    await clearCartIfAny(page);
    const name = await addFirstAvailableProduct(page);
    await expectCartHasItem(page, name);

    await clearCartIfAny(page);
    await expectCartEmpty(page);
  });
});
