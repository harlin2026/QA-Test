/**
 * @author harlin
 * 用戶故事 US-6.9.5
 * 作为店员，我希望查看存酒详情，以便核对与办理取酒。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·存酒', () => {
  test('US-6.9.5 查看存酒详情', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectPosStorySignals(page, /存酒|详情|取酒/);
  });
});
