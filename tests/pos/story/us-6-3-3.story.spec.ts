/**
 * @author harlin
 * 用戶故事 US-6.3.3
 * 作为店员，我希望查看当前购物车该会员可用的优惠券列表，以便结账时选用最合适的券。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員識別', () => {
  test('US-6.3.3 查看当前购物车该会员可用的优惠券列表', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /优惠券|购物车|会员|点单/);
  });
});
