/**
 * @author harlin
 * 用戶故事驗收：頁面級關鍵訊號（不做破壞性寫入）
 */

import { expect, type Page } from '@playwright/test';
import { expectAuthenticated, expectAppShell, expectPageReady } from './page-checks';

/** 後台：開啟後可見殼層，且至少命中故事相關文案之一 */
export async function expectStorySignals(page: Page, pattern: RegExp) {
  await expectAuthenticated(page);
  await expectAppShell(page);
  await expectPageReady(page);
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 15_000 });
}
