/**
 * @author harlin
 * 用戶故事 US-6.14.2
 * 作为店员，我希望在套餐分类直接看到各套餐活动及其套餐组明细，以便快速点套餐。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·券與套餐展示', () => {
  test('US-6.14.2 在套餐分类直接看到各套餐活动及其套餐组明细', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /套餐|分类|商品|点单/);
  });
});
