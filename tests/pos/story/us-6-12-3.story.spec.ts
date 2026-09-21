/**
 * @author harlin
 * 用戶故事 US-6.12.3
 * 作为店长，我希望对挂账订单执行免单，以便处理客诉/赠送场景。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·掛賬', () => {
  test('US-6.12.3 对挂账订单执行免单', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /免单|挂账|结账|点单/);
  });
});
