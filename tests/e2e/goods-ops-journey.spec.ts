/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openWithStore, expectListUsable, STORE } from '../helpers/e2e';

/**
 * 閉環：商品列表操作入口 → 添加商品填寫 → 返回篩選 → 批量/排序仍可用。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 商品列表運營閉環', () => {
  test('1. 列表具備添加、排序、批量入口', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    await expectListUsable(page);
    await expect(page.getByRole('button', { name: '添加商品' })).toBeVisible();
    await expect(page.getByRole('button', { name: /排\s*序/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '批量上架' })).toBeVisible();
    await expect(page.getByRole('button', { name: '批量复制' })).toBeVisible();
  });

  test('2. 打開排序或批量複製入口後關閉', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    const sortBtn = page.getByRole('button', { name: /排\s*序/ });
    await sortBtn.click();
    await page.waitForTimeout(700);
    const panel = page.locator('.ant-modal:visible, [role="dialog"], .ant-drawer-open').last();
    if (await panel.isVisible().catch(() => false)) {
      const close = panel.getByRole('button', { name: /取\s*消|关\s*闭|完\s*成|确\s*定/ }).first();
      if (await close.isVisible().catch(() => false)) await close.click();
      else await page.keyboard.press('Escape');
    }
    await expect(page.getByRole('button', { name: '添加商品' })).toBeVisible();
  });

  test('3. 添加商品頁可開啟並返回列表篩選', async ({ page }) => {
    await openWithStore(page, '/goods/list', STORE);
    await page.getByRole('button', { name: '添加商品' }).click();
    await expect(page).toHaveURL(/\/goods\/good/, { timeout: 15_000 });
    const back = page.getByRole('button', { name: /返\s*回|取\s*消/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
    else await page.goBack();
    await expect(page).toHaveURL(/\/goods\/list/, { timeout: 15_000 });
    await page.getByPlaceholder('商品名称').fill('E2E');
    await page.getByRole('button', { name: /筛\s*选/ }).last().click();
    await expectListUsable(page);
  });
});
