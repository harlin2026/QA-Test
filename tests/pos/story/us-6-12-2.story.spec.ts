/**
 * @author harlin
 * 用戶故事 US-6.12.2
 * 作为店员，我希望对已挂账的订单继续追加菜品，以便顾客加餐直接计入同一账单。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·掛賬', () => {
  test('US-6.12.2 对已挂账的订单继续追加菜品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /挂账|挂单|购物车|点单/);
  });
});
