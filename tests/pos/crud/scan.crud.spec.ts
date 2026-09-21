/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

test.describe('POS CRUD 掃碼入口', () => {
  test('掃碼按鈕可點擊且頁面保持可用', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const scanBtn = page.locator('uni-button.scan-entry, uni-button, .scan-entry', { hasText: /^扫码$/ }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10_000 });
    await scanBtn.click();
    await page.waitForTimeout(800);

    // 掃碼可能開相機權限彈層或無硬體時停留原頁；至少殼層仍在
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible({ timeout: 10_000 });
    const close = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  });
});
