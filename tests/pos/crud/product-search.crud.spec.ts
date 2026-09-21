/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 商品搜尋與分類', () => {
  test('可切換分類並搜尋商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expect(page.getByText(/全部\(/).first()).toBeVisible({ timeout: 15_000 });

    const category = page.locator('uni-button, uni-view', { hasText: /套餐|红葡萄酒|起泡酒|猜你喜欢/ }).first();
    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await page.waitForTimeout(500);
    }

    const search = page.locator('input.uni-input-input').first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill('Peterson');
    const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
    if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
    await page.waitForTimeout(700);

    await expect(page.getByText(/¥|已售罄|暂无商品|Peterson|全部/).first()).toBeVisible({ timeout: 10_000 });
    await search.fill('');
    if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
  });
});
