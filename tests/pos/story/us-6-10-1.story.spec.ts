/**
 * @author harlin
 * 用戶故事 US-6.10.1
 * 作为店员，我希望查看未沽清/已沽清商品统计，以便掌握停售情况。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·沽清', () => {
  test('US-6.10.1 查看未沽清/已沽清商品统计', async ({ page }) => {
    await openPosPage(page, '/pages/cleaning/index', '沽清');
    await expectPosStorySignals(page, /沽清|商品|未沽清|已沽清/);
  });
});
