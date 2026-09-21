/**
 * @author harlin
 * 用戶故事 US-6.8.2
 * 作为店员，我希望查看会员详细信息、积分、优惠券与消费记录，以便提供会员服务。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員服務', () => {
  test('US-6.8.2 查看会员详细信息、积分、优惠券与消费记录', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /会员|积分|优惠券|消费/);
  });
});
