/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { clickFilterButton, fillStable } from '../helpers/crud';

async function openPage(page: Page) {
  await page.goto('/vip/list');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 會員列表', () => {
  test('查找会员', async ({ page }) => {
    const listApi = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.ok() && /vip|member|user/i.test(r.url()),
      { timeout: 15_000 },
    ).catch(() => null);

    await openPage(page);
    await clickFilterButton(page);
    const resp = await listApi;
    expect(resp, '會員列表應打到後端 API').toBeTruthy();

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    test.skip((await rows.count()) === 0, '資料庫尚無會員（新增入口在 POS）');

    const raw = (await rows.first().innerText()).trim();
    const phone = raw.match(/1\d{10}/)?.[0];
    if (phone) {
      await fillStable(page.getByPlaceholder('请输入手机号'), phone);
      await clickFilterButton(page);
      await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
    }

    await page.getByRole('button', { name: /查\s*看/ }).first().click();
    await expect(page).toHaveURL(/\/vip\/detail\//, { timeout: 15_000 });
    await expectPageReady(page);
    await expect(page.getByText(/会员|手机|积分|余额|详情/).first()).toBeVisible({ timeout: 15_000 });
  });
});
