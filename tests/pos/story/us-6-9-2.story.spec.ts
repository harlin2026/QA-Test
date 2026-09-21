/**
 * @author harlin
 * 用戶故事 US-6.9.2
 * 作为店员，我希望按「全部/即将到期/寄存中/已取出/已过期」统计存酒，以便跟进临期酒。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·存酒', () => {
  test('US-6.9.2 按「全部/即将到期/寄存中/已取出/已过期」统计存酒', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectPosStorySignals(page, /全部|即将到期|寄存|过期|存酒/);
  });
});
