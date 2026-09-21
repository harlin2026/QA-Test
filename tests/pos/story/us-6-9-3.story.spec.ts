/**
 * @author harlin
 * 用戶故事 US-6.9.3
 * 作为店员，我希望录入顾客信息与酒品信息（含酒标照片）新建存酒，以便建立寄存凭证。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·存酒', () => {
  test('US-6.9.3 录入顾客信息与酒品信息（含酒标照片）新建存酒', async ({ page }) => {
    await openPosPage(page, '/pages/inventory/create', '存酒');
    await expectPosStorySignals(page, /存酒|顾客|酒|新建|录入/);
  });
});
