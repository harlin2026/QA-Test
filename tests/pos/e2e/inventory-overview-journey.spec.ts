/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { openInventoryOverview, openPosPage } from '../helpers/pos';

test.describe.configure({ mode: 'serial' });

test.describe('E2E POS 即時庫存總覽閉環', () => {
  test('1. 總覽可見庫存快捷工具', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/实时库存查询|查看商品库存/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('2. 進入庫存總覽並看到庫存狀態', async ({ page }) => {
    await openInventoryOverview(page);
    await expect(page.getByText(/库存总览|剩余库存|售罄|一键同步/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('3. 回到總覽仍可用', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expect(page.getByText(/实时营收概览|营业实收|订单数/).first()).toBeVisible({ timeout: 15_000 });
  });
});
