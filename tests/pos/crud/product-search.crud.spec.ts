/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  clickCategoryChip,
  clickTextButton,
  dismissProductSheet,
  fillUniInput,
  openPosPage,
} from '../helpers/pos';

test.describe('POS CRUD 商品搜尋與分類', () => {
  test('查找商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await dismissProductSheet(page);
    await expect(page.getByText(/^全部(\(\d+\))?$/).first()).toBeVisible({ timeout: 15_000 });

    // 套餐常為空；搜尋會套用當前分類。切一下分類後必須回到全部
    await clickCategoryChip(page, /^套餐$/);
    await dismissProductSheet(page);
    await clickCategoryChip(page, /^全部(\(\d+\))?$/);
    await dismissProductSheet(page);

    const search = page.locator('input.uni-input-input').first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    await fillUniInput(search, 'Peterson');
    await clickTextButton(page, /^搜索$/);

    await expect(page.getByText(/Petersons/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
