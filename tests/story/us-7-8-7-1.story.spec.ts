/**
 * @author harlin
 * 用戶故事 US-7.8.7.1
 * 作为运营，我希望配置服务费与打包费规则，以便门店按规则自动计费。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·服務費打包費', () => {
  test('US-7.8.7.1 配置服务费与打包费规则', async ({ page }) => {
    await openAppPage(page, '/shop/stores');
    await expectStorySignals(page, /门店|服务费|打包|设置|管理/);
  });
});
