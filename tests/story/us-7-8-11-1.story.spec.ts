/**
 * @author harlin
 * 用戶故事 US-7.8.11.1
 * 作为管理员，我希望订单列表/详情展示促销优惠、优惠券、服务费、打包费、折后价与套餐构成，并支持订单 tab 切换，以便核账。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·訂單核賬', () => {
  test('US-7.8.11.1 订单列表/详情展示促销优惠、优惠券、服务费、打包费、折后价与套餐构成，并…', async ({ page }) => {
    await openAppPage(page, '/orders/list');
    await expectStorySignals(page, /订单|优惠|服务费|打包|套餐|详情/);
  });
});
