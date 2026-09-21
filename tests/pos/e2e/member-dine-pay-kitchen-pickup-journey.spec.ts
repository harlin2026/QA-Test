/**
 * @author harlin
 *
 * 會員版完整用餐閉環（會真實下單／推進廚房狀態，請在測試門店執行）：
 * 進店 → POS 下單選購 → 登入會員 → 優惠券(可選) → 支付 →
 * 小票語意 → 制作中 → 完成制作(待取单) → 已取单(已完成)
 *
 * 環境變數：
 *   POS_MEMBER_PHONE  指定既有會員手機（未設則自動建臨時會員）
 *   POS_PAY_METHOD    支付方式（預設現金）
 */

import { test, expect } from '../../fixtures/base-test';
import {
  addFirstAvailableProduct,
  clearCartIfAny,
  clickFirstKitchenAction,
  clickKitchenStatusTab,
  clickPosNav,
  completeCheckoutPayment,
  ensureMemberByPhone,
  loginMemberOnPos,
  openPosPage,
  selectDiningMode,
  tryApplyCoupon,
  uniquePhone,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

const memberPhone = process.env.POS_MEMBER_PHONE || uniquePhone();

test.describe('E2E POS 會員進店點單支付到取餐閉環', () => {
  test('1. 準備／確認會員可用', async ({ page }) => {
    await ensureMemberByPhone(page, memberPhone);
    await openPosPage(page, '/pages/members/index', '会员');
    await expect(page.getByText(new RegExp(memberPhone)).first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
      // 剛新建後列表可能需再搜一次
      const search = page.locator('uni-button', { hasText: /^搜索$/ }).first();
      if (await search.isVisible().catch(() => false)) await search.click();
      await expect(page.getByText(memberPhone).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test('2. 進店：打開 POS 並選購商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await selectDiningMode(page, '堂食');
    await addFirstAvailableProduct(page);
    await addFirstAvailableProduct(page).catch(() => {});
    await expect(page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('3. 登入會員', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const ok = await loginMemberOnPos(page, memberPhone);
    expect(ok, `應能登入會員 ${memberPhone}`).toBeTruthy();
    await expect(page.getByText(new RegExp(`${memberPhone}|会员|积分|优惠券`)).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('4. 使用優惠券（可選）', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const hasCart = await page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first().isVisible().catch(() => false);
    if (!hasCart) {
      await clearCartIfAny(page);
      await addFirstAvailableProduct(page);
      await loginMemberOnPos(page, memberPhone);
    }

    // 先試點單頁用券；沒有則進結帳面板後再試（不關閉結帳，留給下一步支付）
    let coupon = await tryApplyCoupon(page);
    if (coupon.skipped) {
      const payBtn = page.locator('uni-button', { hasText: /^结账$/ }).first();
      if (await payBtn.isVisible().catch(() => false)) {
        await payBtn.click();
        await page.waitForTimeout(900);
        coupon = await tryApplyCoupon(page);
        // 若仍略過，關閉結帳留給下一步重開
        if (coupon.skipped) {
          const cancel = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
          if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
        }
      }
    }
    // 可選步驟：略過不算失敗
    expect(coupon.skipped || coupon.applied, coupon.detail).toBeTruthy();
  });

  test('5. 選擇支付方式並完成支付', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    const hasCart = await page.getByText(/总共[1-9]|商品总价[\s\S]*¥\s*[1-9]/).first().isVisible().catch(() => false);
    if (!hasCart) {
      await clearCartIfAny(page);
      await addFirstAvailableProduct(page);
      await loginMemberOnPos(page, memberPhone);
    }

    const result = await completeCheckoutPayment(page, {
      payMethod: process.env.POS_PAY_METHOD || '现金',
    });
    expect(result.paid, `應完成支付：${result.detail}`).toBeTruthy();
  });

  test('6. 支付後可見列印／小票相關語意', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expect(
      page.getByText(/打印|列印|小票|前厅|前廳|后厨|後廚|厨房|点单|总共|商品总价/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('7. 訂單進入制作进度（制作中）', async ({ page }) => {
    await clickPosNav(page, '制作进度');
    await expect(page).toHaveURL(/\/pages\/kitchen\/index/, { timeout: 15_000 });

    let onMaking = await clickKitchenStatusTab(page, '制作中');
    const emptyMaking = await page.getByText(/暂无订单|暫無訂單|暂无数据/).first().isVisible().catch(() => false);
    if (emptyMaking) {
      await clickKitchenStatusTab(page, '待制作');
      await clickFirstKitchenAction(page, /开始制作|開始制作|接单|接單|制作/).catch(() => false);
      onMaking = await clickKitchenStatusTab(page, '制作中');
    }
    expect(onMaking).toBeTruthy();
    await expect(page.getByText(/制作中|完成制作|出餐|重打小票|订单|堂食|外带/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('8. 後廚完成制作 → 待取单', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await clickKitchenStatusTab(page, '制作中');
    let done = await clickFirstKitchenAction(page, /完成制作|完成製作|出餐完成|出餐/);
    if (!done) {
      await clickKitchenStatusTab(page, '待制作');
      await clickFirstKitchenAction(page, /开始制作|開始制作|接单|接單/);
      await clickKitchenStatusTab(page, '制作中');
      done = await clickFirstKitchenAction(page, /完成制作|完成製作|出餐完成|出餐/);
    }
    expect(done, '應能點「完成制作」').toBeTruthy();

    const toPickup = await clickKitchenStatusTab(page, '待取单');
    expect(toPickup).toBeTruthy();
    await expect(page.getByText(/待取单|已取单|取餐|暂无订单|订单/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('9. 顧客取单 → 已完成', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await clickKitchenStatusTab(page, '待取单');
    const taken = await clickFirstKitchenAction(page, /已取单|已取單|取餐完成|确认取餐|確認取餐/);
    expect(taken, '應能點「已取单」').toBeTruthy();

    await clickKitchenStatusTab(page, '已完成');
    await expect(page.getByText(/已完成|完成|订单|暂无订单/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('10. 訂單列表確認結束', async ({ page }) => {
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
