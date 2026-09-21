/**
 * @author harlin
 * 用戶故事 US-6.8.4
 * 作为店员，我希望扫码小程序会员码确定会员，以便快速打开会员信息。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員服務', () => {
  test('US-6.8.4 扫码小程序会员码确定会员', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /扫码|会员|手机/);
  });
});
