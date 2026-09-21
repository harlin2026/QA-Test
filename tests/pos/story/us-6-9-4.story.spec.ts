/**
 * @author harlin
 * 用戶故事 US-6.9.4
 * 作为店员，我希望打印存酒凭证，以便给顾客取酒凭据。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·存酒', () => {
  test('US-6.9.4 打印存酒凭证', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectPosStorySignals(page, /存酒|打印|凭证/);
  });
});
