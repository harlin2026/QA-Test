/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickPosNav, openPosPage } from '../helpers/pos';

/**
 * 深入閉環：總覽營收看板 → 點單 → 廚房 → 回總覽（班次中段巡航）。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 總覽到出餐巡航閉環', () => {
  test('1. 總覽切換時段並看到核心指標', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收|订单数/).first()).toBeVisible({ timeout: 15_000 });
    for (const label of ['今日', '昨日', '本周']) {
      const btn = page.locator('uni-button, uni-view, button', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(350);
      }
    }
  });

  test('2. 前往點單確認商品區可用', async ({ page }) => {
    await clickPosNav(page, '点单');
    await expect(page.getByText(/¥|全部|商品/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('3. 制作进度後回到總覽', async ({ page }) => {
    await clickPosNav(page, '制作进度');
    await expect(page.getByText(/待制作|制作中|完成制作|重打小票/).first()).toBeVisible({ timeout: 15_000 });
    await clickPosNav(page, '总览');
    await expect(page.getByText(/实时营收概览|营业实收|订单数/).first()).toBeVisible({ timeout: 15_000 });
  });
});
