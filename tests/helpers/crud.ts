/**
 * @author harlin
 */

import { expect, type Page, type Locator, type Response } from '@playwright/test';
import zlib from 'node:zlib';

export function uniqueLabel(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

/** 短唯一名，避開 maxlength */
export function uniqueShort(prefix: string, max = 12) {
  const s = `${prefix}${String(Date.now()).slice(-6)}`;
  return s.slice(0, max);
}

export function uniquePhone() {
  const n = String(Date.now()).slice(-8);
  return `139${n}`;
}

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** 產生純色 PNG（實心壓縮很小，可當上傳用圖） */
export function pngBuffer(width = 64, height = 64) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = y * (width * 3 + 1) + 1 + x * 3;
      raw[i] = 0xe8;
      raw[i + 1] = 0x4a;
      raw[i + 2] = 0x3c;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function uploadFirstImage(page: Page, options: { filename?: string; size?: number } = {}) {
  const { filename = 'e2e.png', size = 64 } = options;
  const input = page.locator('input[type="file"]').last();
  await expect(input).toBeAttached({ timeout: 10_000 });
  await input.setInputFiles({
    name: filename,
    mimeType: 'image/png',
    buffer: pngBuffer(size, size),
  });
}

export async function confirmDestructive(page: Page) {
  const confirmBtn = page
    .locator('.ant-popconfirm-buttons button.ant-btn-primary, .ant-modal-confirm-btns button.ant-btn-primary')
    .last();
  await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
  const waitResp = waitForWriteApi(page, 15_000);
  await confirmBtn.click();
  await waitResp;
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
}

export function tableRow(page: Page, text: string) {
  return page.locator('.ant-table-tbody tr.ant-table-row', { hasText: text }).first();
}

export function isWriteRequest(r: Response) {
  const m = r.request().method();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return false;
  if (!r.ok()) return false;
  const url = r.url();
  if (/\.(js|css|png|jpe?g|gif|svg|woff2?|map|ico)(\?|$)/i.test(url)) return false;
  return true;
}

export async function waitForWriteApi(page: Page, timeout = 15_000) {
  return page.waitForResponse((r) => isWriteRequest(r), { timeout }).catch(() => null);
}

export async function clickFilterButton(page: Page) {
  const candidates = page.locator('button.ant-btn-primary', { hasText: /筛\s*选|查\s*询|搜\s*索/ });
  const n = await candidates.count();
  let btn: Locator | null = null;
  for (let i = n - 1; i >= 0; i -= 1) {
    const el = candidates.nth(i);
    if (await el.isVisible().catch(() => false)) {
      btn = el;
      break;
    }
  }
  if (!btn) throw new Error('找不到可見的篩選／查詢按鈕');
  await btn.click();
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
}

export async function filterByPlaceholder(page: Page, placeholder: string | RegExp, value: string) {
  await fillStable(page.getByPlaceholder(placeholder).first(), value);
  await clickFilterButton(page);
}

export async function expectRowVisible(page: Page, text: string) {
  await expect(tableRow(page, text)).toBeVisible({ timeout: 15_000 });
}

export async function expectRowGone(page: Page, text: string) {
  await expect(page.locator('.ant-table-tbody tr.ant-table-row', { hasText: text })).toHaveCount(0, {
    timeout: 15_000,
  });
}

export async function clickRowAction(page: Page, rowText: string, action: RegExp) {
  const row = tableRow(page, rowText);
  await expect(row).toBeVisible({ timeout: 15_000 });
  const btn = row.getByRole('button', { name: action }).first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

export async function deleteTableRow(page: Page, text: string) {
  await clickRowAction(page, text, /删\s*除|刪\s*除/);
  await confirmDestructive(page);
}

export async function assertNoErrorToast(page: Page) {
  const err = page.locator('.ant-message-error, .ant-notification-notice-error').first();
  if (await err.isVisible().catch(() => false)) {
    const msg = (await err.innerText().catch(() => '')).trim();
    throw new Error(`寫入失敗：${msg || '出現錯誤提示'}`);
  }
  const fieldErr = page.locator('.ant-form-item-explain-error:visible').first();
  if (await fieldErr.isVisible().catch(() => false)) {
    const msg = (await fieldErr.innerText().catch(() => '')).trim();
    throw new Error(`表單未通過校驗：${msg || '有必填欄位未填'}`);
  }
}

export async function expectPersisted(page: Page, resp: Response | null, hint: string) {
  await assertNoErrorToast(page);
  const success = page.locator('.ant-message-success, .ant-notification-notice-success').first();
  const okToast = await success.isVisible().catch(() => false);
  if (!resp && !okToast) {
    throw new Error(`${hint}：未偵測到寫入 API 成功回應，資料可能未落庫`);
  }
}

/** 可靠填入 Ant Design 受控輸入（避免 fill 未觸發 onChange） */
export async function fillStable(input: Locator, value: string) {
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.click({ force: true, timeout: 5_000 });
  await input.fill(String(value), { timeout: 8_000 });
  let actual = await input.inputValue();
  if (actual !== String(value)) {
    await input.click({ clickCount: 3 });
    await input.press('Backspace');
    await input.type(String(value), { delay: 25 });
    actual = await input.inputValue();
  }
  if (actual !== String(value)) {
    throw new Error(`輸入框寫入失敗：期望「${value}」，實際「${actual}」（可能被 maxlength 截斷）`);
  }
}

/** 點擊對話框確認，並盡量等寫入 API 完成 */
export async function confirmDialogSave(page: Page) {
  const dialog = page.locator('.ant-modal:visible, [role="dialog"]').last();
  const btn = dialog.getByRole('button', { name: /确\s*认|确\s*定|保\s*存/ }).last();
  await expect(btn).toBeVisible({ timeout: 10_000 });

  const waitResp = waitForWriteApi(page, 15_000);
  await btn.click();
  const resp = await waitResp;
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expectPersisted(page, resp, '對話框儲存');
  return resp;
}

/** 頁面級儲存（非彈窗） */
export async function confirmPageSave(
  page: Page,
  buttonName: RegExp = /保存更改|^保\s*存$|确\s*认|确\s*定/,
  options: { allowMissingApi?: boolean } = {},
) {
  const btn = page.getByRole('button', { name: buttonName }).last();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  const waitAny = page
    .waitForResponse((r) => {
      const m = r.request().method();
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return false;
      return !/\.(js|css|png|jpe?g|gif|svg|woff2?|map|ico)(\?|$)/i.test(r.url());
    }, { timeout: 20_000 })
    .catch(() => null);
  await btn.click();
  let resp = await waitAny;
  if (resp && !resp.ok()) {
    await assertNoErrorToast(page);
    throw new Error(`頁面儲存失敗：HTTP ${resp.status()} ${resp.url()}`);
  }
  if (!resp) resp = await waitForWriteApi(page, 8_000);
  await page.waitForTimeout(400);
  if (!resp && options.allowMissingApi) {
    await assertNoErrorToast(page);
    return null;
  }
  await expectPersisted(page, resp, '頁面儲存');
  return resp;
}

function openDropdowns(page: Page) {
  return page.locator(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden), .ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden)',
  );
}

