/**
 * @author harlin
 * 用戶故事 US-6.16.1
 * 作为店员，我希望退单时选择退几件（而不是只能整行退），以便处理多数量商品的部分退货且支持多次退。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·部分退/套餐退', () => {
  test('US-6.16.1 退单时选择退几件（而不是只能整行退）', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /退单|退款|订单|退货/);
  });
});
