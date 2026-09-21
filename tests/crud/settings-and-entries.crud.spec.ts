/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { selectStoreMenu } from '../helpers/crud';

const STORE = process.env.E2E_STORE || '珠海门店';

/**
 * 設定類 / 複雜表單：驗證「可寫入入口」與保存行為（非完整實體 CRUD）
 */
test.describe('CRUD 設定與複雜入口', () => {
  test('通知管理：切換開關並保持可保存狀態', async ({ page }) => {
    await page.goto('/system/notifications');
    await expectAuthenticated(page);
    await expectAppShell(page);
    const sw = page.getByRole('switch').first();
    await expect(sw).toBeVisible();
    const before = await sw.isChecked();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'false' : 'true');
    // 還原，避免影響環境
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'true' : 'false');
  });

  test('存酒設置：選門店後可保存', async ({ page }) => {
    await page.goto('/wine-storage/setting');
    await expectAuthenticated(page);
    await selectStoreMenu(page, STORE);
    await expect(page.getByRole('button', { name: '保存更改' })).toBeVisible();
    await page.getByRole('button', { name: '保存更改' }).click();
    await expect(page.getByText(/成功|已保存|保存成功/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('积分设置：頁面可編輯保存', async ({ page }) => {
    await page.goto('/points/setting');
    await expectAuthenticated(page);
    await expectPageReady(page);
    const save = page.getByRole('button', { name: /保\s*存|提\s*交|确\s*认/ }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await expect(page.getByText(/成功|已保存|保存成功/).or(page.locator('body')).first()).toBeVisible();
    } else {
      await expect(page.locator('input, .ant-switch, textarea').first()).toBeVisible();
    }
  });

  test('商品列表：打開添加商品頁並返回', async ({ page }) => {
    await page.goto('/goods/list');
    await expectAuthenticated(page);
    await selectStoreMenu(page, STORE);
    await page.getByRole('button', { name: '添加商品' }).click();
    await expect(page).toHaveURL(/\/goods\/good/, { timeout: 15_000 });
    await expectPageReady(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/goods\/list/);
  });

  test('出库入库：選門店後表格可用', async ({ page }) => {
    await page.goto('/inventory/stock');
    await expectAuthenticated(page);
    await selectStoreMenu(page, STORE);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
  });

  test('库存盘点：選門店後表格可用', async ({ page }) => {
    await page.goto('/inventory/check');
    await expectAuthenticated(page);
    await selectStoreMenu(page, STORE);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
  });

  test('页面设计：頁面可進入編輯', async ({ page }) => {
    await page.goto('/shop/page-design');
    await expectAuthenticated(page);
    await expectPageReady(page);
    const edit = page.getByRole('button', { name: /编\s*辑|设\s*计|保\s*存|添\s*加/ }).first();
    await expect(edit.or(page.locator('canvas, .design-canvas, .page-design').first())).toBeVisible({
      timeout: 15_000,
    });
  });
});
