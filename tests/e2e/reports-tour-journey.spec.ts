/**
 * @author harlin
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';

/**
 * E2E：報表統計全頁巡覽
 */
test.describe.configure({ mode: 'serial' });

const REPORTS = [
  { path: '/report/coupon-stats', expect: /优惠券|统计/ },
  { path: '/inventory/report/stock', expect: /库存|统计/ },
  { path: '/inventory/report/order-sales', expect: /订单|销量|统计/ },
  { path: '/report/product-sales', expect: /商品销量|销量|金额/ },
  { path: '/inventory/report/finance-receipts', expect: /财务|收款|统计/ },
  { path: '/report/cashier-stats', expect: /收银|统计|金额/ },
  { path: '/inventory/report/product-sales', expect: /进销存|商品|统计/ },
  { path: '/report/member-balance-stats', expect: /会员|余额|统计/ },
] as const;

test.describe('E2E 報表巡覽閉環', () => {
  for (const [index, report] of REPORTS.entries()) {
    test(`${index + 1}. 報表 ${report.path} 可開啟`, async ({ page }) => {
      await openAppPage(page, report.path);
      await expect(page.getByText(report.expect).first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
