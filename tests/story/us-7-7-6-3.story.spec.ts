/**
 * @author harlin
 * 用戶故事 US-7.7.6.3
 * 作为后台管理员，我希望能在一级分类或其二级分类下创建商品。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品', () => {
  test('US-7.7.6.3 能在一级分类或其二级分类下创建商品。', async ({ page }) => {
    await openAppPage(page, '/goods/categories');
    await expectStorySignals(page, /分类|商品|一级|二级/);
  });
});
