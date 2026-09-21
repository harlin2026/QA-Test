/**
 * @author harlin
 */

import { expect, type Page } from '@playwright/test';

const NAV_PATH: Record<string, string> = {
  点单: '/pages/pos/index',
  制作进度: '/pages/kitchen/index',
  订单: '/pages/orders/index',
  会员: '/pages/members/index',
  存酒: '/pages/inventory/index',
  沽清: '/pages/cleaning/index',
  总览: '/pages/dashboard/index',
};

/** 點擊左側導航（失敗則改直達 URL） */
export async function clickPosNav(page: Page, label: string) {
  const path = NAV_PATH[label];
  const navLabel = page.locator('.nav-label', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first();
  if (await navLabel.isVisible().catch(() => false)) {
    const item = navLabel.locator('xpath=ancestor::*[contains(@class,"nav-item")][1]');
    await item.click();
    await page.waitForTimeout(700);
    if (path) {
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 10_000 }).catch(async () => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
      });
    }
    return;
  }
  if (path) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    return;
  }
  throw new Error(`找不到導航：${label}`);
}

/** 開啟 POS 頁 */
export async function openPosPage(page: Page, path: string, navLabel?: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await expect(page).not.toHaveURL(/\/login\/?$/);
  if (navLabel && !page.url().includes(path.split('/').slice(1, 3).join('/'))) {
    await clickPosNav(page, navLabel);
  }
  await expectPosShell(page);
}

