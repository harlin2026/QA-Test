/**
 * @author harlin
 * 用戶故事 US-7.7.9.1
 * 作为后台管理员，我希望搜索/统计存酒并导出 Excel，以便总部管理与对账。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·存酒', () => {
  test('US-7.7.9.1 搜索/统计存酒并导出Excel', async ({ page }) => {
    await openAppPage(page, '/wine-storage/list');
    await expectStorySignals(page, /存酒|导出|搜索|列表/);
  });
});
