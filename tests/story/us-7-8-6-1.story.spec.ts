/**
 * @author harlin
 * 用戶故事 US-7.8.6.1
 * 作为总部运营，我希望统一管理全局分类并同步下发到门店，以便门店目录标准化。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·全域分類', () => {
  test('US-7.8.6.1 统一管理全局分类并同步下发到门店', async ({ page }) => {
    await openAppPage(page, '/goods/categories');
    await expectStorySignals(page, /分类|同步|门店|商品/);
  });
});
