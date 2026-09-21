/**
 * @author harlin
 */

import { expect, type Page, type Locator } from '@playwright/test';

export function uniqueLabel(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function uniquePhone() {
  const n = String(Date.now()).slice(-8);
  return `139${n}`;
}

export async function confirmDestructive(page: Page) {
  const confirmBtn = page
    .locator('.ant-popconfirm-buttons button.ant-btn-primary, .ant-modal-confirm-btns button.ant-btn-primary')
    .last();
  await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
  await confirmBtn.click();
}

export function tableRow(page: Page, text: string) {
  return page.locator('.ant-table-tbody tr.ant-table-row', { hasText: text }).first();
}

/** 可靠填入 Ant Design 受控輸入（避免 fill 未觸發 onChange） */
export async function fillStable(input: Locator, value: string) {
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.click();
  await input.fill(String(value));
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
  const dialog = page.getByRole('dialog');
  const btn = dialog.getByRole('button', { name: /确\s*认|保\s*存/ }).last();
  await expect(btn).toBeVisible({ timeout: 10_000 });

  const waitResp = page
    .waitForResponse(
      (r) => {
        if (!['POST', 'PUT', 'PATCH'].includes(r.request().method())) return false;
        if (!r.ok()) return false;
        return /api|unit|role|user|filter|goods|system/i.test(r.url());
      },
      { timeout: 15_000 },
    )
    .catch(() => null);

  await btn.click();
  await waitResp;
  await expect(dialog).toBeHidden({ timeout: 20_000 });

  const errToast = page.locator('.ant-message-error, .ant-notification-notice-error').first();
  if (await errToast.isVisible().catch(() => false)) {
    const msg = (await errToast.innerText().catch(() => '')).trim();
    throw new Error(`儲存失敗：${msg || '出現錯誤提示'}`);
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
  // 等下拉收起即可；不可按 Escape，否則會連帶關掉 ant-modal
  await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0, {
    timeout: 5_000,
  });
}

export async function selectStoreMenu(page: Page, storeName: string) {
  const item = page
    .locator('.ant-menu-item', {
      hasText: new RegExp(`^${storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    })
    .first();
  await expect(item).toBeVisible({ timeout: 15_000 });
  await item.click();
  await expect(item).toHaveClass(/ant-menu-item-selected/, { timeout: 10_000 });
}
