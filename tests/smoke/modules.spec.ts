/**
 * @author harlin
 */

import { test } from '../fixtures/base-test';
import modules from '../fixtures/modules.json';
import {
  expectAppShell,
  expectAuthenticated,
  expectDashboard,
  expectPageReady,
  expectSearchControls,
  expectTableOrEmpty,
} from '../helpers/page-checks';

type ModuleCase = {
  module: string;
  name: string;
  path: string;
  checks: string[];
};

/**
 * 冒煙：頁面可用性
 * 錯誤彈窗 / pageerror / 失敗 API 由全域 register-error-guard 統一檢查
 */
for (const mod of modules as ModuleCase[]) {
  test.describe(`${mod.module} / ${mod.name}`, () => {
    test(`開啟 ${mod.path} 功能可用`, async ({ page }) => {
      await page.goto(mod.path, { waitUntil: 'domcontentloaded' });
      await expectAuthenticated(page);
      await expectAppShell(page);

      for (const check of mod.checks) {
        if (check === 'dashboard') await expectDashboard(page);
        if (check === 'tableOrEmpty') await expectTableOrEmpty(page);
        if (check === 'search') await expectSearchControls(page);
        if (check === 'pageReady') await expectPageReady(page);
      }
    });
  });
}
