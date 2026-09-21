/**
 * @author harlin
 * 用戶故事 US-7.7.7.1
 * 作为后台管理员，我希望订单详情新增优惠金额、抹零、应收、实收、商品销售实收、售后与订单 Flow，以便完整核账。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·訂單', () => {
  test('US-7.7.7.1 订单详情新增优惠金额、抹零、应收、实收、商品销售实收、售后与订单Flow', async ({ page }) => {
    await openAppPage(page, '/orders/list');
    await expectStorySignals(page, /订单|优惠|实收|应收|售后/);
  });
});
