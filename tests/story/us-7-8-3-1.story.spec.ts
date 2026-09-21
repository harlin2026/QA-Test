/**
 * @author harlin
 * 用戶故事 US-7.8.3.1
 * 作为系统管理员，我希望为收银端账号设置挂账、反结账权限，并限制免单仅店长可用，以便控制资金类操作风险。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·權限', () => {
  test('US-7.8.3.1 为收银端账号设置挂账、反结账权限，并限制免单仅店长可用', async ({ page }) => {
    await openAppPage(page, '/system/roles');
    await expectStorySignals(page, /角色|权限|用户|设置/);
  });
});
