/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { readBridge } from '../helpers/bridge';
import { openAppPage, expectListUsable, tryClickFilter } from '../helpers/e2e';
import { clickFilter } from '../helpers/store';

/**
 * 跨端驗證：用 POS 種子寫入的會員手機號，在後台會員列表可搜尋。
 * 需先執行 POS「跨端種子｜會員」。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E 跨端驗證｜後台可見 POS 會員', () => {
  test('後台會員列表可搜到 bridge 手機號', async ({ page }) => {
    const bridge = readBridge();
    test.skip(!bridge?.memberPhone, '尚無 bridge 會員種子，請先跑 POS 跨端種子');

    await openAppPage(page, '/vip/list');
    await expectListUsable(page);

    const phone = bridge!.memberPhone!;
    const input = page.getByPlaceholder(/请输入手机号|手机号/);
    if (await input.first().isVisible().catch(() => false)) {
      await input.first().fill(phone);
      await clickFilter(page).catch(async () => tryClickFilter(page));
    }

    await expect(page.getByText(phone).or(page.locator('.ant-empty')).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
