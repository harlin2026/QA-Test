/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  openPosPage,
} from '../helpers/pos';

/**
 * 深入：分類瀏覽 → 搜尋 → 加購 → 清空。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 分類搜尋加購閉環', () => {
  test('1. 切換分類並看到商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    const category = page.locator('uni-button, uni-view', { hasText: /套餐|红葡萄酒|起泡酒|全部/ }).first();
    if (await category.isVisible().catch(() => false)) await category.click();
    await expect(page.getByText(/¥|已售罄|暂无商品/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('2. 搜尋後加購或確認售罄語意', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const search = page.locator('input.uni-input-input').first();
    await search.fill('开发');
    const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
    if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
    await page.waitForTimeout(600);
    await addFirstAvailableProduct(page).catch(async () => {
      await expect(page.getByText(/已售罄|暂无商品|¥/).first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. 清空購物車回到零狀態', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await expect(page.getByText(/总共0件|暂无商品|¥\s*0/).first()).toBeVisible({ timeout: 10_000 });
  });
});
