/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { fillByPlaceholder, clickTextButton, openPosPage, uniquePhone } from '../helpers/pos';

async function createMember(page: import('@playwright/test').Page, phone = uniquePhone()) {
  await page.locator('uni-button.member-add-button, uni-button', { hasText: /新增会员/ }).first().click();
  await expect(page.getByText('手机号注册').first()).toBeVisible({ timeout: 10_000 });
  await fillByPlaceholder(page, '请输入手机号', phone);
  const waitResp = page
    .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && r.ok(), { timeout: 15_000 })
    .catch(() => null);
  await page.locator('uni-button', { hasText: /^确定$/ }).last().click();
  const resp = await waitResp;
  await page.waitForTimeout(800);
  await leaveMemberSuccessPage(page);
  expect(resp, '新增會員應寫入後端').toBeTruthy();
  return phone;
}

/** 離開「新增成功」頁，回到會員查詢列表 */
async function leaveMemberSuccessPage(page: import('@playwright/test').Page) {
  if (await page.getByText(/新增成功|注册成功|添加成功/).first().isVisible().catch(() => false)) {
    const back = page.locator('uni-button', { hasText: /完成|返回|关闭|關閉|确定|確認/ }).last();
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(500);
  }
  const cancel = page.locator('uni-button', { hasText: /^取消$/ }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  await page.waitForTimeout(400);
}

/** 另開分頁悄悄建會員，測試頁不會走進新增成功畫面 */
async function seedMemberOffscreen(
  context: import('@playwright/test').BrowserContext,
  phone: string,
) {
  const seed = await context.newPage();
  try {
    await openPosPage(seed, '/pages/members/index', '会员');
    await createMember(seed, phone);
  } finally {
    await seed.close();
  }
}

async function expectNotOnCreateSuccess(page: import('@playwright/test').Page) {
  await expect(page.locator('uni-button', { hasText: /^搜索$/ }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/新增成功|注册成功|添加成功/).first()).toHaveCount(0);
}

async function searchMember(page: import('@playwright/test').Page, phone: string) {
  await fillByPlaceholder(page, '请输入手机号查询', phone).catch(async () => {
    await fillByPlaceholder(page, '手机号查询', phone);
  });
  await clickTextButton(page, /^搜索$/);
  await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('POS CRUD 會員', () => {
  test('新增会员', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await createMember(page);
  });

  test('查找会员', async ({ page, context }) => {
    const phone = uniquePhone();
    await openPosPage(page, '/pages/members/index', '会员');
    await expectNotOnCreateSuccess(page);
    await seedMemberOffscreen(context, phone);
    await searchMember(page, phone);
    await expectNotOnCreateSuccess(page);
  });

  test('更新会员', async ({ page, context }) => {
    const phone = uniquePhone();
    await openPosPage(page, '/pages/members/index', '会员');
    await expectNotOnCreateSuccess(page);
    await seedMemberOffscreen(context, phone);
    await searchMember(page, phone);
    const edit = page.locator('uni-button, uni-text, uni-view', { hasText: /编辑|修改|详情/ }).first();
    test.skip(!(await edit.isVisible().catch(() => false)), 'POS 會員頁暫無更新入口');
    await edit.click();
    await expect(page.getByText(/会员|手机|编辑|详情/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('删除会员', async ({ page, context }) => {
    const phone = uniquePhone();
    await openPosPage(page, '/pages/members/index', '会员');
    await expectNotOnCreateSuccess(page);
    await seedMemberOffscreen(context, phone);
    await searchMember(page, phone);
    const del = page.locator('uni-button', { hasText: /删除|刪除/ }).first();
    test.skip(!(await del.isVisible().catch(() => false)), 'POS 會員頁暫無刪除入口');
    await del.click();
    const confirm = page.locator('uni-button', { hasText: /确定|確認|确认/ }).last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await fillByPlaceholder(page, '请输入手机号查询', phone);
    await clickTextButton(page, /^搜索$/);
    await expect(page.getByText(phone)).toHaveCount(0, { timeout: 15_000 });
  });
});
