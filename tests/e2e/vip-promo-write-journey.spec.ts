/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, tryClickFilter, openWithStore, STORE } from '../helpers/e2e';
import { clickFilter } from '../helpers/store';

/**
 * 閉環：會員列表 → 詳情 → 積分相關頁 → 促銷券寫入入口 → 統計核對。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 會員積分促銷寫入閉環', () => {
  let memberHint = '';

  test('1. 會員列表搜尋並進入詳情', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    await expectListUsable(page);
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '無會員資料');

    const raw = (await rows.first().innerText()).trim();
    const phone = raw.match(/1\d{10}/)?.[0];
    if (phone) {
      memberHint = phone;
      await page.getByPlaceholder(/请输入手机号/).fill(phone);
      await clickFilter(page);
      await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
    }

    await page.getByRole('button', { name: /查\s*看/ }).first().click();
    await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
    await expect(page.getByText(/会员|积分|余额|手机|基本信息/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 積分列表與設置可操作並還原', async ({ page }) => {
    await openAppPage(page, '/points/list');
    await expectListUsable(page);
    await tryClickFilter(page);

    await openAppPage(page, '/points/setting');
    const sw = page.getByRole('switch').first();
    if (await sw.isVisible().catch(() => false)) {
      const before = await sw.isChecked();
      await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', before ? 'false' : 'true');
      await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', before ? 'true' : 'false');
    } else {
      await expect(page.getByText(/积分|规则|设置|保存/).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('3. 優惠券創建入口可填寫後返回，列表可篩選', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await page.getByRole('button', { name: /添加优惠券/ }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/create/, { timeout: 15_000 });
    const name = page.getByPlaceholder(/请输入促销名称/).first();
    if (await name.isVisible().catch(() => false)) {
      await name.fill(`E2E券-${Date.now()}`.slice(0, 30));
    }
    await page.getByRole('button', { name: /返\s*回/ }).click();
    await expect(page).toHaveURL(/\/promotion\/coupons\/?$/, { timeout: 15_000 });

    await page.getByPlaceholder('请输入优惠券名称').fill('E2E');
    await page.getByRole('button', { name: '筛选' }).click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('4. 會員餘額／優惠券統計可開啟', async ({ page }) => {
    await openAppPage(page, '/report/member-balance-stats');
    await expect(page.getByText(/余额|会员|统计|金额/).first()).toBeVisible({ timeout: 15_000 });
    await openAppPage(page, '/report/coupon-stats');
    await expect(page.getByText(/优惠券|统计|领取|核销|金额/).first()).toBeVisible({ timeout: 15_000 });
    if (memberHint) {
      await openWithStore(page, '/orders/list', STORE).catch(async () => openAppPage(page, '/orders/list'));
    }
  });
});
