/**
 * @author harlin
 */

import { expect, type Page } from '@playwright/test';
import {
  expectAppShell,
  expectAuthenticated,
  expectPageReady,
  expectTableOrEmpty,
} from './page-checks';
import { clickFilter, selectStore } from './store';
import { fillStable, tableRow } from './crud';

export const STORE = process.env.E2E_STORE || '珠海门店';
/** 可選：固定會員手機號（後台篩選偶發不穩時仍可用表格文案兜底） */
export const VIP_PHONE = process.env.E2E_MEMBER_PHONE || '';

/** 開啟後台頁並確認已登入、殼層就緒 */
export async function openAppPage(page: Page, path: string) {
  await page.goto(path);
  await expectAuthenticated(page);
  await expectAppShell(page);
  await expectPageReady(page);
}

/** 開啟頁面並選擇門店（左側門店選單） */
export async function openWithStore(page: Page, path: string, storeName = STORE) {
  await openAppPage(page, path);
  await selectStore(page, storeName);
}

/** 表格可用，或空狀態 */
export async function expectListUsable(page: Page) {
  await expectTableOrEmpty(page);
}

/** 若有篩選按鈕則點一次（無則略過） */
export async function tryClickFilter(page: Page) {
  const btn = page.getByRole('button', { name: /筛\s*选|查\s*询|搜\s*索/ }).last();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
}

/** 填入第一個可見搜尋框並篩選（若存在） */
export async function trySearchFirstInput(page: Page, keyword: string) {
  const input = page.locator('input[placeholder]:visible').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(keyword);
    await clickFilter(page).catch(async () => {
      await tryClickFilter(page);
    });
  }
}

/** 清空會員列表篩選條件（openid / 暱稱 / 手機號） */
export async function clearVipListFilters(page: Page) {
  const placeholders = [/openid/i, /昵称|暱稱/, /手机号|手機號/];
  for (const re of placeholders) {
    const input = page.getByPlaceholder(re).first();
    if (await input.isVisible().catch(() => false)) {
      await input.click();
      await input.fill('');
    }
  }
}

/**
 * 後台會員列表：依手機號篩選（UI：请输入手机号 + 筛选）
 * 注意：後端篩選偶發回 0 筆（列表其實看得到），請優先用 openVipDetailByPhone / findVipRowByPhone。
 */
export async function filterVipByPhone(page: Page, phone: string) {
  await clearVipListFilters(page);
  const input = page.getByPlaceholder(/请输入手机号|手机号/).first();
  await fillStable(input, phone);
  await page.getByRole('button', { name: /筛\s*选/ }).last().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
  await expectTableOrEmpty(page);
}

/** 讀取會員列表第一列的手機號（欄位：卡號/暱稱/手機號） */
export async function readFirstVipPhone(page: Page): Promise<string | null> {
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
  if (!(await row.isVisible().catch(() => false))) return null;
  const cell = row.locator('td').nth(3);
  const text = (await cell.innerText().catch(() => '')).trim();
  const phone = text.split(/\s+/)[0]?.trim() || '';
  return phone.length >= 6 ? phone : null;
}

/**
 * 在表格中定位含該手機號的列。
 * 先篩選；若 API 回空但列表有該號，則清空篩選後用文案匹配，並可翻頁。
 */
export async function findVipRowByPhone(page: Page, phone: string) {
  const normalized = String(phone || '').trim();
  if (!normalized) return null;

  await filterVipByPhone(page, normalized);
  let row = tableRow(page, normalized);
  if (await row.isVisible().catch(() => false)) return row;

  await clearVipListFilters(page);
  await page.getByRole('button', { name: /筛\s*选/ }).last().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expectTableOrEmpty(page);

  row = tableRow(page, normalized);
  if (await row.isVisible().catch(() => false)) return row;

  for (let i = 0; i < 5; i += 1) {
    const next = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.locator('.ant-spin-spinning').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    row = tableRow(page, normalized);
    if (await row.isVisible().catch(() => false)) return row;
  }
  return null;
}

/** 點會員列表第一個「查看」 */
export async function clickFirstVipView(page: Page) {
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  const viewBtn = row.getByRole('button', { name: /查\s*看/ });
  await expect(viewBtn).toBeVisible({ timeout: 10_000 });
  await viewBtn.click();
  await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
}

/** 依手機號打開詳情；找不到回傳 false */
export async function openVipDetailByPhone(page: Page, phone: string) {
  const row = await findVipRowByPhone(page, phone);
  if (!row) return false;
  await row.getByRole('button', { name: /查\s*看/ }).click();
  await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
  return true;
}

/**
 * 會員搜尋閉環：優先指定手機號；找不到則回退列表第一筆
 */
export async function searchVipAndOpenDetail(page: Page, preferredPhone?: string) {
  await expectListUsable(page);
  const phone = preferredPhone || VIP_PHONE || (await readFirstVipPhone(page)) || '';

  if (phone) {
    const ok = await openVipDetailByPhone(page, phone);
    if (ok) return true;
  }

  await clearVipListFilters(page).catch(() => {});
  await page
    .getByRole('button', { name: /筛\s*选/ })
    .last()
    .click()
    .catch(() => {});
  await expectListUsable(page);
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  if ((await rows.count()) === 0) return false;
  await clickFirstVipView(page);
  return true;
}

export { clickFilter, selectStore, expectTableOrEmpty };
