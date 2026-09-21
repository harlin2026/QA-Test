/**
 * @author harlin
 * 用戶故事 US-7.7.3.2
 * 作为后台管理员，我希望配置积分累计规则，以便定义消费如何产生积分。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·積分', () => {
  test('US-7.7.3.2 配置积分累计规则', async ({ page }) => {
    await openAppPage(page, '/points/setting');
    await expectStorySignals(page, /积分|规则|设置|累计/);
  });
});
