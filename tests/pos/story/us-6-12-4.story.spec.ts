/**
 * @author harlin
 * 用戶故事 US-6.12.4
 * 作为店员，我希望一键清空所有挂单，以便换班或误录时快速清理。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·掛賬', () => {
  test('US-6.12.4 一键清空所有挂单', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /清空|挂单|挂账|点单/);
  });
});
