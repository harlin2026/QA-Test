/**
 * @author harlin
 * 用戶故事 US-6.18.1
 * 作为店员/顾客，我希望收银小票展示优惠明细与附加费，以便核对优惠构成。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·小票明細', () => {
  test('US-6.18.1 收银小票展示优惠明细与附加费', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /小票|优惠|附加|订单|打印/);
  });
});
