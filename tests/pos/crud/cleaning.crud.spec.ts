/**
 * @author harlin
 */

import { test, expect, type Page } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';

async function clickCleaningFilter(page: Page, label: '未沽清' | '已沽清') {
  const tab = page.locator('uni-button').filter({ hasText: new RegExp(`^${label}`) }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ force: true });
    await page.waitForTimeout(400);
  }
}

/** 先選商品卡，再點右上「商品规格沽清」打開規格彈層 */
async function openSpecDialog(page: Page) {
  const card = page
    .locator('uni-view')
    .filter({ hasText: /测试一级分类01/ })
    .filter({ hasText: /¥\s*60/ })
    .first();
  await expect(card, '應能點到測試商品').toBeVisible({ timeout: 10_000 });
  await card.click({ force: true });
  await page.waitForTimeout(300);

  const entry = page.locator('uni-button').filter({ hasText: /商品规格沽清/ }).first();
  await expect(entry).toBeVisible({ timeout: 5_000 });
  await entry.click({ force: true });
  await expect(page.getByText(/^确定沽清$|^恢复售卖$|^取消沽清$/).first()).toBeVisible({
    timeout: 8_000,
  });
}

async function clickDialogAction(page: Page, button: RegExp) {
  const wait = page
    .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && r.ok(), {
      timeout: 8_000,
    })
    .catch(() => null);
  await page.getByText(button).first().click({ force: true });
  return wait;
}

test.describe('POS CRUD 沽清', () => {
  test('對規格執行沽清寫入並還原', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });

    await clickCleaningFilter(page, '未沽清');
    await openSpecDialog(page);

    const onResp = await clickDialogAction(page, /^确定沽清$/);
    expect(onResp, '規格沽清應寫入後端').toBeTruthy();
    await page.waitForTimeout(600);

    await clickCleaningFilter(page, '已沽清');
    const restored = page.getByText(/测试一级分类01/).first();
    if (await restored.isVisible().catch(() => false)) {
      await openSpecDialog(page);
      const restoreBtn = page.getByText(/^恢复售卖$|^取消沽清$|^确定恢复$/).first();
      if (await restoreBtn.isVisible().catch(() => false)) {
        await clickDialogAction(page, /^恢复售卖$|^取消沽清$|^确定恢复$/);
      } else {
        await page.getByText(/^取消$/).first().click({ force: true }).catch(() => {});
      }
    }
  });
});
