/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { writeBridge } from '../../helpers/bridge';
import {
  clickTextButton,
  fillByPlaceholder,
  openPosPage,
  uniquePhone,
} from '../helpers/pos';

/**
 * 跨端種子：POS 新增會員，寫入 bridge 供後台驗證。
 */
test.describe.configure({ mode: 'serial' });

const phone = uniquePhone();

test.describe('E2E 跨端種子｜POS 會員', () => {
  test('新增會員並寫入 bridge', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await page.locator('uni-button.member-add-button, uni-button', { hasText: /新增会员/ }).first().click();
    await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });
    await fillByPlaceholder(page, '请输入手机号', phone);
    await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
    await page.waitForTimeout(1200);

    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();

    await fillByPlaceholder(page, '请输入手机号查询', phone);
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });

    writeBridge({ memberPhone: phone, note: 'pos-seed-member' });
  });
});
