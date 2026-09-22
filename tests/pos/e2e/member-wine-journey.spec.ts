/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickTextButton, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 會員與存酒', () => {
  test('1. 會員頁可開啟新增表單', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await page.locator('uni-button', { hasText: /新增会员/ }).first().click();
    await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });
    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
  });

  test('2. 新建存酒頁可填寫並取消', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await page.locator('uni-button', { hasText: /新建存酒/ }).first().click();
    await expect(page).toHaveURL(/\/pages\/inventory\/create/, { timeout: 15_000 });
    await expect(page.getByText(/确认存酒登记|酒品名称|顾客姓名/).first()).toBeVisible();
    await clickTextButton(page, /^取消$/);
    await expect(page).toHaveURL(/\/pages\/inventory\/index/, { timeout: 15_000 });
  });

  test('3. 存酒列表狀態篩選可用', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expect(page.getByText(/寄存中|即将到期|已取出/).first()).toBeVisible({ timeout: 15_000 });
    const tab = page.locator('uni-button, uni-view', { hasText: /寄存中/ }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(500);
    }
  });
});
