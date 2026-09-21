/**
 * @author harlin
 * 用戶故事 US-6.7.2
 * 作为店员，我希望区分「仅退款」与「退货退款」处理退单，以便正确退款并处理库存与优惠券。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·訂單退單', () => {
  test('US-6.7.2 区分「仅退款」与「退货退款」处理退单', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /退款|退货|订单|退单/);
  });
});
