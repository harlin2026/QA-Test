/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell, expectPageReady } from '../helpers/page-checks';
import { clickFilterButton, fillStable, waitForWriteApi, expectPersisted } from '../helpers/crud';

test.describe('CRUD 積分列表', () => {
  test('查找积分', async ({ page }) => {
    const listApi = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.ok() && /point|score|integral/i.test(r.url()),
      { timeout: 15_000 },
    ).catch(() => null);

    await page.goto('/points/list');
    await expectAuthenticated(page);
    await expectAppShell(page);

    const phone = page.getByPlaceholder('请输入手机号');
    if (await phone.isVisible().catch(() => false)) await fillStable(phone, '1');
    else await fillStable(page.locator('input[placeholder]:visible').first(), '1');
    await clickFilterButton(page);
    const resp = await listApi;
    expect(resp, '積分列表應打到後端 API').toBeTruthy();
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();
  });

  test('更新积分设置', async ({ page }) => {
    await page.goto('/points/setting');
    await expectAuthenticated(page);
    await expectPageReady(page);
    const save = page.getByRole('button', { name: /保\s*存|提\s*交|确\s*认/ }).first();
    await expect(save).toBeVisible({ timeout: 10_000 });
    const waitResp = waitForWriteApi(page, 15_000);
    await save.click();
    const resp = await waitResp;
    await expectPersisted(page, resp, '積分設置保存');
  });
});
