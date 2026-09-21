/**
 * @author harlin
 */

import { expect, type Page } from '@playwright/test';

export { expectNoUiErrors } from './ui-errors';

/** 頁面沒有被踢回登入、也沒有白屏/致命錯誤 */
export async function expectAuthenticated(page: Page) {
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).not.toBeEmpty();
}

/** 頁面已渲染出側邊欄（已進入後台殼層） */
export async function expectAppShell(page: Page) {
  await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15_000 });
}

/** 表格有資料列，或顯示空狀態（兩者皆視為功能可用） */
export async function expectTableOrEmpty(page: Page) {
  const table = page.locator('.ant-table').first();
  const empty = page.locator('.ant-empty, .ant-empty-description').first();
  // ant-table 與 empty 常同時存在，取第一個可見即可
  await expect(table.or(empty).first()).toBeVisible({ timeout: 15_000 });
}

/** 存在查詢/篩選類操作入口 */
export async function expectSearchControls(page: Page) {
  const search = page.getByRole('button', { name: /筛\s*选|查\s*询|搜\s*索/ });
  await expect(search.first()).toBeVisible({ timeout: 10_000 });
}

/** 頁面主內容區可見（報表/設定類頁面） */
export async function expectPageReady(page: Page) {
  await expect(page.locator('#app, #root, .ant-layout, main, .page-content').first()).toBeVisible({
    timeout: 15_000,
  });
  // 常見錯誤態
  await expect(page.getByText(/页面不存在|404|系统错误|Internal Server Error/i)).toHaveCount(0);
}

export async function expectDashboard(page: Page) {
  await expect(page.getByText(/数据总览|营业实收|订单统计/).first()).toBeVisible({
    timeout: 15_000,
  });
}
