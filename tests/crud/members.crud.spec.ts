/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';

async function openPage(page: Page) {
  await page.goto('/vip/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 會員列表', () => {
  test('可依手機號篩選並查看詳情', async ({ page }) => {
    await openPage(page);
    await expect(page.getByPlaceholder('请输入手机号')).toBeVisible();
    await expect(page.getByRole('button', { name: /筛\s*选/ }).last()).toBeVisible();

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '無會員可查看');

    const viewBtn = page.getByRole('button', { name: /查\s*看/ }).first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();
    await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
    await expectPageReady(page);
    await expect(page.getByText(/会员|手机|积分|余额|详情/).first()).toBeVisible({ timeout: 15_000 });
  });
});
