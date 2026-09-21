/**
 * @author harlin
 * 用戶故事 US-7.7.9.2
 * 作为后台管理员，我希望配置存酒推送、有效期、临期提醒与凭证规则，以便规范存酒。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·存酒', () => {
  test('US-7.7.9.2 配置存酒推送、有效期、临期提醒与凭证规则', async ({ page }) => {
    await openAppPage(page, '/wine-storage/setting');
    await expectStorySignals(page, /存酒|设置|有效|提醒|凭证/);
  });
});
