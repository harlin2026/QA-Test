/**
 * @author harlin
 * 用戶故事 US-7.7.5.1
 * 作为后台管理员，我希望分别设置厨打与收银小票模板的基本/商品/结算/文本区块，以便定制票面内容。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·票據模板', () => {
  test('US-7.7.5.1 分别设置厨打与收银小票模板的基本/商品/结算/文本区块', async ({ page }) => {
    await openAppPage(page, '/system/receipt-template');
    await expectStorySignals(page, /模板|小票|单据|区块|文本/);
  });
});
