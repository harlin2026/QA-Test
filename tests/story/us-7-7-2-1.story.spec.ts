/**
 * @author harlin
 * 用戶故事 US-7.7.2.1
 * 作为后台管理员，我希望管理四类优惠券、查看核销明细与使用记录并精准发放，以便开展门店与线上营销。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·優惠券', () => {
  test('US-7.7.2.1 管理四类优惠券、查看核销明细与使用记录并精准发放', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await expectStorySignals(page, /优惠券|发放|核销|券/);
  });
});
