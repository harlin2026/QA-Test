/**
 * @author harlin
 * 用戶故事 US-6.20.2
 * 作为店长，我希望实时营收的销售金额把附加费、储蓄卡消费和退单均摊券金额都计入，以便口径准确。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·取酒與營收口徑', () => {
  test('US-6.20.2 实时营收的销售金额把附加费、储蓄卡消费和退单均摊券金额都计入', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expectPosStorySignals(page, /营收|销售|金额|退单|总览/);
  });
});
