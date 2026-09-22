/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDialogSave,
  deleteTableRow,
  expectRowGone,
  expectRowVisible,
  fillEmptySelects,
  fillStable,
  filterByPlaceholder,
  selectCascaderFirst,
  tableRow,
  uniquePhone,
  uniqueShort,
  uploadFirstImage,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

function newStore() {
  const name = uniqueShort('E2E店', 12);
  return { name, updated: `${name}U`.slice(0, 12), phone: uniquePhone() };
}

async function openPage(page: Page) {
  await page.goto('/shop/stores');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function createStore(page: Page, store = newStore()) {
  await page.getByRole('button', { name: '创建门店' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await fillStable(dialog.getByPlaceholder('请输入名称'), store.name);
  await fillStable(dialog.getByPlaceholder(/手机号/), store.phone);
  await fillStable(dialog.getByPlaceholder('请输入经度'), '113.5767');
  await fillStable(dialog.getByPlaceholder('请输入纬度'), '22.2707');
  await fillStable(dialog.getByPlaceholder('请输入地址'), 'E2E测试地址');
  const addHours = dialog.getByRole('button', { name: /新增营业时间/ });
  if (await addHours.isVisible().catch(() => false)) await addHours.click().catch(() => {});
  await uploadFirstImage(page, { size: 64 });
  await fillEmptySelects(page, dialog);
  await selectCascaderFirst(dialog, page, /门店地区/);
  await confirmDialogSave(page);
  return store;
}

test.describe('CRUD 门店管理', () => {
  test('新增门店', async ({ page }) => {
    await openPage(page);
    const store = await createStore(page);
    await filterByPlaceholder(page, '请输入门店名称', store.name);
    await expectRowVisible(page, store.name);
  });

  test('查找门店', async ({ page }) => {
    await openPage(page);
    const store = await createStore(page);
    await filterByPlaceholder(page, '请输入门店名称', store.name);
    await expectRowVisible(page, store.name);
  });

  test('更新门店', async ({ page }) => {
    await openPage(page);
    const store = await createStore(page);
    await filterByPlaceholder(page, '请输入门店名称', store.name);
    await expectRowVisible(page, store.name);

    await tableRow(page, store.name).getByRole('button', { name: /编\s*辑|修\s*改/ }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    await fillStable(editDialog.getByPlaceholder('请输入名称'), store.updated);
    await confirmDialogSave(page);

    await filterByPlaceholder(page, '请输入门店名称', store.updated);
    await expectRowVisible(page, store.updated);
  });

  test('删除门店', async ({ page }) => {
    await openPage(page);
    const store = await createStore(page);
    await filterByPlaceholder(page, '请输入门店名称', store.name);
    await expectRowVisible(page, store.name);
    await deleteTableRow(page, store.name);
    await filterByPlaceholder(page, '请输入门店名称', store.name);
    await expectRowGone(page, store.name);
  });
});
