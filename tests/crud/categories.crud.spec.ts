/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDialogSave,
  confirmDestructive,
  fillStable,
  selectStoreMenu,
  uniqueShort,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/goods/categories');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

async function searchCategory(page: Page, name: string) {
  await fillStable(page.getByPlaceholder('请输入搜索内容'), name);
  await page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).last().click();
  await page.waitForTimeout(500);
}

function categoryHit(page: Page, name: string) {
  return page.locator('.ant-table-tbody tr.ant-table-row').filter({ has: page.locator(`input[value="${name}"]`) }).first();
}

async function createCategory(page: Page, name = uniqueShort('C', 8)) {
  await page.getByRole('button', { name: '新增一级分类' }).click();
  const dialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await fillStable(dialog.getByPlaceholder('请输入简体分类名称'), name);
  const en = dialog.getByPlaceholder('请输入English分类名称');
  if (await en.isVisible().catch(() => false)) await fillStable(en, `EN${name}`.slice(0, 12));
  const tc = dialog.getByPlaceholder('请输入繁体分类名称');
  if (await tc.isVisible().catch(() => false)) await fillStable(tc, name);
  const sort = dialog.getByPlaceholder('请输入数字');
  if (await sort.isVisible().catch(() => false)) await fillStable(sort, '99');
  await confirmDialogSave(page);
  return name;
}

test.describe('CRUD 商品分类', () => {
  test('新增分类', async ({ page }) => {
    await openPage(page);
    const name = await createCategory(page);
    await searchCategory(page, name);
    await expect(categoryHit(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('查找分类', async ({ page }) => {
    await openPage(page);
    const name = await createCategory(page);
    await searchCategory(page, name);
    await expect(categoryHit(page, name)).toBeVisible({ timeout: 15_000 });
  });

  test('更新分类', async ({ page }) => {
    await openPage(page);
    const name = await createCategory(page);
    const updated = uniqueShort('U', 8);
    await searchCategory(page, name);
    const hit = categoryHit(page, name);
    await expect(hit).toBeVisible({ timeout: 15_000 });
    await hit.getByRole('button', { name: /编\s*辑|修\s*改/ }).first().click();
    const editDialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    await fillStable(editDialog.getByPlaceholder('请输入简体分类名称'), updated);
    await confirmDialogSave(page);
    await searchCategory(page, updated);
    await expect(categoryHit(page, updated)).toBeVisible({ timeout: 15_000 });
  });

  test('删除分类', async ({ page }) => {
    await openPage(page);
    const name = await createCategory(page);
    await searchCategory(page, name);
    const hit = categoryHit(page, name);
    await expect(hit).toBeVisible({ timeout: 15_000 });
    await hit.getByRole('button', { name: /删\s*除|刪\s*除/ }).first().click();
    await confirmDestructive(page);
    await searchCategory(page, name);
    await expect(categoryHit(page, name)).toHaveCount(0, { timeout: 15_000 });
  });
});
