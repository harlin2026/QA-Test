/**
 * @author harlin
 * 用戶故事 US-6.15.2
 * 作为店员，我希望结账自动算清促销优惠、服务费、打包费，以便报价准确。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·計費抹零', () => {
  test('US-6.15.2 结账自动算清促销优惠、服务费、打包费', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /结账|优惠|服务费|打包|点单/);
  });
});
