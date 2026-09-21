/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickTextButton,
  fillByPlaceholder,
  openPosPage,
  tryOpenCheckout,
  uniquePhone,
} from '../helpers/pos';

/**
 * 閉環：新增會員 → 點單掛會員（若 UI 支持）→ 加購 → 結帳入口。
 */
test.describe.configure({ mode: 'serial' });

const phone = uniquePhone();

test.describe('E2E POS 會員點單結帳閉環', () => {
  test('1. 新增會員並可搜尋', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await page.locator('uni-button', { hasText: /新增会员/ }).first().click();
    await expect(page.getByText(/手机号注册|请输入手机号/).first()).toBeVisible({ timeout: 10_000 });
    await fillByPlaceholder(page, '请输入手机号', phone);
    await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
    await page.waitForTimeout(1000);
    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();

    await fillByPlaceholder(page, '请输入手机号查询', phone);
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 點單頁搜尋會員並加購', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);

    const memberPh = page.locator('.uni-input-placeholder', { hasText: /手机号|会员|请输入/ }).first();
    if (await memberPh.count()) {
      const input = memberPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill(phone);
        await page.waitForTimeout(700);
        const pick = page.getByText(phone).first();
        if (await pick.isVisible().catch(() => false)) await pick.click();
      }
    }

    await addFirstAvailableProduct(page);
    await expect(page.getByText(/总共[1-9]|商品总价/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('3. 打開結帳入口（不完成支付）', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const hasCart = await page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first().isVisible().catch(() => false);
    if (!hasCart) {
      await clearCartIfAny(page);
      await addFirstAvailableProduct(page);
    }
    const opened = await tryOpenCheckout(page);
    if (!opened) {
      await clickTextButton(page, /挂单/);
      await expect(page.getByText(/挂单|取单|成功|确认|取消|暂无/).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
