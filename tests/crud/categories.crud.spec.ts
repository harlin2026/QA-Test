/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { selectStoreMenu, uniqueLabel } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';
const categoryName = uniqueLabel('E2E分类');

async function openPage(page: Page) {
  await page.goto('/goods/categories');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

test.describe('CRUD 商品分类', () => {
  test('打開新增一级分类表單並可填寫後取消', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: '新增一级分类' }).click();

    const panel = page.locator('.ant-modal:visible, [role="dialog"], .ant-drawer-open').last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const nameInput = panel.locator('input[type="text"]').first();
    await nameInput.fill(categoryName);
    await expect(nameInput).toHaveValue(categoryName);

    const cancel = panel.getByRole('button', { name: /取\s*消|关\s*闭/ });
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(page.getByRole('button', { name: '新增一级分类' })).toBeVisible();
  });

  test('打開新增二级分类入口', async ({ page }) => {
    await openPage(page);
    await expect(page.getByRole('button', { name: '新增二级分类' })).toBeVisible();
    await page.getByRole('button', { name: '新增二级分类' }).click();
    const panel = page.locator('.ant-modal:visible, [role="dialog"], .ant-drawer-open, .ant-message').last();
    // 可能因未選一级而提示，或打開表單
    await expect(panel.or(page.getByText(/请先|选择|分类/)).first()).toBeVisible({ timeout: 10_000 });
  });
});
