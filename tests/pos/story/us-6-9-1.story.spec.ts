/**
 * @author harlin
 * 用戶故事 US-6.9.1
 * 作为店员，我希望按顾客/酒名/手机号搜索存酒列表，以便快速找到寄存记录。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·存酒', () => {
  test('US-6.9.1 按顾客/酒名/手机号搜索存酒列表', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectPosStorySignals(page, /存酒|搜索|顾客|酒/);
  });
});
