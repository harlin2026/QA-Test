/**
 * @author harlin
 * 用戶故事 US-7.8.6.2
 * 作为运营，我希望系统保留唯一的「套餐」系统分类，以便套餐活动有固定挂载位置。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·全域分類', () => {
  test('US-7.8.6.2 系统保留唯一的「套餐」系统分类', async ({ page }) => {
    await openAppPage(page, '/goods/categories');
    await expectStorySignals(page, /分类|套餐|系统/);
  });
});
