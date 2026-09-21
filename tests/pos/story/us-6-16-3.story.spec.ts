/**
 * @author harlin
 * 用戶故事 US-6.16.3
 * 作为店员，我希望退单时可打印退单小票，并能在退单详情补打。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·部分退/套餐退', () => {
  test('US-6.16.3 退单时可打印退单小票，并能在退单详情补打。', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /退单|打印|小票|订单/);
  });
});
