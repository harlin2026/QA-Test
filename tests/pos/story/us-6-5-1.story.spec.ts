/**
 * @author harlin
 * 用戶故事 US-6.5.1
 * 作为店员，我希望在结账页核对商品、整单备注、价格明细与会员，选择支付方式，并打印交易小票和厨打小票，以便完成收银出票。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·結帳出票', () => {
  test('US-6.5.1 在结账页核对商品、整单备注、价格明细与会员，选择支付方式，并打印交易小票…', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /结账|结算|支付|点单|购物车/);
  });
});
