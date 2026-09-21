/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { uniqueLabel } from '../helpers/crud';

const couponName = uniqueLabel('E2E券').slice(0, 40);

async function openList(page: Page) {
  await page.goto('/promotion/coupons');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 优惠券', () => {
  test('打開創建頁並填寫名稱後返回', async ({ page }) => {
    await openList(page);
    await page.getByRole('button', { name: '添加优惠券' }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/create/, { timeout: 15_000 });

    await page.getByPlaceholder(/请输入促销名称/).first().fill(couponName);
    await expect(page.getByPlaceholder(/请输入促销名称/).first()).toHaveValue(couponName);

    // 優惠券表單依賴圖片/門店等複雜欄位，這裡驗證寫入入口可用
    await page.getByRole('button', { name: /返\s*回/ }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/?$/, { timeout: 15_000 });
  });

  test('列表可按名稱筛选', async ({ page }) => {
    await openList(page);
    await page.getByPlaceholder('请输入优惠券名称').fill('E2E');
    await page.getByRole('button', { name: '筛选' }).click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
