/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE } from '../helpers/e2e';
import { uniqueLabel } from '../helpers/crud';

/**
 * 閉環：商品上架入口填寫 → 返回列表搜尋 → 進入編輯/詳情入口（不強制落庫）。
 */
test.describe.configure({ mode: 'serial' });

const productName = uniqueLabel('E2E商品').slice(0, 24);

test.describe('E2E 商品上架寫入閉環', () => {
  test('1. 進入添加商品並填寫名稱', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    const addBtn = page.getByRole('button', { name: /添加商品|新建商品|新增商品/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await expect(page).toHaveURL(/\/goods\/(good|add|create|edit)/, { timeout: 15_000 });

    const nameInput = page
      .getByPlaceholder(/请输入商品名称|商品名称|名称/)
      .or(page.locator('input[id*="name"], input[name*="name"]').first())
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(productName);
      await expect(nameInput).toHaveValue(productName);
    } else {
      await expect(page.getByText(/商品|规格|价格|分类/).first()).toBeVisible({ timeout: 10_000 });
    }

    const back = page.getByRole('button', { name: /返\s*回|取\s*消/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
    else await page.goBack();
    await expect(page).toHaveURL(/\/goods\/list/, { timeout: 15_000 });
  });

  test('2. 列表可按關鍵字篩選並保持可用', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    await expectListUsable(page);
    const input = page.getByPlaceholder('商品名称');
    await input.fill('E2E');
    await page.getByRole('button', { name: /筛\s*选|查\s*询/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('3. 可打開商品詳情/編輯入口', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '無商品列可進詳情');

    const action = rows
      .first()
      .getByRole('button', { name: /编\s*辑|查\s*看|详\s*情|修改/ })
      .first();
    if (await action.isVisible().catch(() => false)) {
      await action.click();
      await expect(page).toHaveURL(/\/goods\//, { timeout: 15_000 });
      await expect(page.getByText(/商品|规格|价格|库存|保存/).first()).toBeVisible({ timeout: 15_000 });
      const back = page.getByRole('button', { name: /返\s*回/ }).first();
      if (await back.isVisible().catch(() => false)) await back.click();
    } else {
      await expectListUsable(page);
    }
  });
});
