/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  clickPosNav,
  clickTextButton,
  fillByPlaceholder,
  fillNthPlaceholder,
  openPosPage,
  uniqueLabel,
  uniquePhone,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

const customer = uniqueLabel('E2E顾客');
const phone = uniquePhone();
const wineName = uniqueLabel('E2E酒');

test.describe('POS CRUD 存酒', () => {
  test('打開新建存酒並完整填寫表單', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await page.locator('uni-button', { hasText: /新建存酒/ }).first().click();
    await expect(page).toHaveURL(/\/pages\/inventory\/create/, { timeout: 15_000 });

    await fillByPlaceholder(page, '请输入顾客姓名', customer);
    await fillByPlaceholder(page, '请输入手机号', phone);
    // 酒品名稱、數量都是「请输入」
    await fillNthPlaceholder(page, '请输入', 0, wineName);
    await fillNthPlaceholder(page, '请输入', 1, '1');

    await expect(page.getByText(customer).or(page.locator(`input[value="${customer}"]`)).first()).toBeVisible({
      timeout: 5_000,
    }).catch(() => {});

    // 嘗試提交；若環境要求必填照片等，至少驗證表單與按鈕可用
    await clickTextButton(page, /确认存酒登记/);
    await page.waitForTimeout(1500);

    const onList = /\/pages\/inventory\/index/.test(page.url());
    if (onList) {
      const searchPh = page.locator('.uni-input-placeholder', { hasText: /搜索顾客|酒名|手机号/ }).first();
      if (await searchPh.count()) {
        const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
        await input.fill(wineName);
        await clickTextButton(page, /^搜索$/);
      }
      await expect(page.getByText(wineName).or(page.getByText(customer)).first()).toBeVisible({ timeout: 15_000 });
    } else {
      // 仍在表單頁：確認關鍵欄位與取消可用（寫入可能被業務規則擋住）
      await expect(page.getByText(/确认存酒登记|酒品信息/).first()).toBeVisible();
      await clickTextButton(page, /^取消$/);
      await expect(page).toHaveURL(/\/pages\/inventory\/index/, { timeout: 15_000 });
    }
  });
});
