/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickPosNav,
  openPosPage,
  orderListBody,
  tryHangOrder,
  tryOpenCheckout,
} from '../helpers/pos';

/**
 * 閉環：點單產生訂單意圖 → 訂單列表狀態篩選 → 制作进度核對。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 點單到廚房交接閉環', () => {
  test('1. 點單加購並嘗試結帳/掛單', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    const checkedOut = await tryOpenCheckout(page);
    if (!checkedOut) {
      await tryHangOrder(page);
    }
    await expect(page.getByText(/支付|挂单|取单|总共|商品总价|取消|确认/).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('2. 訂單列表可切換狀態並看到列表殼', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/全部|待支付|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });
    for (const label of ['待支付', '制作中', '已完成', '全部']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }
    await expect(orderListBody(page)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('3. 制作进度可切換並看到出餐操作入口', async ({ page }) => {
    await clickPosNav(page, '制作进度');
    await expect(page).toHaveURL(/\/pages\/kitchen\/index/, { timeout: 15_000 });
    await expect(page.getByText(/待制作|制作中|完成制作|重打小票|已完成/).first()).toBeVisible({
      timeout: 15_000,
    });
    for (const label of ['待制作', '制作中', '已完成']) {
      const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(label) }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(350);
      }
    }
  });
});
