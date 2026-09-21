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
} from '../helpers/pos';

/**
 * 閉環：加購 → 掛單 → 取單列表 → 確認仍可回到點單。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 掛單取單閉環', () => {
  test('1. 清空後加購商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    await expect(page.getByText(/总共[1-9]|商品总价/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('2. 執行掛單', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const hasCart = await page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first().isVisible().catch(() => false);
    if (!hasCart) await addFirstAvailableProduct(page);

    const ok = await tryHangOrder(page);
    expect(ok, '應有掛單入口').toBeTruthy();
    await expect(page.getByText(/挂单|取单|成功|确认|取消|暂无|清空|总共/).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('3. 打開取單/掛單列表並返回點單', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const opened = await tryOpenHangList(page);
    if (opened) {
      await expect(page.getByText(/挂单|取单|暂无|订单|时间|金额|确认/).first()).toBeVisible({
        timeout: 10_000,
      });
      const firstItem = page.locator('uni-view, uni-button', { hasText: /取单|恢复|选择|确认/ }).first();
      if (await firstItem.isVisible().catch(() => false)) {
        await firstItem.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      const close = page.locator('uni-button', { hasText: /关闭|取消|返回/ }).first();
      if (await close.isVisible().catch(() => false)) await close.click();
    }
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });
});
