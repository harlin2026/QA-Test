/**
 * @author harlin
 * 用戶故事 US-6.10.3
 * 作为店员，我希望对已沽清的商品规格恢复售卖，以便补货后重新开售。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·沽清', () => {
  test('US-6.10.3 对已沽清的商品规格恢复售卖', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expectPosStorySignals(page, /沽清|恢复|售卖|商品/);
  });
});
