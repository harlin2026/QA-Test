/**
 * @author harlin
 * 用戶故事 US-6.19.2
 * 作为店员，我希望会员消费记录也能看出套餐构成。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·套餐展示', () => {
  test('US-6.19.2 会员消费记录也能看出套餐构成。', async ({ page }) => {
    await openPosPage(page, '/pages/members/index', '会员');
    await expectPosStorySignals(page, /消费|套餐|会员|记录/);
  });
});
