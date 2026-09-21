/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clickPosNav,
  clickTextButton,
  fillByPlaceholder,
  openPosPage,
  uniquePhone,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

const phone = uniquePhone();

test.describe('POS CRUD 會員', () => {
  test('新增會員並可搜尋到', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');

    await page.locator('uni-button.member-add-button, uni-button', { hasText: /新增会员/ }).first().click();
    await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });

    // 只填彈層內手機號（最後一個「请输入手机号」）
    await fillByPlaceholder(page, '请输入手机号', phone);
    await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
    await page.waitForTimeout(1200);

    // 關閉殘留彈層
    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();

    await fillByPlaceholder(page, '请输入手机号查询', phone);
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
  });
});
