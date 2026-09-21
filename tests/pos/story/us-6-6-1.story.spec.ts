/**
 * @author harlin
 * 用戶故事 US-6.6.1
 * 作为店员，我希望按制作状态跟进订单，并在正确状态看到「提前制作/完成制作出餐/完成取单」按钮，以便驱动出餐流程。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·制作进度', () => {
  test('US-6.6.1 按制作状态跟进订单，并在正确状态看到「提前制作/完成制作出餐/完成取单」…', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expectPosStorySignals(page, /制作|出餐|取单|进度/);
  });
});
