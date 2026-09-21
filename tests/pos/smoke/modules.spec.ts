/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import modules from '../fixtures/modules.json';
import { clickPosNav, expectPosShell, openInventoryOverview, openPosPage } from '../helpers/pos';

type ModuleCase = {
  module: string;
  name: string;
  path: string;
  nav?: string;
  checks: string[];
};

for (const mod of modules as ModuleCase[]) {
  test.describe(`${mod.module} / ${mod.name}`, () => {
    test(`開啟 ${mod.path} 功能可用`, async ({ page }) => {
      if (mod.path === '/pages/inventory/create') {
        await openPosPage(page, '/pages/inventory/index', '存酒');
        await page.locator('uni-button', { hasText: /新建存酒/ }).first().click();
        await expect(page).toHaveURL(/\/pages\/inventory\/create/, { timeout: 15_000 });
      } else if (mod.path === '/pages/inventory/overview') {
        await openInventoryOverview(page);
      } else if (mod.nav) {
        await openPosPage(page, '/pages/pos/index', '点单');
        await clickPosNav(page, mod.nav);
        await expect(page).toHaveURL(new RegExp(mod.path.replace(/\//g, '\\/')), { timeout: 15_000 });
      } else {
        await openPosPage(page, mod.path, mod.nav);
      }

      await expectPosShell(page);

      for (const check of mod.checks) {
        if (check === 'posShell') await expectPosShell(page);
        if (check === 'productGrid') {
          await expect(page.getByText(/全部\(/).or(page.locator('uni-button', { hasText: /搜索/ })).first()).toBeVisible({
            timeout: 15_000,
          });
        }
        if (check === 'statusTabs') {
          await expect(page.getByText(/待制作|制作中|已完成|待取单|超时单/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'orderList') {
          await expect(page.getByText(/订单编号|全部|待支付|已完成|售后/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'memberSearch') {
          await expect(page.getByText(/请输入手机号查询|新增会员/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'wineList') {
          await expect(page.getByText(/新建存酒|寄存中|即将到期|已过期/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'wineCreate') {
          await expect(page.getByText(/确认存酒登记|顾客姓名|酒品名称/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'cleaning') {
          await expect(page.getByText(/未沽清|已沽清|商品规格沽清/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'dashboard') {
          await expect(page.getByText(/实时营收概览|营业实收|订单数/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'inventoryOverview') {
          await expect(page.getByText(/库存总览|剩余库存|一键同步|售罄/).first()).toBeVisible({ timeout: 15_000 });
        }
        if (check === 'scanEntry') {
          const scanBtn = page.locator('uni-button.scan-entry, uni-button, .scan-entry', { hasText: /^扫码$/ }).first();
          await expect(scanBtn).toBeVisible({ timeout: 10_000 });
        }
      }
    });
  });
}
