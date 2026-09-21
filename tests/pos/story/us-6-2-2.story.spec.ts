/**
 * @author harlin
 * 用戶故事 US-6.2.2
 * 作为店员，我希望看到一级分类及其二级分类下的商品，以便两级快速选品。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·點單選品', () => {
  test('US-6.2.2 看到一级分类及其二级分类下的商品', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /分类|商品/);
  });
});