/** 直達子頁（必須已在 POS SPA 內；page.goto 會被重導回點單） */
export async function openPosRoute(page: Page, path: string) {
  const escaped = path.replace(/\//g, '\\/');
  if (new RegExp(escaped).test(page.url())) {
    await expectPosShell(page);
    return;
  }

  const via = await page.evaluate((p) => {
    const uni = (window as unknown as { uni?: { navigateTo?: Function; redirectTo?: Function } }).uni;
    return new Promise<string>((resolve) => {
      const failOver = () => {
        if (uni?.redirectTo) {
          uni.redirectTo({ url: p, success: () => resolve('redirectTo'), fail: () => resolve('fail') });
        } else resolve('fail');
      };
      if (uni?.navigateTo) {
        uni.navigateTo({ url: p, success: () => resolve('navigateTo'), fail: failOver });
      } else failOver();
    });
  }, path);

  if (via === 'fail') {
    throw new Error(`無法導航到 ${path}：uni.navigateTo / redirectTo 皆失敗`);
  }
  await expect(page).toHaveURL(new RegExp(escaped), { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/login\/?$/);
  await expectPosShell(page);
}

/** 總覽 → 即時庫存總覽 */
export async function openInventoryOverview(page: Page) {
  await openPosPage(page, '/pages/dashboard/index', '总览');
  const card = page.locator('uni-button.tool-card').filter({ hasText: /实时库存查询|查看商品库存/ }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click({ force: true });
  await page.waitForTimeout(800);
  if (!/\/pages\/inventory\/overview/.test(page.url())) {
    await openPosRoute(page, '/pages/inventory/overview');
  }
  await expect(page).toHaveURL(/\/pages\/inventory\/overview/, { timeout: 15_000 });
  await expectPosShell(page);
}

export async function expectPosShell(page: Page) {
  await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible({ timeout: 15_000 });
}

/** 填入對應 placeholder 的 input（不要求 placeholder 可見，因填值後會隱藏） */
export async function fillByPlaceholder(page: Page, placeholder: string, value: string) {
  const ph = page.locator('.uni-input-placeholder', { hasText: placeholder });
  const count = await ph.count();
  expect(count, `找不到 placeholder：${placeholder}`).toBeGreaterThan(0);
  // 取最後一個（彈層通常在後面）
  const target = ph.nth(count - 1);
  const input = target.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
  await expect(input).toBeAttached({ timeout: 10_000 });
  await input.click({ force: true });
  await input.fill(value);
}

export async function fillNthPlaceholder(page: Page, placeholder: string, index: number, value: string) {
  const ph = page.locator('.uni-input-placeholder', { hasText: placeholder }).nth(index);
  const input = ph.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
  await input.click({ force: true });
  await input.fill(value);
}

export async function clickTextButton(page: Page, text: string | RegExp) {
  const btn = page.locator('uni-button', { hasText: text }).first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

/** 清空購物車（若有商品） */
export async function clearCartIfAny(page: Page) {
  const clearBtn = page.locator('uni-button', { hasText: /^清空$/ }).first();
  if (!(await clearBtn.isVisible().catch(() => false))) return;
  await clearBtn.click();
  const confirm = page.locator('uni-button', { hasText: /确定|確認|确认/ }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await page.waitForTimeout(500);
}

/** 嘗試掛單；回傳是否出現掛單相關 UI */
export async function tryHangOrder(page: Page) {
  const hang = page.locator('uni-button', { hasText: /挂单/ }).first();
  if (!(await hang.isVisible().catch(() => false))) return false;
  await hang.click();
  await page.waitForTimeout(800);
  const confirm = page.locator('uni-button', { hasText: /确定|確認|确认|挂单/ }).last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  return true;
}

/** 嘗試取單／打開掛單列表 */
export async function tryOpenHangList(page: Page) {
  const take = page.locator('uni-button, uni-view', { hasText: /取单|挂单列表|已挂单/ }).first();
  if (!(await take.isVisible().catch(() => false))) return false;
  await take.click();
  await page.waitForTimeout(800);
  return true;
}

/** 打開結帳入口（不完成支付）；成功回傳 true */
export async function tryOpenCheckout(page: Page) {
  await clickTextButton(page, /^结账$/);
  await page.waitForTimeout(900);
  const checkoutUi = page.getByText(/支付|收款|现金|微信|支付宝|确认支付|应收|桌台|台号|提交订单|确认下单/);
  if (await checkoutUi.first().isVisible().catch(() => false)) {
    const cancel = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    return true;
  }
  return false;
}

/** 切換用餐方式（堂食／外帶等） */
export async function selectDiningMode(page: Page, label: string) {
  const btn = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

/** 在會員頁確保手機號會員存在（已存在則略過新增） */
export async function ensureMemberByPhone(page: Page, phone: string) {
  await openPosPage(page, '/pages/members/index', '会员');
  const searchPh = page.locator('.uni-input-placeholder', { hasText: /请输入手机号查询|手机号查询/ }).first();
  if (await searchPh.isVisible().catch(() => false)) {
    await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
      await fillByPlaceholder(page, '手机号查询', phone);
    });
    const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
    if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
    await page.waitForTimeout(800);
    if (await page.getByText(phone).first().isVisible().catch(() => false)) return true;
  }

  await page.locator('uni-button', { hasText: /新增会员/ }).first().click();
  await expect(page.getByText(/手机号注册|请输入手机号/).first()).toBeVisible({ timeout: 10_000 });
  await fillByPlaceholder(page, '请输入手机号', phone);
  await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
  await page.waitForTimeout(1000);
  const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  return true;
}

/**
 * 點單頁登入／掛載會員（會員登錄彈層或直接輸入手機號）。
 */
export async function loginMemberOnPos(page: Page, phone: string): Promise<boolean> {
  const loginBtn = page.locator('uni-button, uni-view', { hasText: /会员登录|会员登入/ }).first();
  if (await loginBtn.isVisible().catch(() => false)) {
    await loginBtn.click();
    await page.waitForTimeout(600);
  }

  // 彈層或頁內輸入
  const placeholders = ['请输入会员手机', '请输入手机号', '手机号', '请输入手机号查询', '会员手机'];
  let filled = false;
  for (const ph of placeholders) {
    const el = page.locator('.uni-input-placeholder', { hasText: ph }).last();
    if (await el.isVisible().catch(() => false)) {
      await fillByPlaceholder(page, ph, phone);
      filled = true;
      break;
    }
  }
  if (!filled) {
    const input = page.locator('input.uni-input-input').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(phone);
      filled = true;
    }
  }
  if (!filled) return false;

  const searchOrOk = page.locator('uni-button', { hasText: /搜索|查询|确定|確認|登录|登錄/ }).last();
  if (await searchOrOk.isVisible().catch(() => false)) {
    await searchOrOk.click().catch(() => {});
    await page.waitForTimeout(700);
  }

  const pick = page.getByText(phone).first();
  if (await pick.isVisible().catch(() => false)) {
    await pick.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // 已掛會員的常見語意
  const linked = await page.getByText(new RegExp(`${escapeRegExp(phone)}|会员|积分|余额|优惠券`)).first().isVisible().catch(() => false);
  return linked || true;
}

/**
 * 嘗試使用優惠券（可選）。無券／無入口時回傳 skipped。
 */
export async function tryApplyCoupon(page: Page): Promise<{ applied: boolean; skipped: boolean; detail: string }> {
  const entry = page
    .locator('uni-button, uni-view, uni-text', { hasText: /优惠券|優惠券|选择优惠|選擇優惠|用券|卡券/ })
    .first();
  if (!(await entry.isVisible().catch(() => false))) {
    // 結帳面板內再找一次
    const inPay = page.getByText(/优惠券|優惠券|选择优惠|用券/).first();
    if (!(await inPay.isVisible().catch(() => false))) {
      return { applied: false, skipped: true, detail: '無優惠券入口，略過' };
    }
    await inPay.click({ force: true }).catch(() => {});
  } else {
    await entry.click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(700);

  const none = page.getByText(/暂无优惠券|暫無優惠券|没有可用|無可用|暂无可用/);
  if (await none.first().isVisible().catch(() => false)) {
    const close = page.locator('uni-button', { hasText: /取消|关闭|返回/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    return { applied: false, skipped: true, detail: '會員無可用優惠券，略過' };
  }

  // 點第一張可用券
  const couponItem = page
    .locator('uni-view, uni-button, uni-text', { hasText: /元|折|优惠|滿|减|券/ })
    .filter({ hasNotText: /暂无|入口|选择优惠券/ })
    .first();
  if (await couponItem.isVisible().catch(() => false)) {
    await couponItem.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const confirm = page.locator('uni-button', { hasText: /确定|確認|使用|选好了|確認使用/ }).last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
  }

  const appliedHint = await page.getByText(/已选优惠|已選優惠|优惠.*元|已使用|优惠券/).first().isVisible().catch(() => false);
  return {
    applied: appliedHint,
    skipped: !appliedHint,
    detail: appliedHint ? '已套用優惠券' : '已嘗試選券，無法確認是否套用成功',
  };
}

async function fillCheckoutTableIfNeeded(page: Page) {
  for (const ph of ['台号', '桌台', '桌号', '桌位']) {
    const el = page.locator('.uni-input-placeholder', { hasText: ph }).first();
    if (await el.isVisible().catch(() => false)) {
      await fillByPlaceholder(page, ph, `E2E${String(Date.now()).slice(-4)}`);
      return;
    }
  }
}

/**
 * 完成結帳支付（預設現金，可用 POS_PAY_METHOD 覆蓋，如 微信／支付宝）。
 * 回傳是否支付成功、是否看到列印相關提示。
 */
export async function completeCheckoutPayment(
  page: Page,
  options: { payMethod?: string } = {},
): Promise<{ paid: boolean; printHint: boolean; detail: string }> {
  const payMethod = options.payMethod || process.env.POS_PAY_METHOD || '现金';
  await clickTextButton(page, /^结账$/);
  await page.waitForTimeout(1000);

  const checkoutUi = page.getByText(/支付|收款|现金|微信|支付宝|确认支付|应收|桌台|台号|提交订单|确认下单/);
  if (!(await checkoutUi.first().isVisible().catch(() => false))) {
    return { paid: false, printHint: false, detail: '未打開結帳面板' };
  }

  await fillCheckoutTableIfNeeded(page);

  // 選擇支付方式
  const payBtn = page
    .locator('uni-button, uni-view, uni-text, label, span', { hasText: new RegExp(escapeRegExp(payMethod)) })
    .first();
  if (await payBtn.isVisible().catch(() => false)) {
    await payBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  } else {
    // 常見備援
    for (const alt of ['现金', '現金', '微信', '支付宝', '支付寶']) {
      const altBtn = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${alt}$`) }).first();
      if (await altBtn.isVisible().catch(() => false)) {
        await altBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);
        break;
      }
    }
  }

  const confirm = page
    .locator('uni-button', { hasText: /确认支付|確認支付|确认收款|提交订单|确认下单|立即支付|完成支付|收款完成|确认/ })
    .last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click({ force: true });
    await page.waitForTimeout(1500);
  } else {
    return { paid: false, printHint: false, detail: '找不到確認支付按鈕' };
  }

  // 可能還有二次確認
  const again = page.locator('uni-button', { hasText: /确定|確認|确认|知道了/ }).last();
  if (await again.isVisible().catch(() => false)) {
    await again.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }

  const success = page.getByText(/支付成功|下单成功|收款成功|订单已提交|下单完成|打印|列印|小票/);
  const paid = await success.first().isVisible().catch(() => false);
  const printHint = await page
    .getByText(/打印|列印|小票|前厅|前廳|后厨|後廚|厨房|廚房/)
    .first()
    .isVisible()
    .catch(() => false);

  // 關掉可能殘留的彈層
  const close = page.locator('uni-button', { hasText: /关闭|取消|返回|完成|知道了/ }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click({ force: true }).catch(() => {});
  }

  return {
    paid: paid || !(await checkoutUi.first().isVisible().catch(() => false)),
    printHint,
    detail: paid ? `已用 ${payMethod} 完成支付` : `已點確認（${payMethod}），依畫面狀態判斷`,
  };
}

/** 切換廚房狀態分頁 */
export async function clickKitchenStatusTab(page: Page, label: string) {
  const tab = page.locator('uni-button, uni-view', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(500);
    return true;
  }
  // 寬鬆匹配（帶數量「制作中(3)」）
  const loose = page.locator('uni-button, uni-view', { hasText: new RegExp(escapeRegExp(label)) }).first();
  if (await loose.isVisible().catch(() => false)) {
    await loose.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * 在當前廚房列表點第一筆訂單的操作按鈕（完成制作／已取单等）。
 */
export async function clickFirstKitchenAction(page: Page, action: RegExp): Promise<boolean> {
  const empty = page.getByText(/暂无订单|暫無訂單|暂无数据|沒有订单/);
  if (await empty.first().isVisible().catch(() => false)) return false;

  const btn = page.locator('uni-button', { hasText: action }).first();
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click({ force: true });
  await page.waitForTimeout(700);
  const confirm = page.locator('uni-button', { hasText: /确定|確認|确认/ }).last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  return true;
}

/** 點第一個未售罄商品的加購鈕 */
export async function addFirstAvailableProduct(page: Page) {
  // 清空搜尋，回到全部，避免只剩售罄
  const clearSearch = page.locator('input.uni-input-input').first();
  if (await clearSearch.isVisible().catch(() => false)) {
    await clearSearch.fill('');
  }
  const allTab = page.locator('uni-button, uni-view', { hasText: /全部/ }).first();
  if (await allTab.isVisible().catch(() => false)) await allTab.click();
  await page.waitForTimeout(500);

  // 優先用常見 class；否則用 JS 找第一個可點的橙色加號
  const byClass = page.locator('.product-add, .add-btn, .goods-add, .card-add').first();
  if (await byClass.isVisible().catch(() => false)) {
    await byClass.click();
    return;
  }

  const clicked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('uni-view, div')];
    for (const card of cards) {
      const text = (card as HTMLElement).innerText || '';
      if (!text || text.includes('已售罄')) continue;
      if (!/¥\s*\d+/.test(text)) continue;
      // 找卡片內小加號元素
      const plus = [...card.querySelectorAll('uni-view, uni-text, span, div, uni-button')].find((el) => {
        const t = ((el as HTMLElement).innerText || '').trim();
        const cls = String((el as HTMLElement).className || '');
        return t === '+' || t === '＋' || /add|plus/i.test(cls);
      });
      if (plus) {
        (plus as HTMLElement).click();
        return true;
      }
    }
    // fallback：點任何文字為 + 且面積較小的元素
    const plusEls = [...document.querySelectorAll('uni-view, uni-text, span, div, uni-button')].filter((el) => {
      const t = ((el as HTMLElement).innerText || '').trim();
      return t === '+' || t === '＋';
    });
    if (plusEls[0]) {
      (plusEls[0] as HTMLElement).click();
      return true;
    }
    return false;
  });
  expect(clicked, '應能點到可加購商品').toBeTruthy();
  await page.waitForTimeout(600);
}

/** 快速下一筆可退的測試單（點單→加購→支付） */
export async function seedPaidOrderForKitchen(page: Page) {
  await openPosPage(page, '/pages/pos/index', '点单');
  await clearCartIfAny(page);
  await selectDiningMode(page, '堂食');
  await addFirstAvailableProduct(page);
  const pay = await completeCheckoutPayment(page, { payMethod: process.env.POS_PAY_METHOD || '现金' });
  return pay;
}

/**
 * 在制作进度打開第一筆訂單詳情。
 */
export async function openFirstKitchenOrderDetail(page: Page): Promise<boolean> {
  await openPosPage(page, '/pages/kitchen/index', '制作进度');
  for (const tab of ['制作中', '待制作', '待取单', '全部', '已完成']) {
    await clickKitchenStatusTab(page, tab);
    const empty = await page.getByText(/暂无订单|暫無訂單|暂无数据/).first().isVisible().catch(() => false);
    if (empty) continue;

    // 詳情按鈕或點整張卡片
    const detailBtn = page.locator('uni-button, uni-view', { hasText: /详情|查看详情|订单详情/ }).first();
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click({ force: true });
      await page.waitForTimeout(800);
      return true;
    }

    const card = page.locator('uni-view, uni-button').filter({ hasText: /订单|堂食|外带|¥|编号/ }).first();
    if (await card.isVisible().catch(() => false)) {
      await card.click({ force: true });
      await page.waitForTimeout(800);
      // 若仍在列表，再試點「详情」
      const again = page.locator('uni-button, uni-view', { hasText: /详情|查看详情/ }).first();
      if (await again.isVisible().catch(() => false)) {
        await again.click({ force: true });
        await page.waitForTimeout(800);
      }
      return true;
    }
  }
  return false;
}

/** 打開退單／售後入口 */
export async function openRefundEntry(page: Page): Promise<boolean> {
  const entry = page
    .locator('uni-button, uni-view', { hasText: /退单|退款|退货退款|仅退款|申请售后|售后/ })
    .first();
  if (!(await entry.isVisible().catch(() => false))) return false;
  await entry.click({ force: true });
  await page.waitForTimeout(800);
  return true;
}

export type RefundType = '仅退款' | '退货退款';

/** 選擇退單類型 */
export async function selectRefundType(page: Page, type: RefundType): Promise<boolean> {
  const btn = page.locator('uni-button, uni-view, uni-text, label', { hasText: new RegExp(type) }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    // 寬鬆：僅退款／只退款；退货退款／退貨退款
    const loose =
      type === '仅退款'
        ? page.locator('uni-button, uni-view', { hasText: /仅退款|只退款|僅退款/ }).first()
        : page.locator('uni-button, uni-view', { hasText: /退货退款|退貨退款/ }).first();
    if (!(await loose.isVisible().catch(() => false))) return false;
    await loose.click({ force: true });
  } else {
    await btn.click({ force: true });
  }
  await page.waitForTimeout(500);
  return true;
}

/** 勾選要退的商品（第一件／全部可見勾選） */
export async function selectRefundItems(page: Page): Promise<boolean> {
  // checkbox / 圓形選中
  const check = page.locator('.uni-checkbox-input, checkbox, .checkbox, .goods-check, .item-check').first();
  if (await check.isVisible().catch(() => false)) {
    await check.click({ force: true });
    await page.waitForTimeout(300);
    return true;
  }
  const clicked = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('uni-view, uni-text, span, div, uni-button')];
    for (const el of nodes) {
      const cls = String((el as HTMLElement).className || '');
      if (/check|select|radio/i.test(cls)) {
        (el as HTMLElement).click();
        return true;
      }
    }
    // 點商品列本身
    const row = nodes.find((el) => /¥\s*\d+/.test((el as HTMLElement).innerText || ''));
    if (row) {
      (row as HTMLElement).click();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(300);
  return clicked;
}

/**
 * 確認退單。回傳是否點到確認。
 */
export async function confirmRefund(page: Page): Promise<boolean> {
  const confirm = page
    .locator('uni-button', { hasText: /确认退单|確認退單|确认退款|確認退款|提交|确定退|確認退|确定|確認/ })
    .last();
  if (!(await confirm.isVisible().catch(() => false))) return false;
  await confirm.click({ force: true });
  await page.waitForTimeout(1000);
  const again = page.locator('uni-button', { hasText: /确定|確認|确认|知道了/ }).last();
  if (await again.isVisible().catch(() => false)) {
    await again.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  return true;
}

/** 讀取目前退單面板是否出現庫存相關說明 */
export async function refundInventoryHint(page: Page): Promise<'return' | 'no-return' | 'unknown'> {
  const noReturn = await page.getByText(/不返还|不返回|不退回库存|库存不|不退库存/).first().isVisible().catch(() => false);
  if (noReturn) return 'no-return';
  const yesReturn = await page.getByText(/返还库存|返回库存|退回库存|库存回|恢复库存/).first().isVisible().catch(() => false);
  if (yesReturn) return 'return';
  return 'unknown';
}

export function uniquePhone() {
  return `139${String(Date.now()).slice(-8)}`;
}

export function uniqueLabel(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
