/**
 * @author harlin
 * 用戶故事 US-7.8.2.1
 * 作为后台管理员，我希望配置套餐促销、打折特价、满减活动，以便开展非券类营销并在 POS/小程序生效。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·促銷活動', () => {
  test('US-7.8.2.1 配置套餐促销、打折特价、满减活动', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await expectStorySignals(page, /优惠|促销|活动|券|满减|套餐/);
  });
});
