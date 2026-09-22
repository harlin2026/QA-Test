/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickOrderStatusTab, fillUniInput, openPosPage } from '../helpers/pos';

test.describe('POS CRUD 訂單', () => {
  test('订单查询', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expect(page.getByText(/订单编号：/).first()).toBeVisible({ timeout: 15_000 });
    await clickOrderStatusTab(page, '全部');

    const orderNo = page.getByText(/NO\d{8,}/).first();
    await expect(orderNo, '訂單列表應有可查的單號').toBeVisible({ timeout: 10_000 });
    const raw = ((await orderNo.innerText()) || '').match(/NO\d{10,}/)?.[0] || '';
    expect(raw, '應讀到完整訂單編號').toMatch(/^NO\d{10,}$/);

    const searchPh = page.locator('.uni-input-placeholder', { hasText: /订单编号|手机号|搜索/ }).first();
    const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
    await fillUniInput((await input.count()) ? input : page.locator('input.uni-input-input').first(), raw);
    await page.keyboard.press('Enter');

    await expect(page.getByText(raw).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('暂无订单')).toHaveCount(0);
  });
});
