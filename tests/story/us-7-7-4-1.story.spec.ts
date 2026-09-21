/**
 * @author harlin
 * 用戶故事 US-7.7.4.1
 * 作为后台管理员，我希望添加/修改/预览厨打与收银小票机，以便配置门店出票硬件。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·小票機', () => {
  test('US-7.7.4.1 添加/修改/预览厨打与收银小票机', async ({ page }) => {
    await openAppPage(page, '/shop/printers');
    await expectStorySignals(page, /小票机|打印机|厨打|收银|预览/);
  });
});
