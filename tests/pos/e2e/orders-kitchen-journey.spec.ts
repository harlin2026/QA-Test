/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickPosNav, clickTextButton, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 訂單與廚房', () => {
  test('1. 訂單列表可篩選狀態', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });

    const making = page.locator('uni-button, uni-view', { hasText: /制作中/ }).first();
    if (await making.isVisible().catch(() => false)) {
      await making.click();
      await page.waitForTimeout(600);
    }

    const searchPh = page.locator('.uni-input-placeholder', { hasText: /订单编号|手机号/ }).first();
    if (await searchPh.count()) {
      const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
      await input.fill('NO');
      const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
      if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
    }

    await expect(page.getByText(/订单编号|暂无|交易|堂食|自提/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 制作进度頁可查看出餐入口', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/待制作|制作中|完成制作|重打小票|已完成/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
