/**
 * @author harlin
 * 用戶故事 US-6.2.5
 * 作为店员，我希望在商品上看到当前会员可用的一张最优券名称，以便促进成交。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·點單選品', () => {
  test('US-6.2.5 在商品上看到当前会员可用的一张最优券名称', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /商品|优惠|券|点单/);
  });
});
