/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * 深入閉環：促銷券入口 → 訂單側核對 → 優惠券／收銀統計。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 促銷訂單報表聯動閉環', () => {
  test('1. 優惠券列表可篩選並進入創建入口', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await expectListUsable(page);
    await page.getByPlaceholder('请输入优惠券名称').fill('E2E');
    await page.getByRole('button', { name: '筛选' }).click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();

    await page.getByRole('button', { name: /添加优惠券/ }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/create/, { timeout: 15_000 });
    await expect(page.getByText(/促销|优惠券|名称|门店/).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /返\s*回/ }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/?$/, { timeout: 15_000 });
  });

  test('2. 訂單列表可篩選，作為核銷側入口', async ({ page }) => {
    await openWithStore(page, '/orders/list', STORE);
    await expectListUsable(page);
    const input = page.getByPlaceholder(/订单编号|收货人/);
    if (await input.isVisible().catch(() => false)) {
      await input.fill('E2E');
      await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    }
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 優惠券統計與收銀統計可開啟', async ({ page }) => {
    await openAppPage(page, '/report/coupon-stats');
    await expect(page.getByText(/优惠券|统计|领取|核销|金额/).first()).toBeVisible({ timeout: 15_000 });
    await openAppPage(page, '/report/cashier-stats');
    await expect(page.getByText(/收银|金额|统计|支付|收款/).first()).toBeVisible({ timeout: 15_000 });
  });
});
