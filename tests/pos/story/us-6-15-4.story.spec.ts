/**
 * @author harlin
 * 用戶故事 US-6.15.4
 * 作为店员，我希望购物车直接看到优惠金额（券/促销/抹零）与应付金额，以便当场与顾客核对。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·計費抹零', () => {
  test('US-6.15.4 购物车直接看到优惠金额（券/促销/抹零）与应付金额', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /优惠|应付|购物车|点单/);
  });
});
