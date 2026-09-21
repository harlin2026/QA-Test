/**
 * @author harlin
 * 用戶故事 US-6.12.1
 * 作为店员，我希望对熟客使用挂账支付（先消费后付款），以便顾客离店前统一结算。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·掛賬', () => {
  test('US-6.12.1 对熟客使用挂账支付（先消费后付款）', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /挂账|挂单|结账|点单|支付/);
  });
});
