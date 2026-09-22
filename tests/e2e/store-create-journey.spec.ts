/**
 * 门店管理 - 新增门店闭环
 * 覆盖：登录 -> 门店列表 -> 新增门店 -> 表单提交 -> 列表检索校验
 * @author harlin
 */
import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable } from '../helpers/e2e';
import {
  confirmDialogSave,
  fillEmptySelects,
  fillStable,
  filterByPlaceholder,
  expectRowVisible,
  selectCascaderFirst,
  uniquePhone,
  uniqueShort,
  uploadFirstImage,
} from '../helpers/crud';

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test('新增门店后可在门店列表中查询到', async ({ page }) => {
  const storeName = uniqueShort('E2E店', 12);
  const phone = uniquePhone();

  await openAppPage(page, '/shop/stores');
  await expectListUsable(page);

  await page.getByRole('button', { name: '创建门店' }).click({ timeout: 15_000 });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });

  await fillStable(dialog.getByPlaceholder('请输入名称'), storeName);
  await fillStable(dialog.getByPlaceholder(/手机号/), phone);
  await fillStable(dialog.getByPlaceholder('请输入经度'), '113.5767');
  await fillStable(dialog.getByPlaceholder('请输入纬度'), '22.2707');
  await fillStable(dialog.getByPlaceholder('请输入地址'), 'E2E测试地址');
  const addHours = dialog.getByRole('button', { name: /新增营业时间/ });
  if (await addHours.isVisible().catch(() => false)) await addHours.click().catch(() => {});
  await uploadFirstImage(page, { size: 64 });
  await fillEmptySelects(page, dialog);
  await selectCascaderFirst(dialog, page, /门店地区/);
  await confirmDialogSave(page);

  await filterByPlaceholder(page, '请输入门店名称', storeName);
  await expectRowVisible(page, storeName);
});
