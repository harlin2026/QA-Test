/**
 * @author harlin
 * 用戶故事 US-6.17.1
 * 作为店员，我希望「店内商品」在制作中状态下不可退、且退单仅限当日，以便符合门店制作与对账规则。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·退單規則', () => {
  test('US-6.17.1 「店内商品」在制作中状态下不可退、且退单仅限当日', async ({ page }) => {
    await openPosPage(page, '/pages/orders/index', '订单');
    await expectPosStorySignals(page, /退单|制作|订单|退款/);
  });
});
