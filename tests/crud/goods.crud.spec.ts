/**
 * @author harlin
 */

import { type Locator } from '@playwright/test';
import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import {
  assertNoErrorToast,
  closeAntDropdown,
  confirmDestructive,
  fillStable,
  selectStoreMenu,
  selectTreeSelectLeaf,
  tableRow,
  uniqueShort,
  uploadFirstImage,
  filterByPlaceholder,
  expectRowVisible,
  expectRowGone,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

const STORE = process.env.E2E_STORE || '珠海门店';

async function openList(page: Page) {
  await page.goto('/goods/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
  await selectStoreMenu(page, STORE);
}

/** 規格單位被底部固定欄擋住時，一般 click 打不開下拉 */
async function selectSpecUnit(page: Page, specRoot: Locator) {
  const unitWrap = specRoot.locator('.ant-select').first();
  const unitSel = unitWrap.locator('.ant-select-selector').first();
  await expect(unitSel).toBeVisible({ timeout: 8_000 });
  const selected = (
    (await unitWrap.locator('.ant-select-selection-item').first().textContent().catch(() => '')) || ''
  ).trim();
  if (selected && !/请选择/.test(selected)) return;

  await closeAntDropdown(page);
  try {
    await unitSel.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const footer = document.querySelector('.product-good-sticky-footer') as HTMLElement | null;
      if (footer) footer.style.pointerEvents = 'none';
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      el.click();
    });

    const menu = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    if (!(await menu.isVisible({ timeout: 3_000 }).catch(() => false))) {
      await unitSel.click({ force: true, timeout: 3_000 }).catch(() => {});
    }
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Enter');
    const picked = (
      (await unitWrap.locator('.ant-select-selection-item').first().textContent().catch(() => '')) || ''
    ).trim();
    if (!picked || /请选择/.test(picked)) {
      const opt = menu.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)').first();
      await opt.click({ force: true, timeout: 3_000 }).catch(async () => {
        await unitSel.evaluate((el: HTMLElement) => el.click());
        await page.keyboard.press('Enter');
      });
    }
    await closeAntDropdown(page, unitSel);
  } finally {
    await page.evaluate(() => {
      const footer = document.querySelector('.product-good-sticky-footer') as HTMLElement | null;
      if (footer) footer.style.pointerEvents = '';
    }).catch(() => {});
  }
}

