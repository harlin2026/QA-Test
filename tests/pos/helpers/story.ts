/**
 * @author harlin
 * POS 用戶故事驗收訊號
 */

import { expect, type Page } from '@playwright/test';
import { expectPosShell } from './pos';

/** POS：殼層可用，且至少命中故事相關文案之一 */
export async function expectPosStorySignals(page: Page, pattern: RegExp) {
  await expectPosShell(page);
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 15_000 });
}
