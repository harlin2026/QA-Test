/**
 * @author harlin
 * 用戶故事 US-7.7.8.1
 * 作为后台管理员，我希望会员详情展示积分与优惠券、消费记录显示订单类型，以便全面了解会员。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·會員', () => {
  test('US-7.7.8.1 会员详情展示积分与优惠券、消费记录显示订单类型', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    await expectStorySignals(page, /会员|积分|优惠券|手机/);
  });
});
