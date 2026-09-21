/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { clickFilter, selectStore } from '../helpers/store';
import { expectAppShell, expectAuthenticated, expectPageReady } from '../helpers/page-checks';

/**
 * 端到端：運營人員跨模組業務閉環（讀路徑）
 * 登入 → 選門店查商品 → 篩選商品 → 看訂單 → 查會員詳情 → 看報表
 */
test.describe.configure({ mode: 'serial' });

const STORE = process.env.E2E_STORE || '珠海门店';

test.describe('E2E 門店經營閉環', () => {
  let productKeyword = '';

  test('1. 登入後選擇門店並載入商品', async ({ page }) => {
    await page.goto('/goods/list');
    await expectAuthenticated(page);
    await expectAppShell(page);

    await selectStore(page, STORE);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    // 取第一列商品資訊文字當後續搜尋關鍵字
    const cellText = (await rows.first().locator('td').nth(1).innerText()).trim();
    const keyword = cellText.split('\n').map((s) => s.trim()).find((s) => s.length >= 2) || cellText.slice(0, 10);
    expect(keyword.length, '應能讀到商品名稱').toBeGreaterThan(0);
    productKeyword = keyword.slice(0, 20);
  });

  test('2. 用商品名稱篩選，結果仍包含該商品', async ({ page }) => {
    test.skip(!productKeyword, '前一步未取得商品關鍵字');

    await page.goto('/goods/list');
    await selectStore(page, STORE);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder('商品名称').fill(productKeyword);
    await clickFilter(page);

    await expect(page.getByText(productKeyword).first()).toBeVisible({ timeout: 15_000 });
  });

  test('3. 同一門店下查看訂單列表並可篩選', async ({ page }) => {
    await page.goto('/orders/list');
    await expectAuthenticated(page);
    await selectStore(page, STORE);

    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('请输入订单编号/收货人').fill('E2E');
    await clickFilter(page);
    // 篩選後頁面仍可用：表格或空狀態
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('4. 會員列表搜尋並進入詳情', async ({ page }) => {
    await page.goto('/vip/list');
    await expectAuthenticated(page);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    const phone = (await rows.first().locator('td').nth(3).innerText()).trim();
    // 欄位順序可能變動，若非手機號則改用「查看」直接進詳情
    if (/^\d{6,}$/.test(phone)) {
      await page.getByPlaceholder('请输入手机号').fill(phone);
      await clickFilter(page);
      await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
    }

    await page.getByRole('button', { name: /查\s*看/ }).first().click();
    await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
    await expectPageReady(page);
  });

  test('5. 報表模組可正常開啟', async ({ page }) => {
    await page.goto('/report/product-sales');
    await expectAuthenticated(page);
    await expectAppShell(page);
    await expectPageReady(page);
    await expect(page.getByText(/商品销量|销量|金额/).first()).toBeVisible({ timeout: 15_000 });
  });
});
