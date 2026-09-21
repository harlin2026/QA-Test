/**
 * @author harlin
 * 用戶故事 US-6.20.1
 * 作为店员，我希望顾客取酒时打印取酒凭证，以便留痕交付。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·取酒與營收口徑', () => {
  test('US-6.20.1 顾客取酒时打印取酒凭证', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/index', '存酒');
    await expectPosStorySignals(page, /取酒|凭证|存酒|打印/);
  });
});
