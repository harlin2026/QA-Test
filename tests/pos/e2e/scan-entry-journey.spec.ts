/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickPosNav, openPosPage } from '../helpers/pos';

/**
 * 深入：掃碼入口可用性 → 回點單確認殼層。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 掃碼入口閉環', () => {
  test('1. 點單頁可見掃碼入口', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expect(page.locator('uni-button, .scan-entry', { hasText: /^扫码$/ }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('2. 點擊掃碼後頁面仍可用', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await page.locator('uni-button, .scan-entry', { hasText: /^扫码$/ }).first().click();
    await page.waitForTimeout(800);
    const close = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });

  test('3. 會員頁亦有掃碼語意可回到點單', async ({ page }) => {
    await clickPosNav(page, '会员');
    await expect(page.getByText(/请输入手机号查询|新增会员|扫码/).first()).toBeVisible({ timeout: 15_000 });
    await clickPosNav(page, '点单');
    await expect(page.getByText(/全部\(|搜索|堂食|外带/).first()).toBeVisible({ timeout: 10_000 });
  });
});
