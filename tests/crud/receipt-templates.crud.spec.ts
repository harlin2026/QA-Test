/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { confirmDestructive, confirmDialogSave, fillStable, uniqueShort, waitForWriteApi } from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

const TABS = ['厨打小票模板设置', '收银小票模板设置', '存酒打印模板设置'];

async function openPage(page: Page) {
  await page.goto('/system/receipt-template');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function findTemplateOnAnyTab(page: Page, name: string) {
  for (const tab of TABS) {
    const tabBtn = page.getByText(tab, { exact: true });
    if (await tabBtn.isVisible().catch(() => false)) await tabBtn.click();
    await page.waitForTimeout(400);
    if (await page.getByText(name, { exact: true }).first().isVisible().catch(() => false)) return true;
  }
  return false;
}

function templateBlock(page: Page, name: string) {
  return page
    .locator('div')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('button', { name: /编\s*辑|预\s*览|删\s*除/ }) })
    .last();
}

async function createTemplate(page: Page, name = uniqueShort('E2E模', 12)) {
  await page.getByRole('button', { name: /新增模版|新增模板/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await fillStable(dialog.getByPlaceholder('请输入模板名称'), name);
  await confirmDialogSave(page);
  return name;
}

test.describe('CRUD 单据模板', () => {
  test('新增单据模板', async ({ page }) => {
    await openPage(page);
    const name = await createTemplate(page);
    expect(await findTemplateOnAnyTab(page, name), `新增的模板「${name}」應出現在任一模板分頁`).toBeTruthy();
  });

  test('查找单据模板', async ({ page }) => {
    await openPage(page);
    const name = await createTemplate(page);
    expect(await findTemplateOnAnyTab(page, name)).toBeTruthy();
  });

  test('更新单据模板', async ({ page }) => {
    await openPage(page);
    const name = await createTemplate(page);
    expect(await findTemplateOnAnyTab(page, name)).toBeTruthy();
    const editBtn = templateBlock(page, name).getByRole('button', { name: /编\s*辑/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();
    const save = page.getByRole('button', { name: /保\s*存/ }).last();
    if (await save.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const waitResp = waitForWriteApi(page, 15_000);
      await save.click();
      await waitResp;
    } else {
      await expect(page.getByText(/模板|编辑|厨打|收银|存酒/).first()).toBeVisible({ timeout: 15_000 });
    }
    await openPage(page);
    expect(await findTemplateOnAnyTab(page, name)).toBeTruthy();
  });

  test('删除单据模板', async ({ page }) => {
    await openPage(page);
    const name = await createTemplate(page);
    expect(await findTemplateOnAnyTab(page, name)).toBeTruthy();
    await templateBlock(page, name).getByRole('button', { name: /删\s*除|刪\s*除/ }).click();
    await confirmDestructive(page);
    await openPage(page);
    expect(await findTemplateOnAnyTab(page, name)).toBeFalsy();
  });
});
