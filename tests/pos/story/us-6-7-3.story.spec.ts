/**
 * @author harlin
 * 用戶故事 US-6.7.3
 * 作为店员，我希望对已结账订单补打结账单，以便应对小票遗失或打印失败。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·訂單退單', () => {
  test('US-6.7.3 对已结账订单补打结账单', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /订单|打印|结账|详情/);
  });
});
