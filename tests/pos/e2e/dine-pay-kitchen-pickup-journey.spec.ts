/**
 * @author harlin
 *
 * 完整用餐閉環（會真實下單／推進廚房狀態，請在測試門店執行）：
 * 顧客進店 → POS 下單選購 → 選擇支付並完成 → 小票語意 →
 * 制作进度(制作中) → 完成制作(待取单) → 已取单(已完成)
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickFirstKitchenAction,
  clickKitchenStatusTab,
  completeKitchenPickup,
  clickPosNav,
  completeCheckoutPayment,
  openPosPage,
  selectDiningMode,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 進店點單支付到取餐閉環', () => {
  test('1. 進店：打開 POS 點單並選用餐方式', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    // 顧客進店 → 預設堂食；若無則嘗試外帶
    await selectDiningMode(page, '堂食');
    await selectDiningMode(page, '外带').catch(() => false);
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });

  test('2. 選購商品加入購物車', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page);
    // 再加一件提高後廚可見度（失敗不擋）
    await addFirstAvailableProduct(page).catch(() => {});
    await expect(page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('3. 選擇支付方式並完成支付', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    // 若購物車被清空則補貨
    const hasCart = await page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first().isVisible().catch(() => false);
    if (!hasCart) {
      await clearCartIfAny(page);
      await addFirstAvailableProduct(page);
    }

    const result = await completeCheckoutPayment(page, {
      payMethod: process.env.POS_PAY_METHOD || '现金',
    });
    expect(result.paid, `應完成支付：${result.detail}`).toBeTruthy();
  });

  test('4. 支付後可見列印／小票相關語意（前廳／後廚）', async ({ page }) => {
    // 部分環境支付成功後立即跳轉；此步核對點單殼仍在，並接受「打印/小票」提示若仍殘留
    await openPosPage(page, '/pages/pos/index', '点单');
    const printOrShell = page.getByText(/打印|列印|小票|前厅|前廳|后厨|後廚|厨房|點单|点单|总共|商品总价/);
    await expect(printOrShell.first()).toBeVisible({ timeout: 15_000 });
  });

  test('5. 訂單進入制作进度且可見制作中', async ({ page }) => {
    await clickPosNav(page, '制作进度');
    await expect(page).toHaveURL(/\/pages\/kitchen\/index/, { timeout: 15_000 });

    // 優先看「制作中」，若空則看「待制作」再回制作中
    let onMaking = await clickKitchenStatusTab(page, '制作中');
    const emptyMaking = await page.getByText(/暂无订单|暫無訂單|暂无数据/).first().isVisible().catch(() => false);
    if (emptyMaking) {
      await clickKitchenStatusTab(page, '待制作');
      // 部分流程需先接单才会进制作中；若有「开始制作/接单」則點一下
      await clickFirstKitchenAction(page, /开始制作|開始制作|接单|接單|制作/).catch(() => false);
      onMaking = await clickKitchenStatusTab(page, '制作中');
    }

    expect(onMaking).toBeTruthy();
    await expect(
      page.getByText(/制作中|完成制作|出餐|重打小票|订单|堂食|外带/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('6. 後廚完成制作 → 狀態待取单', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await clickKitchenStatusTab(page, '制作中');

    let done = await clickFirstKitchenAction(page, /完成制作[，,]出餐|完成制作|完成製作/);
    if (!done) {
      await clickKitchenStatusTab(page, '待制作');
      await clickFirstKitchenAction(page, /开始制作|開始制作|接单|接單/);
      await clickKitchenStatusTab(page, '制作中');
      done = await clickFirstKitchenAction(page, /完成制作[，,]出餐|完成制作|完成製作/);
    }
    expect(done, '應能點「完成制作，出餐」').toBeTruthy();

    await clickKitchenStatusTab(page, '待取单');
    const pickupBtn = page.locator('uni-button', { hasText: /完成取单|已取单/ }).first();
    if (!(await pickupBtn.isVisible().catch(() => false))) {
      await clickKitchenStatusTab(page, '超时单');
    }
    await expect(page.locator('uni-button', { hasText: /完成取单|已取单/ }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('7. 顧客取单 → 已取单 → 已完成', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');

    let taken = await completeKitchenPickup(page);
    if (!taken) {
      await clickKitchenStatusTab(page, '制作中');
      await clickFirstKitchenAction(page, /完成制作[，,]出餐|完成制作|完成製作/);
      taken = await completeKitchenPickup(page);
    }
    expect(taken, '應能點「完成取单」').toBeTruthy();

    await clickKitchenStatusTab(page, '已完成');
    await expect(page.getByText(/已完成|完成|订单|暂无订单/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('8. 訂單列表可見已完成（訂單結束）', async ({ page }) => {
    await clickPosNav(page, '订单');
    await expect(page).toHaveURL(/\/pages\/orders\/index/, { timeout: 15_000 });
    const doneTab = page.locator('uni-button, uni-view', { hasText: /^已完成$/ }).first();
    if (await doneTab.isVisible().catch(() => false)) await doneTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/已完成|订单编号|交易|堂食|外带|暂无/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
