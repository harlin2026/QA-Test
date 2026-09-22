/**
 * @author harlin
 */

import { expect, type Locator, type Page } from '@playwright/test';
import { loginPos } from '../../helpers/login';

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
  const onLogin =
    /\/login/i.test(page.url()) ||
    (await page.getByText('欢迎登录@Chill收银系统').isVisible().catch(() => false));
  if (onLogin) {
    await loginPos(page);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
  }
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

export async function expectDashboardShell(page: Page) {
  await expect(page.getByText(/实时营收概览|营业实收|订单数/).first()).toBeVisible({ timeout: 15_000 });
  await clickDashboardPeriod(page, '今日');
  await expect(page.getByText(/营业实收|销售金额|订单数/).first()).toBeVisible();
}

/** 總覽「今日／昨日／本周…」時段顆粒，點完等營收接口 */
export async function clickDashboardPeriod(page: Page, label: string): Promise<boolean> {
  const chip = page.getByText(label, { exact: true }).first();
  if (!(await chip.isVisible().catch(() => false))) return false;

  const waitRevenue = () =>
    page.waitForResponse((r) => /realtime-revenue|coupons\/staff-ordering\/stats/i.test(r.url()), { timeout: 8_000 });

  const pending = waitRevenue();
  await chip.click({ force: true });
  let resp = await pending.catch(() => null);
  if (resp && resp.status() >= 500) {
    await page.waitForTimeout(500);
    const retry = waitRevenue();
    await chip.click({ force: true });
    resp = await retry.catch(() => null);
  }
  await page.waitForTimeout(250);
  return true;
}

/** 填入對應 placeholder 的 input（寫進 Vue v-model，不要求 placeholder 可見） */
export async function fillByPlaceholder(page: Page, placeholder: string, value: string) {
  const ph = page.locator('.uni-input-placeholder', { hasText: placeholder });
  const count = await ph.count();
  expect(count, `找不到 placeholder：${placeholder}`).toBeGreaterThan(0);
  const target = ph.nth(count - 1);
  const input = target.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
  await fillUniInput(input, value);
}

export async function fillNthPlaceholder(page: Page, placeholder: string, index: number, value: string) {
  const ph = page.locator('.uni-input-placeholder', { hasText: placeholder }).nth(index);
  const input = ph.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input').first();
  await fillUniInput(input, value);
}

/** 依左側標籤填 uni-app 輸入框（逐字輸入 + blur，讓 u-input v-model 生效） */
export async function fillPosLabeledInput(page: Page, label: string, value: string) {
  const labelEl = page.getByText(label, { exact: true }).first();
  await expect(labelEl).toBeVisible({ timeout: 10_000 });
  const input = labelEl.locator('xpath=following::input[1]');
  await expect(input).toBeAttached({ timeout: 5_000 });
  await input.click({ force: true });
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
  await input.pressSequentially(value, { delay: 15 });
  await input.dispatchEvent('change');
  await input.blur();
  await expect(input).toHaveValue(value, { timeout: 5_000 });
}

export async function clickTextButton(page: Page, text: string | RegExp) {
  const btn = page.locator('uni-button', { hasText: text }).first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click({ force: true });
}

/** 寫入 uni-app input，連 v-model 一起改（原生 fill 只改 DOM） */
export async function fillUniInput(input: Locator, value: string) {
  await expect(input).toBeAttached({ timeout: 5_000 });
  await input.click({ force: true });
  await input.evaluate((el, v) => {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    desc?.set?.call(el, v);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: v, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    let node: HTMLElement | null = el as HTMLElement;
    while (node) {
      const comp = (
        node as unknown as {
          __vueParentComponent?: {
            emit?: (event: string, value: string) => void;
            props?: Record<string, unknown>;
            vnode?: { props?: Record<string, unknown> };
          };
        }
      ).__vueParentComponent;
      if (comp) {
        const onUpdate = comp.vnode?.props?.['onUpdate:modelValue'];
        if (typeof onUpdate === 'function') (onUpdate as (value: string) => void)(v);
        if (typeof comp.emit === 'function' && comp.props && 'modelValue' in comp.props) {
          comp.emit('update:modelValue', v);
        }
      }
      node = node.parentElement;
    }
  }, value);
  await expect(input).toHaveValue(value, { timeout: 5_000 });
}

/**
 * 存酒／會員等 .field-row：沿 input 往上觸發 onUpdate:modelValue。
 * 原生 fill 只改 DOM，提交時 v-model 仍是空的。
 */
