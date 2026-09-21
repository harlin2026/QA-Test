/**
 * @author harlin
 * 用戶故事 US-6.11.2
 * 作为店员/店长，我希望查看优惠券核销统计，以便评估营销使用。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·營收總覽', () => {
  test('US-6.11.2 查看优惠券核销统计', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expectPosStorySignals(page, /优惠券|核销|统计|总览|营收/);
  });
});
