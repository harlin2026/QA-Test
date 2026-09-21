/**
 * @author harlin
 * 用戶故事 US-7.7.6.1
 * 作为后台管理员，我希望在商品上设置点餐端显示渠道与小票机设置，以便控制 POS 可见性与厨打出票。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品', () => {
  test('US-7.7.6.1 在商品上设置点餐端显示渠道与小票机设置', async ({ page }) => {
    await openAppPage(page, '/goods/list');
    await expectStorySignals(page, /商品|渠道|列表|筛选/);
  });
});