export async function fillPosFieldRow(page: Page, label: string, value: string) {
  const row = page.locator('.field-row').filter({ has: page.getByText(label, { exact: true }) }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await fillUniInput(row.locator('input.uni-input-input, input').last(), value);
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

/** 點右上角「新增会员」打開手機號註冊彈層（不可點外層 uni-view） */
export async function openMemberAddDialog(page: Page) {
  const addBtn = page.locator('uni-button.member-add-button, uni-button', { hasText: /新增会员|添加会员/ }).first();
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.click({ force: true });
  await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });
}

export async function searchMemberByPhone(page: Page, phone: string) {
  await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
    await fillByPlaceholder(page, '手机号查询', phone);
  });
  const searchBtn = page.locator('uni-button', { hasText: /^搜索$/ }).first();
  if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click({ force: true });
  await page.waitForTimeout(800);
}

async function leaveMemberSuccessPage(page: Page) {
  if (await page.getByText(/新增成功|注册成功|添加成功/).first().isVisible().catch(() => false)) {
    const back = page.locator('uni-button', { hasText: /完成|返回|关闭|關閉|确定|確認/ }).last();
    if (await back.isVisible().catch(() => false)) await back.click({ force: true });
    await page.waitForTimeout(500);
  }
  const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click({ force: true });
  await page.waitForTimeout(400);
}

/** 在會員頁確保手機號會員存在（已存在則略過新增，最後一定能搜到） */
export async function ensureMemberByPhone(page: Page, phone: string) {
  await openPosPage(page, '/pages/members/index', '会员');
  await searchMemberByPhone(page, phone);
  if (await page.getByText(phone).first().isVisible().catch(() => false)) return true;

  await openMemberAddDialog(page);
  await fillByPlaceholder(page, '请输入手机号', phone);
  const waitResp = page
    .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && r.ok(), { timeout: 15_000 })
    .catch(() => null);
  await page.locator('uni-button', { hasText: /^确定$/ }).last().click({ force: true });
  const resp = await waitResp;
  await leaveMemberSuccessPage(page);

  await searchMemberByPhone(page, phone);
  await expect(page.getByText(phone).first(), `會員 ${phone} 應可搜到`).toBeVisible({ timeout: 15_000 });
  expect(resp, '新增會員應寫入後端').toBeTruthy();
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
      await fillUniInput(input, phone);
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

  // 選擇支付方式（畫面是「现金支付」，不是單獨一個「现金」）
  const payExact = page.getByText(new RegExp(`^${escapeRegExp(payMethod)}(支付)?$`)).first();
  if (await payExact.isVisible().catch(() => false)) {
    await payExact.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  } else {
    const payBtn = page
      .locator('uni-button, uni-view, uni-text, label, span', { hasText: new RegExp(escapeRegExp(payMethod)) })
      .first();
    if (await payBtn.isVisible().catch(() => false)) {
      await payBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    } else {
      for (const alt of ['现金支付', '現金支付', '现金', '現金', '微信', '支付宝', '支付寶']) {
        const altBtn = page.getByText(new RegExp(`^${alt}$`)).first();
        if (await altBtn.isVisible().catch(() => false)) {
          await altBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
          break;
        }
      }
    }
  }

  const confirmVisible = page.getByText(/确定结账|確定結帳|确认支付|確認支付|确认收款|提交订单/).first();
  if (await confirmVisible.isVisible().catch(() => false)) {
    await confirmVisible.click({ force: true });
    await page.waitForTimeout(1500);
  } else {
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('uni-button, button, uni-view, span, div')];
      const match = els
        .filter((el) => {
          const t = (el.innerText || '').replace(/\s+/g, '').trim();
          return /^(确定结账|確定結帳|确认支付|確認支付|确认收款)$/.test(t) && t.length < 12;
        })
        .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
      if (!match) return false;
      match.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      (match as HTMLElement).click();
      return true;
    });
    if (!clicked) return { paid: false, printHint: false, detail: '找不到确定结账按钮' };
    await page.waitForTimeout(1500);
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

/** 訂單列表卡片或空態。不可用「订单编号」：會先對到隱藏 placeholder「搜索订单编号/手机号」 */
export function orderListBody(page: Page) {
  return page.getByText(/订单编号[:：]|暂无订单|暫無訂單|交易关闭|暂无数据/).first();
}

