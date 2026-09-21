/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { addFirstAvailableProduct, clearCartIfAny, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 備註與會員登錄閉環', () => {
  test('1. 點單頁會員登錄入口可用', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    const loginBtn = page.locator('uni-button, uni-view', { hasText: /会员登录/ }).first();
    await expect(loginBtn).toBeVisible({ timeout: 10_000 });
    await loginBtn.click();
    await page.waitForTimeout(600);
    await expect(page.getByText(/手机号|会员|取消|确定|查询/).first()).toBeVisible({ timeout: 10_000 });
    const cancel = page.locator('uni-button', { hasText: /取消|关闭/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
  });

  test('2. 加購後備註入口可打開並關閉', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await addFirstAvailableProduct(page).catch(() => {});
    const remark = page.locator('uni-button, uni-view', { hasText: /^备注$/ }).first();
    await expect(remark).toBeVisible({ timeout: 10_000 });
    await remark.click();
    await expect(page.getByText(/备注|确定|取消|请输入/).first()).toBeVisible({ timeout: 10_000 });
    const close = page.locator('uni-button', { hasText: /取消|关闭|确定/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  });
});
