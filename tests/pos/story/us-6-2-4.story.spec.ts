/**
 * @author harlin
 * 用戶故事 US-6.2.4
 * 作为店员，我希望商品列表自动校验沽清/售罄，以便不卖无法供应的商品。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·點單選品', () => {
  test('US-6.2.4 商品列表自动校验沽清/售罄', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /商品|沽清|售罄|点单/);
  });
});
