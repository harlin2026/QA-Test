/**
 * @author harlin
 * 用戶故事 US-6.11.1
 * 作为店员/店长，我希望查看实时营收概览，以便掌握当班经营情况。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·營收總覽', () => {
  test('US-6.11.1 查看实时营收概览', async ({ page }) => {
    await openPosPage(page, '/pages/dashboard/index', '总览');
    await expectPosStorySignals(page, /营收|总览|销售|金额/);
  });
});
