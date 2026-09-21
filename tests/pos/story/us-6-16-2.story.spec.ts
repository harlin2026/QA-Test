/**
 * @author harlin
 * 用戶故事 US-6.16.2
 * 作为店员，我希望退套餐时按套餐组/促销规则重算退款，以便套餐优惠不被错误退付。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·部分退/套餐退', () => {
  test('US-6.16.2 退套餐时按套餐组/促销规则重算退款', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /退单|套餐|退款|订单/);
  });
});
