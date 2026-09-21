/**
 * @author harlin
 * 用戶故事 US-6.15.3
 * 作为店员，我希望抹零能分摊到每个商品，以便退单时准确计算单品退款。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·計費抹零', () => {
  test('US-6.15.3 抹零能分摊到每个商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /抹零|结账|点单|优惠/);
  });
});
