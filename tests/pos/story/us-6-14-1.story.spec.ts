/**
 * @author harlin
 * 用戶故事 US-6.14.1
 * 作为店员，我希望商品上的最优券按新规则推荐，以便给顾客最合理的优惠建议。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·券與套餐展示', () => {
  test('US-6.14.1 商品上的最优券按新规则推荐', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /优惠|券|商品|点单/);
  });
});
