/**
 * @author harlin
 * 用戶故事 US-6.11.3
 * 作为店员/店长，我希望用快捷工具实时查询各分类商品库存水平，以便点单时了解备货。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·營收總覽', () => {
  test('US-6.11.3 用快捷工具实时查询各分类商品库存水平', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/overview');
    await expectPosStorySignals(page, /库存|分类|商品|总览/);
  });
});
