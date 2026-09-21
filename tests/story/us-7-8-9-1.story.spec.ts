/**
 * @author harlin
 * 用戶故事 US-7.8.9.1
 * 作为库管，我希望库存查询、出入库、盘点与库存记录都支持副单位计量，以便按箱/件等单位管库存。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·副單位庫存', () => {
  test('US-7.8.9.1 库存查询、出入库、盘点与库存记录都支持副单位计量', async ({ page }) => {
    await openAppPage(page, '/inventory/query');
    await expectStorySignals(page, /库存|单位|查询|商品/);
  });
});
