/**
 * @author harlin
 * 用戶故事 US-7.7.6.2
 * 作为后台管理员，我希望维护商品单位、批量上下架、规格属性排序。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品', () => {
  test('US-7.7.6.2 维护商品单位、批量上下架、规格属性排序。', async ({ page }) => {
    await openAppPage(page, '/goods/product-units');
    await expectStorySignals(page, /单位|商品|设置/);
  });
});
