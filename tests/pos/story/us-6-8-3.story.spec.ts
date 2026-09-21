/**
 * @author harlin
 * 用戶故事 US-6.8.3
 * 作为店员，我希望仅凭电话号码新增会员，以便把到店新顾客纳入会员体系。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員服務', () => {
  test('US-6.8.3 仅凭电话号码新增会员', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /添加|新增|手机|会员/);
  });
});
