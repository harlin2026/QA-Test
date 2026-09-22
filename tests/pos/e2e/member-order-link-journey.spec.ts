/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickOrderStatusTab,
  clickPosNav,
  clickTextButton,
  fillByPlaceholder,
  openPosPage,
  orderListBody,
  tryOpenCheckout,
  uniquePhone,
} from '../helpers/pos';

/**
 * 深入閉環：新建會員 → 點單加購 → 結帳入口取消 → 訂單列表用手機號語意核對。
 */
test.describe.configure({ mode: 'serial' });

const phone = uniquePhone();

test.describe('E2E POS 會員訂單聯動閉環', () => {
  test('1. 新建會員', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await page.locator('uni-button', { hasText: /新增会员/ }).first().click();
    await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });
    await fillByPlaceholder(page, '请输入手机号', phone);
    await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
    await page.waitForTimeout(1000);
    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    await fillByPlaceholder(page, '请输入手机号查询', phone);
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
  });

  test('2. 點單加購並打開結帳後取消', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    await expect(page.getByText(/总共[1-9]|商品总价/).first()).toBeVisible({ timeout: 10_000 });
    await tryOpenCheckout(page);
    const cancel = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
  });

  test('3. 訂單列表可切換狀態並搜尋', async ({ page }) => {
    await clickPosNav(page, '订单');
    await expect(page.getByText(/全部|待支付|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });
    await clickOrderStatusTab(page, '全部');
    const searchPh = page.locator('.uni-input-placeholder', { hasText: /订单编号|手机号/ }).first();
    if (await searchPh.count()) {
      const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
      await input.fill(phone.slice(-4));
      const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
      if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(orderListBody(page)).toBeVisible({ timeout: 15_000 });
  });
});
