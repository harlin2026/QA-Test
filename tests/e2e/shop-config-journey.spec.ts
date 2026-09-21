/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable } from '../helpers/e2e';

/**
 * E2E：商城配置閉環（門店 → 頁面設計 → 小票機）
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 商城配置閉環', () => {
  test('1. 門店管理列表可用', async ({ page }) => {
    await openAppPage(page, '/shop/stores');
    await expectListUsable(page);
  });

  test('2. 進入頁面設計可編輯', async ({ page }) => {
    await openAppPage(page, '/shop/page-design');
    const edit = page.getByRole('button', { name: /编\s*辑|设\s*计|保\s*存|添\s*加/ }).first();
    await expect(edit.or(page.locator('canvas, .design-canvas, .page-design, .ant-table').first())).toBeVisible({
      timeout: 15_000,
    });
  });

  test('3. 小票機管理頁可用', async ({ page }) => {
    await openAppPage(page, '/shop/printers');
    await expect(page.locator('.ant-table, .ant-empty, button').first()).toBeVisible({ timeout: 15_000 });
  });
});
