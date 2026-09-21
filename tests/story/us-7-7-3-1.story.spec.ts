/**
 * @author harlin
 * 用戶故事 US-7.7.3.1
 * 作为后台管理员，我希望查看会员积分列表，以便掌握积分余额与流水。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·積分', () => {
  test('US-7.7.3.1 查看会员积分列表', async ({ page }) => {
    await openAppPage(page, '/points/list');
    await expectStorySignals(page, /积分|余额|流水|手机/);
  });
});
