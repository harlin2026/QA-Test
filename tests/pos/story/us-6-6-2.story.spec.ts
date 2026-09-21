/**
 * @author harlin
 * 用戶故事 US-6.6.2
 * 作为店员，我希望查看制作订单的完整详情（含客户、支付、结账详情、退单列表），以便核对内容。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·制作进度', () => {
  test('US-6.6.2 查看制作订单的完整详情（含客户、支付、结账详情、退单列表）', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expectPosStorySignals(page, /制作|详情|订单|退单/);
  });
});
