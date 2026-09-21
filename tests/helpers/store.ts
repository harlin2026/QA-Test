/**
 * @author harlin
 */

import { expect, type Page } from '@playwright/test';

/** 在左側門店選單中選擇指定門店 */
export async function selectStore(page: Page, storeName: string) {
  const item = page.locator('.ant-menu-item', { hasText: new RegExp(`^${escapeRegExp(storeName)}$`) }).first();
  await expect(item).toBeVisible({ timeout: 15_000 });
  await item.click();
  await expect(item).toHaveClass(/ant-menu-item-selected/, { timeout: 10_000 });
}

/** 點擊頁面上的「篩選」按鈕（可能有多個，取可見的第一個主操作） */
export async function clickFilter(page: Page) {
  const btn = page.getByRole('button', { name: /筛\s*选/ }).last();
  await expect(btn).toBeVisible();
  await btn.click();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
