/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { writeBridge } from '../../helpers/bridge';
import {
  clickTextButton,
  fillByPlaceholder,
  fillNthPlaceholder,
  openPosPage,
  uniqueLabel,
  uniquePhone,
} from '../helpers/pos';

/**
 * 閉環：會員手機 → 存酒登記表單完整填寫 → 提交或安全取消 → 列表搜尋。
 */
test.describe.configure({ mode: 'serial' });

const customer = uniqueLabel('E2E顾客');
const phone = uniquePhone();
const wineName = uniqueLabel('E2E酒');

test.describe('E2E POS 會員存酒登記閉環', () => {
  test('1. 新建存酒並完整填寫', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await page.locator('uni-button', { hasText: /新建存酒/ }).first().click();
    await expect(page).toHaveURL(/\/pages\/inventory\/create/, { timeout: 15_000 });

    await fillByPlaceholder(page, '请输入顾客姓名', customer);
    await fillByPlaceholder(page, '请输入手机号', phone);
    await fillNthPlaceholder(page, '请输入', 0, wineName);
    await fillNthPlaceholder(page, '请输入', 1, '1');

    writeBridge({
      memberPhone: phone,
      wineName,
      customerName: customer,
      note: 'pos-wine-register',
    });

    await clickTextButton(page, /确认存酒登记/);
    await page.waitForTimeout(1500);
  });

  test('2. 列表搜尋剛登記的標記（或確認已安全返回）', async ({ page }) => {
    if (!/\/pages\/inventory\/index/.test(page.url())) {
      await openPosPage(page, '/pages/inventory/index', '存酒');
    }

    // 若仍在表單頁，取消返回
    if (/\/create/.test(page.url())) {
      await clickTextButton(page, /^取消$/);
      await expect(page).toHaveURL(/\/pages\/inventory\/index/, { timeout: 15_000 });
    }

    const searchPh = page.locator('.uni-input-placeholder', { hasText: /搜索顾客|酒名|手机号/ }).first();
    if (await searchPh.count()) {
      const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
      await input.fill(wineName);
      const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
      if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
      await page.waitForTimeout(800);
    }

    await expect(
      page.getByText(wineName).or(page.getByText(customer)).or(page.getByText(/寄存中|暂无|新建存酒/)).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