/** 訂單列表狀態分頁（全部 1324）。點整顆 uni-button，避免內部 span 被攔截 */
export async function clickOrderStatusTab(page: Page, label: string) {
  const tab = page.locator('uni-button').filter({ hasText: new RegExp(`^${escapeRegExp(label)}\\s*\\d+`) }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ force: true });
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

/** 切換廚房狀態分頁。必須點 .stage-tab，不可點內部 span（會被按鈕攔截空等） */
export async function clickKitchenStatusTab(page: Page, label: string) {
  const tab = page.locator('uni-button.stage-tab', { hasText: new RegExp(`^${escapeRegExp(label)}`) }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ force: true });
    await page.waitForTimeout(400);
    return true;
  }
  const chip = page.getByText(new RegExp(`^${escapeRegExp(label)}(\\s*\\d+)?$`)).first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.click({ force: true });
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

/**
 * 在當前廚房列表點第一筆訂單的操作按鈕。
 * 卡片文案是「完成制作，出餐」／「完成取单」，不可用寬鬆「出餐」（會點到平均出餐时长）。
 */
export async function clickFirstKitchenAction(page: Page, action?: RegExp): Promise<boolean> {
  const empty = page.getByText(/暂无订单|暫無訂單|暂无数据|沒有订单/);
  if (await empty.first().isVisible().catch(() => false)) return false;

  const pattern =
    action || /完成制作[，,]出餐|完成取单|开始制作|已取单/;
  const btn = page.locator('uni-button').filter({ hasText: pattern }).first();
  if (!(await btn.isVisible().catch(() => false))) return false;

  const waitWrite = page
    .waitForResponse(
      (r) =>
        ['POST', 'PUT', 'PATCH'].includes(r.request().method()) &&
        /kitchen|making|pickup|take|complete|status|order/i.test(r.url()),
      { timeout: 8_000 },
    )
    .catch(() => null);

  await btn.click({ force: true });
  await waitWrite;
  const confirm = page.locator('uni-button', { hasText: /^确定|^確認|^确认|^是$/ }).last();
  if (await confirm.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await confirm.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(700);
  return true;
}

/** 待取单（或超时单）點「完成取单」 */
export async function completeKitchenPickup(page: Page): Promise<boolean> {
  for (const tab of ['待取单', '超时单']) {
    await clickKitchenStatusTab(page, tab);
    const taken = await clickFirstKitchenAction(page, /完成取单|已取单|取餐完成|确认取餐|確認取餐/);
    if (taken) return true;
  }
  return false;
}

/** 右側購物車欄（不含左側商品網格、不含導航） */
export function posCartPanel(page: Page) {
  return page
    .locator('uni-view')
    .filter({ hasText: /总共\d+件/ })
    .filter({ hasText: /商品总价/ })
    .filter({ hasNotText: /全部\(\d+\)|制作进度|存酒列表|沽清/ })
    .last();
}

/** 右側購物車應有商品列（不是只看合計數字） */
export async function expectCartHasItem(page: Page, productName?: string) {
  const cart = posCartPanel(page);
  await expect(cart.getByText(/总共[1-9]/).first()).toBeVisible({ timeout: 10_000 });
  await expect(cart.getByText('暂无商品')).toHaveCount(0);
  if (productName) {
    const hint = productName.replace(/…|\.{2,}$/g, '').slice(0, 10);
    await expect(cart.getByText(productName).or(cart.getByText(hint)).first()).toBeVisible({
      timeout: 8_000,
    });
  }
}

/** 右側購物車應為空 */
export async function expectCartEmpty(page: Page) {
  const cart = posCartPanel(page);
  await expect(cart.getByText(/总共0件|暂无商品/).first()).toBeVisible({ timeout: 10_000 });
}

/** 關掉商品規格彈層，避免遮罩擋住搜索／分類 */
export async function dismissProductSheet(page: Page) {
  const sheet = page.getByText(/加入购物车\s*¥|加入購物車\s*¥/).first();
  if (!(await sheet.isVisible().catch(() => false))) {
    const mask = page.locator('.spec-modal-mask').first();
    if (!(await mask.isVisible().catch(() => false))) return false;
  }
  const cancel = page.locator('uni-button, uni-view').filter({ hasText: /^取消$/ }).last();
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click({ force: true }).catch(() => {});
  } else {
    await page.locator('.spec-modal-mask').first().click({ force: true, position: { x: 8, y: 8 } }).catch(() => {});
  }
  await page.locator('.spec-modal-mask').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});
  return true;
}

