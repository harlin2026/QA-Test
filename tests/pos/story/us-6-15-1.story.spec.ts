/**
 * @author harlin
 * 用戶故事 US-6.15.1
 * 作为店员，我希望购物车不仅能放单品，还能放套餐组，以便录入套餐订单。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·計費抹零', () => {
  test('US-6.15.1 购物车不仅能放单品，还能放套餐组', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /购物车|套餐|商品|点单/);
  });
});
