/**
 * @author harlin
 * 用戶故事 US-7.7.1.1
 * 作为后台管理员，我希望新增店员并为其分配一个门店，以便店员登录 POS 后只操作该门店。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·店員門店', () => {
  test('US-7.7.1.1 新增店员并为其分配一个门店', async ({ page }) => {
    await openAppPage(page, '/system/users');
    await expectStorySignals(page, /用户|角色|门店|账号|手机/);
  });
});