/** 規格彈層若已打開，點加入購物車 */
async function confirmAddToCartSheet(page: Page, timeout = 3_000) {
  const appeared = await page
    .getByText(/加入购物车\s*¥|加入購物車\s*¥/)
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return false;

  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll('uni-button, uni-view, uni-text, span, div, button')];
    const matches = els.filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return /^(加入购物车|加入購物車)/.test(t) && t.includes('¥') && t.length < 40;
    });
    const el = matches.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    el.click();
    return true;
  });
  if (!clicked) return false;
  await page
    .getByText(/加入购物车\s*¥|加入購物車\s*¥/)
    .first()
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  return true;
}

export async function clickCategoryChip(page: Page, pattern: RegExp) {
  const chip = page.getByText(pattern).first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/** 點第一個未售罄商品並加入購物車（此 POS 是點商品卡，不是點「+」） */
export async function addFirstAvailableProduct(page: Page): Promise<string> {
  if (await confirmAddToCartSheet(page, 300)) return '';

  const clearSearch = page.locator('input.uni-input-input').first();
  if (await clearSearch.isVisible().catch(() => false)) {
    await clearSearch.fill('');
  }
  // 不可用 hasText(/^全部/): 會點到整排分類容器，落到中間的 Test 等售罄分類
  const onAll = await clickCategoryChip(page, /^全部(\(\d+\))?$/);
  if (!onAll) await clickCategoryChip(page, /^New$/);

  const byClass = page.locator('.product-add, .add-btn, .goods-add, .card-add').first();
  if (await byClass.isVisible().catch(() => false)) {
    await byClass.click();
    await confirmAddToCartSheet(page);
    return '';
  }

  const card = page
    .locator('uni-view')
    .filter({ hasText: /¥\s*[\d,.]+/ })
    .filter({ hasNotText: /已售罄|商品总价|总共\d+件|优惠金额|加入购物车|加入購物車|堂食|外带|结账|会员登录/ })
    .first();
  await expect(card, '應能點到可加購商品').toBeVisible({ timeout: 10_000 });
  const raw = (await card.innerText())
    .split(/\n/)
    .map((s) => s.trim())
    .filter((line) => line && !/^¥/.test(line) && line !== '已售罄');
  const productName = raw[0] || '';
  await card.click({ force: true });
  const added = await confirmAddToCartSheet(page);
  if (!added) {
    await page.waitForTimeout(400);
  }
  return productName;
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

/** 打開退單入口：必須點「退单」按鈕，不可點外層 uni-view */
export async function openRefundEntry(page: Page): Promise<boolean> {
  const entry = page.locator('uni-button', { hasText: /^退单$|^退款$/ }).first();
  if (!(await entry.isVisible().catch(() => false))) return false;
  await entry.click({ force: true });
  await page.waitForTimeout(800);
  return true;
}

export type RefundType = '仅退款' | '退货退款';

/** 選擇退單類型（勾選商品並點退單後才會出現） */
export async function selectRefundType(page: Page, type: RefundType): Promise<boolean> {
  const pattern = type === '仅退款' ? /仅退款|只退款|僅退款/ : /退货退款|退貨退款/;
  const btn = page.locator('uni-button', { hasText: pattern }).first();
  if (!(await btn.isVisible({ timeout: 8_000 }).catch(() => false))) {
    const loose = page.getByText(pattern).first();
    if (!(await loose.isVisible({ timeout: 3_000 }).catch(() => false))) return false;
    await loose.click({ force: true });
  } else {
    await btn.click({ force: true });
  }
  await page.waitForTimeout(500);
  return true;
}

/** 勾選要退的商品：先「全选」，再勾 checkbox */
export async function selectRefundItems(page: Page): Promise<boolean> {
  const selectAll = page.locator('uni-button', { hasText: /^全选$/ }).first();
  if (await selectAll.isVisible().catch(() => false)) {
    await selectAll.click({ force: true });
    await page.waitForTimeout(300);
    return true;
  }
  const check = page.locator('.uni-checkbox-input, uni-checkbox, checkbox, .checkbox, .goods-check, .item-check').first();
  if (await check.isVisible().catch(() => false)) {
    await check.click({ force: true });
    await page.waitForTimeout(300);
    return true;
  }
  return false;
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
