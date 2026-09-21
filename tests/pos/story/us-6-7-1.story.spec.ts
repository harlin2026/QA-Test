/**
 * @author harlin
 * 用戶故事 US-6.7.1
 * 作为店员，我希望按状态查看本门店订单列表与详情，以便管理全部订单。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·訂單退單', () => {
  test('US-6.7.1 按状态查看本门店订单列表与详情', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /订单|状态|详情/);
  });
});
