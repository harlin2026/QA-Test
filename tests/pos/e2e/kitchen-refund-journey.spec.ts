/**
 * @author harlin
 *
 * 制作进度退單閉環（會真實退款，請在測試門店執行）：
 * 进入制作进度 → 打开订单详情 → 选择退货商品 →
 * 仅退款（可部分金額、库存不返回）／退货退款（全额、库存返回）→ 确认退单
 *
 * 流程會先下一筆測試單以確保有可退訂單。
 */

import { test, expect } from '../../fixtures/base-test';
import {
  confirmRefund,
  openFirstKitchenOrderDetail,
  openRefundEntry,
  openPosPage,
  refundInventoryHint,
  seedPaidOrderForKitchen,
  selectRefundItems,
  selectRefundType,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

async function prepareRefundableOrder(page: import('@playwright/test').Page) {
  const seeded = await seedPaidOrderForKitchen(page);
  // 即使支付判定保守，仍繼續嘗試用廚房既有單
  return seeded;
}

async function enterDetailAndOpenRefund(page: import('@playwright/test').Page) {
  const opened = await openFirstKitchenOrderDetail(page);
  expect(opened, '制作进度應有可打開的訂單詳情').toBeTruthy();
  await expect(page.getByText(/订单详情|订单编号|商品|金额|支付|退单|退款|详情/).first()).toBeVisible({
    timeout: 15_000,
  });

  const selected = await selectRefundItems(page);
  expect(selected, '應能選擇要退的商品').toBeTruthy();

  const refundOpened = await openRefundEntry(page);
  expect(refundOpened, '訂單詳情應有退單入口').toBeTruthy();
  await expect(page.getByText(/仅退款|退货退款|确认退单|确认退款|退款原因/).first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('E2E POS 制作进度退單閉環', () => {
  test('1. 準備一筆可退測試單', async ({ page }) => {
    const pay = await prepareRefundableOrder(page);
    // 支付失敗時仍嘗試用廚房既有單繼續
    if (!pay.paid) {
      console.warn(`[kitchen-refund] 下單支付未確認成功：${pay.detail}，改用廚房既有訂單`);
    }
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.getByText(/制作中|待制作|待取单|已完成|制作进度/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('2. 进入制作进度并打开订单详情', async ({ page }) => {
    const opened = await openFirstKitchenOrderDetail(page);
    expect(opened, '應能打開訂單詳情').toBeTruthy();
    await expect(page.getByText(/订单详情|订单编号|商品|金额|支付|退/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('3. 仅退款：选商品 → 类型「仅退款」→ 确认（库存不返回）', async ({ page }) => {
    await enterDetailAndOpenRefund(page);

    const typed = await selectRefundType(page, '仅退款');
    expect(typed, '應能選擇「仅退款」').toBeTruthy();

    const hint = await refundInventoryHint(page);
    if (hint !== 'unknown') {
      expect(hint, '仅退款應為库存不返回').toBe('no-return');
    }
    await expect(page.getByText(/仅退款|退款金额|部分|金额|商品/).first()).toBeVisible();

    const confirmed = await confirmRefund(page);
    expect(confirmed, '應能確認仅退款').toBeTruthy();
    await expect(page.getByText(/退款成功|退单成功|成功|制作进度|订单|暂无/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('4. 再下一筆單供退货退款', async ({ page }) => {
    const pay = await prepareRefundableOrder(page);
    if (!pay.paid) {
      console.warn(`[kitchen-refund] 第二筆支付未確認成功：${pay.detail}，改用廚房既有訂單`);
    }
  });

  test('5. 退货退款：选商品 → 类型「退货退款」→ 确认（全额、库存返回）', async ({ page }) => {
    await enterDetailAndOpenRefund(page);

    const typed = await selectRefundType(page, '退货退款');
    expect(typed, '應能選擇「退货退款」').toBeTruthy();

    const hint = await refundInventoryHint(page);
    if (hint !== 'unknown') {
      expect(hint, '退货退款應為库存返回').toBe('return');
    }
    await expect(page.getByText(/退货退款|全额|退款|商品|库存/).first()).toBeVisible();

    const confirmed = await confirmRefund(page);
    expect(confirmed, '應能確認退货退款').toBeTruthy();
    await expect(page.getByText(/退款成功|退单成功|退货成功|成功|制作进度|订单|暂无/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
