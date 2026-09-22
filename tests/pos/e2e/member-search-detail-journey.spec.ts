/**
 * @author harlin
 *
 * 會員搜尋／新增與詳情閉環：
 * 输入手机号 → 搜索会员（或右上角添加会员）→
 * 进入会员详情查看：优惠券数量、消费记录
 */

import { test, expect } from '../../fixtures/base-test';
import {
  clickTextButton,
  fillByPlaceholder,
  openMemberAddDialog,
  openPosPage,
  uniquePhone,
} from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

const phone = process.env.POS_MEMBER_PHONE || uniquePhone();

async function openMemberDetailByPhone(page: import('@playwright/test').Page, mobile: string) {
  // 點列表中的該會員列／詳情
  const row = page.getByText(mobile).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click({ force: true });
  await page.waitForTimeout(700);

  const detailBtn = page.locator('uni-button, uni-view', { hasText: /详情|查看详情|会员详情/ }).first();
  if (await detailBtn.isVisible().catch(() => false)) {
    await detailBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  // 若仍停在列表，再點一次含手機號的卡片
  if (!(await page.getByText(/好礼券|优惠券|消费笔数|消费记录|会员详情|积分|余额/).first().isVisible().catch(() => false))) {
    await page.getByText(mobile).first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

test.describe('E2E POS 會員搜尋新增與詳情閉環', () => {
  test('1. 右上角添加会员（若已存在則略過）', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');

    // 先搜尋：已存在就不用新建
    await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
      await fillByPlaceholder(page, '手机号查询', phone);
    });
    await clickTextButton(page, /^搜索$/);
    await page.waitForTimeout(800);
    if (await page.getByText(phone).first().isVisible().catch(() => false)) {
      return;
    }

    await openMemberAddDialog(page);

    await fillByPlaceholder(page, '请输入手机号', phone);
    await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
    await page.waitForTimeout(1200);
    const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
  });

  test('2. 输入手机号 → 搜索会员', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
      await fillByPlaceholder(page, '手机号查询', phone);
    });
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
  });

  test('3. 进入会员详情可查看优惠券数量', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
      await fillByPlaceholder(page, '手机号查询', phone);
    });
    await clickTextButton(page, /^搜索$/);
    await openMemberDetailByPhone(page, phone);

    await expect(page.getByText(/好礼券|优惠券|優惠券/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/\d+\s*好礼券|好礼券[\s\S]{0,20}\d+|优惠券[\s\S]{0,12}\d+|Chill卡\s*\(\d+\)|暂无 Chill卡/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('4. 会员详情可查看消费记录', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
      await fillByPlaceholder(page, '手机号查询', phone);
    });
    await clickTextButton(page, /^搜索$/);
    await openMemberDetailByPhone(page, phone);

    const recordTab = page.locator('uni-button, uni-view', { hasText: /消费笔数|消费记录|消費記錄|交易记录|订单记录/ }).first();
    if (await recordTab.isVisible().catch(() => false)) {
      await recordTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/消费笔数|消费记录|消費記錄|交易记录|订单|暂无记录|暫無記錄|暂无消费|金额|¥/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
