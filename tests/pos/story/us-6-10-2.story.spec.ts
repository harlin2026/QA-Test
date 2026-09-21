/**
 * @author harlin
 * 用戶故事 US-6.10.2
 * 作为店员，我希望对未沽清的商品规格进行沽清，以便即时停售售缺商品。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·沽清', () => {
  test('US-6.10.2 对未沽清的商品规格进行沽清', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expectPosStorySignals(page, /沽清|规格|商品/);
  });
});
