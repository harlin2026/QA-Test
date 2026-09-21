/**
 * @author harlin
 * 用戶故事 US-7.7.10.1
 * 作为后台管理员，我希望流水新增销售出库与退单入库，以便流水与订单履约自动对齐。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·庫存', () => {
  test('US-7.7.10.1 流水新增销售出库与退单入库', async ({ page }) => {
    await openAppPage(page, '/inventory/record');
    await expectStorySignals(page, /库存|流水|出库|入库|记录/);
  });
});
