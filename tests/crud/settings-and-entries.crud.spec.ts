/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';

test.describe('CRUD 設定與複雜入口', () => {
  test('更新通知', async ({ page }) => {
    await page.goto('/system/notifications');
    await expectAuthenticated(page);
    await expectAppShell(page);
    const sw = page.getByRole('switch').first();
    await expect(sw).toBeVisible();
    const before = await sw.isChecked();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'false' : 'true');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', before ? 'true' : 'false');
  });

  test('查找页面设计', async ({ page }) => {
    await page.goto('/shop/page-design');
    await expectAuthenticated(page);
    await expectPageReady(page);
    const edit = page.getByRole('button', { name: /编\s*辑|设\s*计|保\s*存|添\s*加/ }).first();
    await expect(edit.or(page.locator('canvas, .design-canvas, .page-design').first())).toBeVisible({
      timeout: 15_000,
    });
  });
});
