/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openInventoryOverview, openPosPage } from '../helpers/pos';

/**
 * 深入：總覽多時段 → 即時庫存 → 回總覽。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 總覽時段與庫存閉環', () => {
  test('1. 總覽切換擴展時段', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    for (const label of ['今日', '昨日', '本周', '上周', '本月', '上月', '自定义']) {
      const btn = page.locator('uni-button, uni-view, button', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
    const cancel = page.locator('uni-button, button', { hasText: /取消|关闭/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    await expect(page.getByText(/营业实收|销售金额|订单数/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 進入即時庫存總覽', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await openInventoryOverview(page);
    await expect(page.getByText(/库存总览|剩余库存|一键同步|售罄/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('3. 回到總覽確認營收殼', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收/).first()).toBeVisible({ timeout: 15_000 });
  });
});