/** 底部「保存并上架」：避免點不存在的分頁空等到 suite timeout */
async function clickGoodsSave(page: Page) {
  const waitResp = page
    .waitForResponse((r) => {
      const m = r.request().method();
      if (!['POST', 'PUT', 'PATCH'].includes(m)) return false;
      return !/\.(js|css|png|jpe?g|gif|svg|woff2?|map|ico)(\?|$)/i.test(r.url());
    }, { timeout: 15_000 })
    .catch(() => null);

  const saveBtn = page.getByRole('button', { name: /保存[并並]上架/ }).first();
  await expect(saveBtn).toBeVisible({ timeout: 8_000 });
  await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
  const clicked = await saveBtn
    .click({ force: true, timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!clicked) {
    await saveBtn.evaluate((el: HTMLElement) => el.click());
  }

  const confirmBtn = page
    .locator('.ant-modal-confirm-btns button.ant-btn-primary, .ant-popconfirm-buttons button.ant-btn-primary')
    .last();
  if (await confirmBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await confirmBtn.click({ timeout: 5_000 });
  }

  await page.waitForTimeout(800);
  await assertNoErrorToast(page);
  const resp = await waitResp;
  await assertNoErrorToast(page);
  const success = page.locator('.ant-message-success, .ant-notification-notice-success').first();
  const okToast = await success.isVisible().catch(() => false);
  if (!resp && !okToast) {
    const code = await page.getByPlaceholder(/请输入商品编码/).inputValue().catch(() => '');
    throw new Error(`商品儲存失敗：未偵測到寫入 API（url=${page.url()}，编码=${code || '空'}）`);
  }
  return resp;
}

/** 編碼欄是受控輸入，「E2E」或 fill 常被下一拍清掉；優先寫入數字，不行再點生成 */
async function ensureGoodsCode(page: Page) {
  const input = page.getByPlaceholder(/请输入商品编码/);
  await expect(input).toBeVisible({ timeout: 8_000 });
  const existing = (await input.inputValue().catch(() => '')).trim();
  if (existing) return existing;

  const goodsCode = String(Date.now());
  await input.click({ force: true, timeout: 5_000 });
  await input.fill(goodsCode);
  await input.evaluate((el: HTMLInputElement, v: string) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    desc?.set?.call(el, v);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, goodsCode);
  if (await expect(input).toHaveValue(goodsCode, { timeout: 2_000 }).then(() => true).catch(() => false)) {
    return goodsCode;
  }

  await page.getByRole('button', { name: /生\s*成/ }).click({ force: true, timeout: 5_000 });
  await expect(input).not.toHaveValue('', { timeout: 8_000 });
  return (await input.inputValue()).trim();
}

async function fillGoodsNames(page: Page, value: string) {
  const boxes = [
    page.getByPlaceholder('请输入简体商品名称'),
    page.getByPlaceholder('请输入English商品名称'),
    page.getByPlaceholder('请输入繁体商品名称'),
  ];
  for (const box of boxes) {
    if (!(await box.isVisible().catch(() => false))) continue;
    await fillStable(box, value);
    await box.evaluate((el: HTMLInputElement, v: string) => {
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      desc?.set?.call(el, v);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await expect(box).toHaveValue(value, { timeout: 3_000 });
  }
}

async function createGoods(page: Page, productName = uniqueShort('E2E商', 12)) {
  await page.getByRole('button', { name: '添加商品' }).click({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/goods\/good/, { timeout: 15_000 });
  await expectPageReady(page);

  const codeInput = page.getByPlaceholder(/请输入商品编码/);
  const goodsCode = await ensureGoodsCode(page);
  await fillGoodsNames(page, productName);

  await selectTreeSelectLeaf(page, /商品分类/);
  await expect(
    page.locator('.ant-form-item', { hasText: /商品分类/ }).locator('.ant-select-selection-item'),
  ).toBeVisible({ timeout: 8_000 });

  if (await page.locator('input[type="file"]').count()) {
    await uploadFirstImage(page, { size: 200 });
  }

  await page.getByRole('button', { name: '规格设置' }).click({ force: true, timeout: 8_000 }).catch(() => {});
  const specRoot = page.locator('.ant-table').filter({ hasText: /原价|原價/ }).first();
  if (!(await specRoot.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await page.getByRole('button', { name: '+ 添加规格' }).click({ timeout: 8_000 });
    await expect(specRoot).toBeVisible({ timeout: 8_000 });
  }

  const specNameBoxes = specRoot.getByPlaceholder(/^(XX|450ml)$/);
  const specNameCount = await specNameBoxes.count();
  for (let i = 0; i < specNameCount; i += 1) {
    const el = specNameBoxes.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const v = (await el.inputValue().catch(() => '')).trim();
    if (!v) await el.fill(i === 1 ? '默认' : 'Default');
  }

  await selectSpecUnit(page, specRoot);

  const nums = specRoot.locator('.ant-input-number-input, [role="spinbutton"]');
  const numCount = await nums.count();
  for (let i = 0; i < numCount; i += 1) {
    const el = nums.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    if (await el.isDisabled().catch(() => false)) continue;
    const v = (await el.inputValue().catch(() => '')).trim();
    if (v === '' || v === '0' || v === '0.00') {
      await el.click({ force: true, timeout: 5_000 });
      await el.fill('1');
    }
  }

  await page.getByRole('button', { name: '基本信息' }).click({ force: true, timeout: 5_000 }).catch(() => {});
  if (!(await codeInput.inputValue().catch(() => '')).trim()) {
    await ensureGoodsCode(page);
  }
  await expect(codeInput).not.toHaveValue('', { timeout: 5_000 });
  await clickGoodsSave(page);
  await page.goto('/goods/list');
  await selectStoreMenu(page, STORE);

  return productName;
}

test.describe('CRUD 商品列表', () => {
  test('新增商品', async ({ page }) => {
    await openList(page);
    const name = await createGoods(page);
    await openList(page);
    await filterByPlaceholder(page, '商品名称', name);
    await expectRowVisible(page, name);
  });

  test('查找商品', async ({ page }) => {
    await openList(page);
    const name = await createGoods(page);
    await openList(page);
    await filterByPlaceholder(page, '商品名称', name);
    await expectRowVisible(page, name);
  });

  test('更新商品', async ({ page }) => {
    await openList(page);
    const name = await createGoods(page);
    const updated = `${name}U`.slice(0, 12);
    await openList(page);
    await filterByPlaceholder(page, '商品名称', name);
    await expectRowVisible(page, name);
    await tableRow(page, name).getByRole('button', { name: /编\s*辑|修\s*改/ }).click({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/goods\/good/, { timeout: 15_000 });
    await expectPageReady(page);
    const sc = page.getByPlaceholder('请输入简体商品名称');
    await expect(sc).toHaveValue(name, { timeout: 15_000 });
    await fillGoodsNames(page, updated);
    await expect(sc).toHaveValue(updated, { timeout: 5_000 });
    await clickGoodsSave(page);
    await openList(page);
    await filterByPlaceholder(page, '商品名称', updated);
    await expectRowVisible(page, updated);
  });

  test('删除商品', async ({ page }) => {
    await openList(page);
    const name = await createGoods(page);
    await openList(page);
    await filterByPlaceholder(page, '商品名称', name);
    await expectRowVisible(page, name);
    await tableRow(page, name).getByRole('button', { name: /删\s*除|刪\s*除/ }).click();
    await confirmDestructive(page);
    await filterByPlaceholder(page, '商品名称', name);
    await expectRowGone(page, name);
  });
});
