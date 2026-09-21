/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, trySearchFirstInput } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';
import { clickFilter } from '../helpers/store';

/**
 * E2E：會員 → 積分 → 優惠券 → 統計
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 會員積分促銷閉環', () => {
  test('1. 會員列表可搜尋並進入詳情', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    await expectListUsable(page);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    if ((await rows.count()) > 0) {
      const phone = (await rows.first().locator('td').nth(3).innerText()).trim();
      if (/^\d{6,}$/.test(phone)) {
        await page.getByPlaceholder('请输入手机号').fill(phone);
        await clickFilter(page);
        await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
      }
      await page.getByRole('button', { name: /查\s*看/ }).first().click();
      await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
      await expectPageReady(page);
    }
  });

  test('2. 積分列表可篩選', async ({ page }) => {
    await openAppPage(page, '/points/list');
    await expectListUsable(page);
    await trySearchFirstInput(page, '1');
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 積分設置頁可開啟', async ({ page }) => {
    await openAppPage(page, '/points/setting');
    await expect(page.locator('input, .ant-switch, textarea, button').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('4. 優惠券列表可用', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await expectListUsable(page);
  });

  test('5. 優惠券統計與會員餘額統計可開啟', async ({ page }) => {
    await openAppPage(page, '/report/coupon-stats');
    await expect(page.getByText(/优惠券|统计|数量|金额/).first()).toBeVisible({ timeout: 15_000 });

    await openAppPage(page, '/report/member-balance-stats');
    await expect(page.getByText(/会员|余额|统计|金额/).first()).toBeVisible({ timeout: 15_000 });
  });
});
