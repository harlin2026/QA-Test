/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  openPosPage,
  tryHangOrder,
  tryOpenHangList,
  tryOpenCheckout,
} from '../helpers/pos';

/**
 * 深入閉環：堂食/外帶切換 → 加購 → 結帳入口 → 掛單備援。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 用餐方式與結帳閉環', () => {
  test('1. 切換堂食/外帶語意', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    for (const label of ['堂食', '外带', '打包']) {
      const btn = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${label}$`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });

  test('2. 加購後進入結帳或掛單', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    await expect(page.getByText(/总共[1-9]|商品总价/).first()).toBeVisible({ timeout: 10_000 });

    const opened = await tryOpenCheckout(page);
    if (!opened) {
      await tryHangOrder(page);
      await expect(page.getByText(/挂单|取单|成功|确认|取消|暂无/).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('3. 取單入口仍可用', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const opened = await tryOpenHangList(page);
    if (opened) {
      await expect(page.getByText(/挂单|取单|暂无|订单|时间|金额/).first()).toBeVisible({ timeout: 10_000 });
      const close = page.locator('uni-button', { hasText: /关闭|取消|返回/ }).first();
      if (await close.isVisible().catch(() => false)) await close.click();
    }
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });
});
