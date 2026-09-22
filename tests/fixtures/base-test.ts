/**
 * @author harlin
 */

import { test as base, expect } from '@playwright/test';
import { captureDashboardShot } from '../helpers/dashboard-shot';
import { loginAdmin, loginPos, shouldAutoLogin } from '../helpers/login';
import { attachPageGuards, detectFlavor, expectNoUiErrors } from '../helpers/ui-errors';

/**
 * 共用 test：後台 / POS 的 smoke、CRUD、E2E
 * 每條用例通過後自動檢查錯誤彈窗、pageerror、失敗 API
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const file = testInfo.file.replace(/\\/g, '/');
    const isSetup = /\.setup\.(ts|js)$/.test(file);
    if (isSetup) {
      await use(page);
      return;
    }

    if (shouldAutoLogin(file, testInfo.title)) {
      if (detectFlavor(file) === 'pos') await loginPos(page);
      else await loginAdmin(page);
    }

    const guards = attachPageGuards(page);
    await use(page);

    const flavor = detectFlavor(testInfo.file);
    const label = testInfo.titlePath.join(' › ');
    try {
      if (testInfo.status === 'passed') {
        await expectNoUiErrors(page, label, { flavor, settleMs: 800 });
        guards.assertClean(label);
      }
    } finally {
      await captureDashboardShot(page, testInfo);
    }
  },
});

export { expect };
export type { Page } from '@playwright/test';
