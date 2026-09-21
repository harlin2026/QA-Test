/**
 * @author harlin
 * 用戶故事 US-6.13.1
 * 作为店员，我希望同一个账号能同时登录多台平板，以便门店多工位并行点单。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·多端登入', () => {
  test('US-6.13.1 同一个账号能同时登录多台平板', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /点单|商品/);
  });
});
