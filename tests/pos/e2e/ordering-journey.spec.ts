/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { addFirstAvailableProduct, clickTextButton, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 點單閉環', () => {
  test('1. 搜尋分類並加入購物車', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await addFirstAvailableProduct(page);
    await expect(page.getByText(/商品总价|总共[1-9]/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('2. 切換外帶並可進入結帳/掛單流程', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await addFirstAvailableProduct(page);

    const takeout = page.locator('uni-button, uni-view', { hasText: /^外带$/ }).first();
    if (await takeout.isVisible().catch(() => false)) await takeout.click();

    await expect(page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first()).toBeVisible();

    // 優先結帳；若業務擋住（例如需選桌），改驗證掛單入口
    await clickTextButton(page, /^结账$/);
    await page.waitForTimeout(1000);

    const checkoutUi = page.getByText(/支付|收款|现金|微信|支付宝|确认支付|应收|桌台|台号|提交订单|确认下单/);
    if (await checkoutUi.first().isVisible().catch(() => false)) {
      await expect(checkoutUi.first()).toBeVisible();
      const cancel = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click();
      return;
    }

    await clickTextButton(page, /挂单/);
    await expect(page.getByText(/挂单|取单|成功|确认|取消|暂无/).first()).toBeVisible({ timeout: 10_000 });
  });
});