/** 收起下拉，避免 Escape 把 ant-modal 一併關掉 */
export async function closeAntDropdown(page: Page, preferClick?: Locator) {
  const open = openDropdowns(page);
  if ((await open.count()) === 0) return;
  if (preferClick) await preferClick.click({ timeout: 2_000 }).catch(() => {});
  if ((await open.count()) === 0) return;
  const header = page
    .locator('.ant-modal:visible .ant-modal-header, .ant-modal:visible .ant-modal-title, [role="dialog"] .ant-modal-title')
    .last();
  if (await header.isVisible().catch(() => false)) await header.click().catch(() => {});
  if ((await open.count()) === 0) return;
  await page.keyboard.press('Enter').catch(() => {});
  await expect(open).toHaveCount(0, { timeout: 3_000 }).catch(() => {});
}

/** 把範圍內仍是「请选择」的下拉選第一個可選項（略過級聯，避免點到隱藏選單） */
export async function fillEmptySelects(page: Page, scope?: Locator) {
  const root = scope || page.locator('.ant-modal:visible, [role="dialog"]').last();
  for (let pass = 0; pass < 3; pass += 1) {
    const selects = root.locator('.ant-select');
    const count = await selects.count();
    let clicked = false;
    for (let i = 0; i < count; i += 1) {
      const sel = selects.nth(i);
      if (!(await sel.isVisible().catch(() => false))) continue;
      const cls = (await sel.getAttribute('class')) || '';
      if (/cascader/i.test(cls)) continue;
      const text = (await sel.innerText().catch(() => '')).trim();
      const placeholderOn = await sel.locator('.ant-select-selection-placeholder').isVisible().catch(() => false);
      if (!placeholderOn && text && !/请选择/.test(text)) continue;
      await sel.click().catch(() => {});
      const option = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        clicked = true;
        await closeAntDropdown(page);
      }
    }
    if (!clicked) break;
  }
}

