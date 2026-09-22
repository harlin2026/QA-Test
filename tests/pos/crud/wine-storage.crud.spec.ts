/**
 * @author harlin
 */

import { test, expect, type Page } from '../../fixtures/base-test';
import {
  clickTextButton,
  fillPosFieldRow,
  openPosPage,
  uniqueLabel,
  uniquePhone,
} from '../helpers/pos';

async function hookToasts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { uni?: { showToast?: Function }; __qaToasts?: string[] };
    w.__qaToasts = [];
    const orig = w.uni?.showToast?.bind(w.uni);
    if (!w.uni || !orig) return;
    w.uni.showToast = (opts: { title?: string }) => {
      if (opts?.title) w.__qaToasts!.push(String(opts.title));
      return orig(opts);
    };
  });
}

/**
 * uni-app create 頁的 setup 回傳 render function，H/se 關在閉包裡，
 * 元件 setupState 是空的。必須沿 input 往上呼叫 onUpdate:modelValue，
 * 才能寫進 v-model（H.value.name / se[].wineName 等）。
 */
async function createWine(page: Page) {
  const customer = uniqueLabel('E2E顾客');
  const phone = uniquePhone();
  const wineName = uniqueLabel('E2E酒');

  await page.locator('uni-button', { hasText: /新建存酒/ }).first().click();
  await expect(page).toHaveURL(/\/pages\/inventory\/create/, { timeout: 15_000 });
  await hookToasts(page);

  // 手機號 watcher 會立刻清空姓名，並 500ms 後查會員。必須先填手機、等查詢結束，再填姓名。
  await fillPosFieldRow(page, '手机号码', phone);
  await page.waitForTimeout(900);
  await fillPosFieldRow(page, '顾客姓名', customer);
  await fillPosFieldRow(page, '酒品名称', wineName);
  await fillPosFieldRow(page, '存入数量', '1');

  const writes: string[] = [];
  page.on('response', (r) => {
    if (['POST', 'PUT', 'PATCH'].includes(r.request().method())) {
      writes.push(`${r.request().method()} ${r.status()} ${r.url()}`);
    }
  });
  const waitResp = page.waitForResponse(
    (r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && r.ok(),
    { timeout: 8_000 },
  );
  await page.locator('uni-button', { hasText: /确认存酒登记/ }).last().click({ force: true });
  const resp = await waitResp.catch(() => null);
  await page.waitForURL((url) => !/\/create/.test(url.pathname), { timeout: 8_000 }).catch(() => null);

  if (/\/create/.test(page.url())) {
    const toasts = await page.evaluate(() => (window as unknown as { __qaToasts?: string[] }).__qaToasts || []);
    throw new Error(
      `存酒未落庫，仍停在表單頁${toasts.length ? `：${toasts.join('；')}` : ''}${
        writes.length ? `；請求 ${writes.join(' | ')}` : '；沒有寫入 API'
      }`,
    );
  }

  expect(resp, '存酒登記應寫入後端').toBeTruthy();
  await expect(page).toHaveURL(/\/pages\/inventory\/index/, { timeout: 15_000 });
  return { customer, wineName };
}

async function searchWine(page: Page, wineName: string, customer: string) {
  const searchPh = page.locator('.uni-input-placeholder', { hasText: /搜索顾客|酒名|手机号/ }).first();
  if (await searchPh.count()) {
    const input = searchPh.locator('xpath=ancestor::*[contains(@class,"uni-input-wrapper")][1]//input');
    await input.fill(wineName);
    await clickTextButton(page, /^搜索$/);
  }
  await expect(page.getByText(wineName).or(page.getByText(customer)).first()).toBeVisible({ timeout: 15_000 });
}

/** 另開分頁建存酒，查找頁不會走進新建表單 */
async function seedWineOffscreen(context: import('@playwright/test').BrowserContext) {
  const seed = await context.newPage();
  try {
    await openPosPage(seed, '/pages/inventory/index', '存酒');
    return await createWine(seed);
  } finally {
    await seed.close();
  }
}

async function expectWineListPage(page: Page) {
  await expect(page).toHaveURL(/\/pages\/inventory\/index/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/pages\/inventory\/create/);
  await expect(page.locator('uni-button', { hasText: /新建存酒/ }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('uni-button', { hasText: /确认存酒登记/ })).toHaveCount(0);
}

test.describe('POS CRUD 存酒', () => {
  test('新增存酒', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await createWine(page);
  });

  test('查找存酒', async ({ page, context }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectWineListPage(page);
    const created = await seedWineOffscreen(context);
    await expectWineListPage(page);
    await searchWine(page, created.wineName, created.customer);
    await expectWineListPage(page);
  });
});
