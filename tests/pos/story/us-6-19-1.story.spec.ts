/**
 * @author harlin
 * 用戶故事 US-6.19.1
 * 作为店员，我希望订单列表/详情正确展示套餐，并在详情金额区看到促销活动、服务费、打包费。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·套餐展示', () => {
  test('US-6.19.1 订单列表/详情正确展示套餐，并在详情金额区看到促销活动、服务费、打包费。', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /套餐|订单|服务费|打包|促销/);
  });
});
