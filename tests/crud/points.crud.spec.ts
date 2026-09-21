/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';

async function openPage(page: Page) {
  await page.goto('/points/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 積分列表', () => {
  test('列表可搜尋篩選', async ({ page }) => {
    await openPage(page);
    const input = page.locator('input[placeholder]:visible').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill('1');
    await page.getByRole('button', { name: /筛\s*选|查\s*询|搜\s*索/ }).last().click();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });
});
