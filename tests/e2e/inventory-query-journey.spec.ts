import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable } from '../helpers/e2e';
import {
  expectAuthenticated,
  expectAppShell,
  expectPageReady,
  expectTableOrEmpty,
} from '../helpers/page-checks';

/**
 * 库存查询 e2e
 * @author harlin
 */
test.describe.configure({ mode: 'serial' });

test.describe('库存查询 - 登录后查看库存数据', () => {
  test('登录后台管理系统并查看库存查询列表', async ({ page }) => {
    // 1. 登录后台管理系统（openAppPage 内部完成登录流程）
    await openAppPage(page, '/');
    await expectAuthenticated(page);
    await expectAppShell(page);

    // 2. 进入库存查询页面
    await openAppPage(page, '/inventory/query');
    await expectPageReady(page);

    // 3. 列表可用（有数据或空态均可通过）
    await expectTableOrEmpty(page);
    await expectListUsable(page);

    // 4. 校验表头包含库存相关列
    const header = page.locator('.ant-table-thead');
    await expect(header.first()).toBeVisible();
    await expect(header.first()).toContainText(/商品|库存|数量|仓库/);

    // 5. 若有数据行，校验首行可见
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    if ((await rows.count()) > 0) {
      await expect(rows.first()).toBeVisible();
    }
  });
});
