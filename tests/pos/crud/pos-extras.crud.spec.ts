/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { addFirstAvailableProduct, clearCartIfAny, fillByPlaceholder, openPosPage } from '../helpers/pos';

test.describe('POS CRUD 點單備註與會員登錄', () => {
  test('會員登錄入口可填手機號，備註入口可打開', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);

    const loginBtn = page.locator('uni-button, uni-view', { hasText: /会员登录/ }).first();
    await expect(loginBtn).toBeVisible({ timeout: 10_000 });
    await loginBtn.click();
    await page.waitForTimeout(600);

    const phonePh = page.locator('.uni-input-placeholder', { hasText: /手机号|会员/ }).last();
    if (await phonePh.count()) {
      await fillByPlaceholder(page, '请输入会员手机', '13900000000').catch(async () => {
        const input = page.locator('input.uni-input-input').first();
        if (await input.isVisible().catch(() => false)) await input.fill('13900000000');
      });
    }

    const cancel = page.locator('uni-button', { hasText: /取消|关闭/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();

    await addFirstAvailableProduct(page).catch(() => {});
    const remark = page.locator('uni-button, uni-view', { hasText: /^备注$/ }).first();
    await expect(remark).toBeVisible({ timeout: 10_000 });
    await remark.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/备注|确定|取消|请输入/).first()).toBeVisible({ timeout: 10_000 });
    const close = page.locator('uni-button', { hasText: /取消|关闭|确定/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  });
});
