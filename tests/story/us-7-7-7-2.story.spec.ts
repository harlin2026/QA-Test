/**
 * @author harlin
 * 用戶故事 US-7.7.7.2
 * 作为后台管理员，我希望订单列表新增商品总价/优惠/抹零/应收/实收列，并查询退货/售后单。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·訂單', () => {
  test('US-7.7.7.2 订单列表新增商品总价/优惠/抹零/应收/实收列，并查询退货/售后单。', async ({ page }) => {
    await openAppPage(page, '/orders/refund');
    await expectStorySignals(page, /退货|售后|订单|退款/);
  });
});
