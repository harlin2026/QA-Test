/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickPosNav,
  expectDashboardShell,
  openPosPage,
  tryHangOrder,
  tryOpenCheckout,
} from '../helpers/pos';

/**
 * 閉環：班次視角完整巡航——總覽 → 點單 → 訂單 → 廚房 → 會員 → 存酒 → 沽清。
 */
test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 班次運營全鏈路閉環', () => {
  test('1. 總覽確認營收殼層', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expectDashboardShell(page);
  });

  test('2. 點單加購並打開結帳/掛單', async ({ page }) => {
    await clickPosNav(page, '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    const ok = await tryOpenCheckout(page);
    if (!ok) await tryHangOrder(page);
  });

  test('3. 訂單與制作进度可切換', async ({ page }) => {
    await clickPosNav(page, '订单');
    await expect(page.getByText(/全部|待支付|制作中|已完成/).first()).toBeVisible({ timeout: 15_000 });
    await clickPosNav(page, '制作进度');
    await expect(page.getByText(/待制作|制作中|完成制作|重打小票/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('4. 會員／存酒／沽清頁面可用', async ({ page }) => {
    await clickPosNav(page, '会员');
    await expect(page.getByText(/请输入手机号查询|新增会员/).first()).toBeVisible({ timeout: 15_000 });
    await clickPosNav(page, '存酒');
    await expect(page.getByText(/新建存酒|寄存中|已取出/).first()).toBeVisible({ timeout: 15_000 });
    await clickPosNav(page, '沽清');
    await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });
  });
});
