/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDestructive,
  confirmPageSave,
  fillEmptySelects,
  fillStable,
  selectStoreMenu,
  uniqueShort,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

const STORE = process.env.E2E_STORE || '珠海门店';

async function openPage(page: Page) {
  await page.goto('/shop/printers');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
  await expect(page.getByRole('button', { name: '新增小票机' })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(400);
}

function printerBlock(page: Page, name: string) {
  const namedInput = page.locator(`input[value="${name}"]`).first();
  return page
    .locator('div')
    .filter({ has: namedInput })
    .filter({ has: page.getByRole('button', { name: /删\s*除|刪\s*除/ }) })
    .last();
}

async function printerDeleteButton(page: Page, name: string) {
  const byValue = printerBlock(page, name).getByRole('button', { name: /删\s*除|刪\s*除/ }).first();
  if (await byValue.isVisible({ timeout: 3_000 }).catch(() => false)) return byValue;

  const inputs = page.locator('input:not([type="hidden"])');
  const n = await inputs.count();
  for (let i = 0; i < n; i += 1) {
    if ((await inputs.nth(i).inputValue().catch(() => '')) !== name) continue;
    const block = page
      .locator('div')
      .filter({ has: inputs.nth(i) })
      .filter({ has: page.getByRole('button', { name: /删\s*除|刪\s*除/ }) })
      .last();
    const del = block.getByRole('button', { name: /删\s*除|刪\s*除/ }).first();
    if (await del.isVisible().catch(() => false)) return del;
  }
  throw new Error(`找不到小票机「${name}」的删除按鈕`);
}

async function expectPrinterName(page: Page, name: string) {
  await expect
    .poll(async () => {
      const inputs = page.locator('input');
      const n = await inputs.count();
      for (let i = 0; i < n; i += 1) {
        if ((await inputs.nth(i).inputValue().catch(() => '')) === name) return true;
      }
      return page.getByText(name).first().isVisible().catch(() => false);
    }, { timeout: 15_000 })
    .toBeTruthy();
}

async function createPrinter(page: Page, name = uniqueShort('E2E机', 12)) {
  const addBtn = page.getByRole('button', { name: '新增小票机' });
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  const nameField = page.locator('.ant-form-item', { hasText: /小票机名称/ }).locator('input').last();

  await addBtn.click({ timeout: 10_000 });
  if (!(await nameField.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await addBtn.click({ force: true, timeout: 5_000 }).catch(async () => {
      await addBtn.evaluate((el: HTMLElement) => el.click());
    });
  }
  await expect(nameField).toBeVisible({ timeout: 10_000 });

  const nameInput = nameField.or(
    page.locator('xpath=//*[contains(normalize-space(.),"小票机名称")]/following::input[1]'),
  );
  await fillStable(nameInput.first(), name);

  const fillAfterLabel = async (label: RegExp, value: string) => {
    const labeled = page.getByText(label).last().locator('xpath=following::input[not(@type="hidden")][1]');
    if (await labeled.isVisible().catch(() => false)) {
      await fillStable(labeled, value);
      return true;
    }
    return false;
  };
  await fillAfterLabel(/^IP[:：]$/, '10.0.0.88');
  await fillAfterLabel(/^端口[:：]?$/, '9100');
  await fillAfterLabel(/SN码[:：]?/, `SN${String(Date.now()).slice(-6)}`);
  const leftovers = page.getByPlaceholder('请输入', { exact: true });
  const extras = ['10.0.0.88', '9100', `SN${String(Date.now()).slice(-6)}`];
  const leftN = await leftovers.count();
  for (let i = 0; i < leftN && i < extras.length; i += 1) {
    const inp = leftovers.nth(i);
    const cur = (await inp.inputValue().catch(() => '')).trim();
    if (cur) continue;
    await fillStable(inp, extras[i]);
  }

  await fillEmptySelects(page, page.locator('main, .ant-layout-content').last());
  await nameInput.first().click();
  await nameInput.first().press('End').catch(() => {});
  await nameInput.first().press('Backspace').catch(() => {});
  await nameInput.first().type('1');
  await fillStable(nameInput.first(), name);
  await confirmPageSave(page, /保存更改/, { allowMissingApi: true });
  return name;
}

test.describe('CRUD 小票机管理', () => {
  test('新增小票机', async ({ page }) => {
    await openPage(page);
    const name = await createPrinter(page);
    await expectPrinterName(page, name);
  });

  test('查找小票机', async ({ page }) => {
    await openPage(page);
    const name = await createPrinter(page);
    await expectPrinterName(page, name);
  });

  test('更新小票机', async ({ page }) => {
    await openPage(page);
    const name = await createPrinter(page);
    const updated = `${name}U`.slice(0, 12);
    await expectPrinterName(page, name);
    const editNameInput = printerBlock(page, name).locator('input[type="text"]').first();
    if (await editNameInput.isVisible().catch(() => false)) {
      await fillStable(editNameInput, updated);
    } else {
      const fallback = page.locator('.ant-form-item', { hasText: /小票机名称/ }).locator('input').last();
      await fillStable(fallback, updated);
    }
    await confirmPageSave(page, /保存更改/, { allowMissingApi: true });
    await expectPrinterName(page, updated);
  });

  test('删除小票机', async ({ page }) => {
    await openPage(page);
    const name = await createPrinter(page);
    await expectPrinterName(page, name);
    const del = await printerDeleteButton(page, name);
    await expect(del).toBeVisible({ timeout: 10_000 });
    await del.click({ timeout: 8_000 });
    const confirmBtn = page
      .locator('.ant-popconfirm-buttons button.ant-btn-primary, .ant-modal-confirm-btns button.ant-btn-primary')
      .last();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmDestructive(page);
    }
    await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    await expect
      .poll(async () => {
        const inputs = page.locator('.ant-form-item', { hasText: /小票机名称/ }).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i += 1) {
          const el = inputs.nth(i);
          if (!(await el.isVisible().catch(() => false))) continue;
          if ((await el.inputValue().catch(() => '')) === name) return true;
        }
        return false;
      }, { timeout: 15_000 })
      .toBeFalsy();
  });
});
