/**
 * @author harlin
 * 用戶故事 US-6.3.1
 * 作为店员，我希望用电话号码搜索会员用户，以便下单前确定顾客身份。(电话号码搜索会员只作为内部测试阶段用，上线后将删除这个功能，只保留扫码确认会员)
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員識別', () => {
  test('US-6.3.1 用电话号码搜索会员用户', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /手机|会员|搜索/);
  });
});