/** 點擊彈窗/頁面中的第一個（或第 n 個）下拉，並選擇選項 */
export async function selectAntOption(
  page: Page,
  options: { withinDialog?: boolean; index?: number; optionText?: string | RegExp } = {},
) {
  const { withinDialog = true, index = 0, optionText } = options;
  const base = withinDialog
    ? page.locator('.ant-modal:visible, [role="dialog"]').last()
    : page.locator('body');
  const selector = base.locator('.ant-select-selector').nth(index);
  await expect(selector).toBeVisible({ timeout: 10_000 });
  await selector.click();
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  if (optionText) {
    await dropdown.locator('.ant-select-item-option', { hasText: optionText }).first().click();
  } else {
    await dropdown.locator('.ant-select-item-option').first().click();
  }
  await closeAntDropdown(page, selector);
}

/** 商品分類等樹形下拉：點葉子節點，不要點「酒」這類父級 */
export async function selectTreeSelectLeaf(page: Page, formItemLabel: RegExp) {
  const item = page.locator('.ant-form-item', { hasText: formItemLabel }).first();
  const selector = item.locator('.ant-select-selector').first();
  await expect(selector).toBeVisible({ timeout: 10_000 });
  await selector.click();
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  const leaf = dropdown
    .locator('.ant-select-tree-treenode-leaf .ant-select-tree-title')
    .last()
    .or(dropdown.locator('.ant-select-tree-title').last());
  await expect(leaf).toBeVisible({ timeout: 10_000 });
  await leaf.click();
  await closeAntDropdown(page, selector);
}

export async function selectStoreMenu(page: Page, storeName: string) {
  const search = page.getByPlaceholder('请输入门店名称');
  if (await search.isVisible().catch(() => false)) {
    await fillStable(search, storeName);
    const filterBtn = page.locator('button.ant-btn-primary', { hasText: /筛\s*选/ }).first();
    if (await filterBtn.isVisible().catch(() => false)) await filterBtn.click();
    await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
  }
  const escaped = storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const item = page
    .locator('.ant-menu-item')
    .filter({ hasText: new RegExp(`^${escaped}$`) })
    .or(page.getByText(storeName, { exact: true }))
    .first();
  await expect(item).toBeVisible({ timeout: 15_000 });
  await item.click();
  const menuItem = page.locator('.ant-menu-item', { hasText: new RegExp(`^${escaped}$`) }).first();
  if (await menuItem.isVisible().catch(() => false)) {
    await expect(menuItem).toHaveClass(/ant-menu-item-selected/, { timeout: 10_000 }).catch(() => {});
  }
}

/** 級聯選擇：只點目前打開的下拉裡的可見選項（搜尋框常為 readonly） */
export async function selectCascaderFirst(scope: Locator, page: Page, label: RegExp) {
  const item = scope.locator('.ant-form-item', { hasText: label }).first();
  if (!(await item.isVisible().catch(() => false))) return;
  const trigger = item.locator('.ant-select-selector, .ant-cascader, .ant-select').first();
  await trigger.click();
  const dropdown = page
    .locator('.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden), .ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .last();
  await expect(dropdown).toBeVisible({ timeout: 10_000 });

  const clickVisible = async (name: string | RegExp) => {
    const el = dropdown.locator('.ant-cascader-menu-item', { hasText: name }).first();
    if ((await el.count()) === 0) return false;
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.click({ force: true });
    await page.waitForTimeout(280);
    return true;
  };

  if (await clickVisible(/广东|廣東/)) {
    await clickVisible(/珠海/);
    await clickVisible(/香洲|斗门|金湾|市辖区/);
    const leaf = dropdown.locator('.ant-cascader-menu').last().locator('.ant-cascader-menu-item').first();
    if ((await leaf.count()) > 0) await leaf.click({ force: true }).catch(() => {});
    await closeAntDropdown(page, trigger);
    return;
  }

  const menus = dropdown.locator('.ant-cascader-menu');
  const menuCount = await menus.count();
  for (let i = 0; i < Math.min(menuCount, 4); i += 1) {
    const opt = menus.nth(i).locator('.ant-cascader-menu-item').first();
    if ((await opt.count()) === 0) break;
    await opt.scrollIntoViewIfNeeded().catch(() => {});
    await opt.click({ force: true });
    await page.waitForTimeout(280);
  }
  await closeAntDropdown(page, trigger);
}
