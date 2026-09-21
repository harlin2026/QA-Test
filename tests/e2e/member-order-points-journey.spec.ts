/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openWithStore, expectListUsable, STORE } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';

/**
 * 閉環：會員詳情 → 訂單列表 → 積分列表（會員消費與積分可互相核對入口）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 會員訂單積分聯動閉環', () => {
  test('1. 會員列表可進入詳情', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    await expectListUsable(page);
    const viewBtn = page.getByRole('button', { name: /查\s*看/ }).first();
    test.skip(!(await viewBtn.isVisible().catch(() => false)), '無會員可查看');
    await viewBtn.click();
    await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
    await expectPageReady(page);
    await expect(page.getByText(/会员|手机|积分|余额|消费|订单/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 訂單列表可篩選該門店資料', async ({ page }) => {
    await openWithStore(page, '/orders/list', STORE);
    await expectListUsable(page);
    await page.getByPlaceholder(/订单编号|收货人/).fill('1');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 積分列表與積分設置可開啟', async ({ page }) => {
    await openAppPage(page, '/points/list');
    await expectListUsable(page);
    await openAppPage(page, '/points/setting');
    await expect(page.locator('input, .ant-switch, textarea, button').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
