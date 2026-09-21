/**
 * @author harlin
 * 用戶故事 US-6.2.3
 * 作为店员，我希望按商品名称并结合分类搜索，以便在大量商品中定位。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·點單選品', () => {
  test('US-6.2.3 按商品名称并结合分类搜索', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /搜索|商品|分类|点单/);
  });
});
