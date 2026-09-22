/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import {
  confirmDestructive,
  fillStable,
  uniqueShort,
  uploadFirstImage,
  waitForWriteApi,
  filterByPlaceholder,
  expectRowVisible,
  expectRowGone,
  tableRow,
} from '../helpers/crud';

test.describe.configure({ timeout: 180_000 });

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function openList(page: Page) {
  await page.goto('/promotion/coupons');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

async function fillDate(input: ReturnType<Page['getByPlaceholder']>, value: string) {
  if (!(await input.isVisible().catch(() => false))) return;
  await input.click();
  await input.fill(value);
  await input.press('Enter').catch(() => {});
}

async function createCoupon(page: Page, couponName = uniqueShort('E2E券', 12)) {
  await page.getByRole('button', { name: '添加优惠券' }).click();
  await expect(page).toHaveURL(/\/promotion\/coupons\/create/, { timeout: 15_000 });

  await fillStable(page.getByPlaceholder(/请输入促销名称/).first(), couponName);
  await uploadFirstImage(page, { filename: 'coupon.png', size: 750 });

  const scopeStore = page.getByRole('checkbox', { name: /门店/ }).first();
  if (await scopeStore.isVisible().catch(() => false) && !(await scopeStore.isChecked().catch(() => false))) {
    await scopeStore.check().catch(() => scopeStore.click());
  }
  const takeout = page.getByRole('checkbox', { name: /外卖/ }).first();
  if (await takeout.isVisible().catch(() => false)) await takeout.check().catch(() => takeout.click());

  await fillDate(page.getByPlaceholder('开始日期').first(), plusDays(1));
  await fillDate(page.getByPlaceholder('结束日期').first(), plusDays(8));

  const afterClaim = page.getByRole('radio', { name: /领取后立即生效/ }).first();
  if (await afterClaim.isVisible().catch(() => false)) {
    await afterClaim.check().catch(() => afterClaim.click());
  }
  const days = page
    .locator('.ant-radio-wrapper', { hasText: /领取后立即生效/ })
    .locator('input:not([type="radio"])')
    .first();
  if (await days.isVisible().catch(() => false)) await fillStable(days, '7');

  const amountItem = page.locator('.ant-form-item, .ant-row').filter({ hasText: /优惠金额/ }).first();
  const amount = amountItem.locator('input').first();
  if (await amount.isVisible().catch(() => false)) await fillStable(amount, '1');

  const allStores = page.getByRole('radio', { name: /全部门店/ }).first();
  if (await allStores.isVisible().catch(() => false)) await allStores.click();

  const rule = page.getByPlaceholder(/说明/).first();
  if (await rule.isVisible().catch(() => false)) await rule.fill('E2E CRUD');

  const waitResp = waitForWriteApi(page, 20_000);
  await page.getByRole('button', { name: /^保\s*存$/ }).click();
  const resp = await waitResp;
  const err = page.locator('.ant-message-error, .ant-form-item-explain-error:visible').first();
  if (await err.isVisible().catch(() => false)) {
    throw new Error(`優惠券儲存失敗：${(await err.innerText()).trim()}`);
  }
  if (!resp && /\/coupons\/create/.test(page.url())) {
    throw new Error('優惠券未落庫：仍停在創建頁且無成功寫入');
  }
  return couponName;
}

test.describe('CRUD 优惠券', () => {
  test('新增优惠券', async ({ page }) => {
    await openList(page);
    const name = await createCoupon(page);
    await openList(page);
    await filterByPlaceholder(page, '请输入优惠券名称', name);
    await expectRowVisible(page, name);
  });

  test('查找优惠券', async ({ page }) => {
    await openList(page);
    const name = await createCoupon(page);
    await openList(page);
    await filterByPlaceholder(page, '请输入优惠券名称', name);
    await expectRowVisible(page, name);
  });

  test('更新优惠券', async ({ page }) => {
    await openList(page);
    const name = await createCoupon(page);
    const updated = `${name}U`.slice(0, 12);
    await openList(page);
    await filterByPlaceholder(page, '请输入优惠券名称', name);
    await expectRowVisible(page, name);
    await tableRow(page, name).getByRole('button', { name: /编\s*辑/ }).click({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/promotion\/coupons/, { timeout: 15_000 });
    const sc = page.locator('.ant-form-item', { hasText: /优惠券名称/ }).locator('input').first();
    await expect(sc).toBeVisible({ timeout: 15_000 });
    await expect(sc).toBeEnabled({ timeout: 15_000 });
    await expect(sc).toHaveValue(name, { timeout: 15_000 });
    await fillStable(sc, updated);
    const waitUpdate = waitForWriteApi(page, 20_000);
    await page.getByRole('button', { name: /^保\s*存$/ }).click({ timeout: 8_000 });
    await waitUpdate;
    await openList(page);
    await filterByPlaceholder(page, '请输入优惠券名称', updated);
    await expectRowVisible(page, updated);
  });

  test('删除优惠券', async ({ page }) => {
    await openList(page);
    const name = await createCoupon(page);
    await openList(page);
    await filterByPlaceholder(page, '请输入优惠券名称', name);
    await expectRowVisible(page, name);
    await tableRow(page, name).getByRole('button', { name: /删\s*除/ }).click();
    await confirmDestructive(page);
    await filterByPlaceholder(page, '请输入优惠券名称', name);
    await expectRowGone(page, name);
  });
});
