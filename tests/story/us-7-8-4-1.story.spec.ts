/**
 * @author harlin
 * 用戶故事 US-7.8.4.1
 * 作为运营，我希望维护门店全局的商品属性列表，编辑商品属性时从列表中选择（类似筛选模型），以便属性标准化、可复用。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品屬性', () => {
  test('US-7.8.4.1 维护门店全局的商品属性列表，编辑商品属性时从列表中选择（类似筛选模型）', async ({ page }) => {
    await openAppPage(page, '/goods/filter-models');
    await expectStorySignals(page, /筛选|模型|属性|商品/);
  });
});
