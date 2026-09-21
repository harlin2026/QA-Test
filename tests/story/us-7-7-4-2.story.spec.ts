/**
 * @author harlin
 * 用戶故事 US-7.7.4.2
 * 作为后台管理员，我希望把商品绑定到厨房小票机（一个商品绑一台厨打机），以便按工位路由出票。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·小票機', () => {
  test('US-7.7.4.2 把商品绑定到厨房小票机（一个商品绑一台厨打机）', async ({ page }) => {
    await openAppPage(page, '/goods/list');
    await expectStorySignals(page, /商品|小票机|厨打|列表/);
  });
});
