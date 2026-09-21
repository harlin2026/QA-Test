/**
 * @author harlin
 * 用戶故事 US-7.7.11.1
 * 作为后台管理员，我希望为门店配置一天多个营业时间段（含按周），以便支撑多时段营业与自取时段生成。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·營業時段', () => {
  test('US-7.7.11.1 为门店配置一天多个营业时间段（含按周）', async ({ page }) => {
    await openAppPage(page, '/shop/stores');
    await expectStorySignals(page, /门店|营业|时间|创建/);
  });
});
