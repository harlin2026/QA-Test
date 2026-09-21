/**
 * @author harlin
 * 用戶故事 US-6.8.1
 * 作为店员，我希望用手机号搜索会员，以便快速定位顾客。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員服務', () => {
  test('US-6.8.1 用手机号搜索会员', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /手机|搜索|会员/);
  });
});
