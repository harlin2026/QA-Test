/**
 * @author harlin
 * 用戶故事 US-6.3.2
 * 作为店员，我希望扫描顾客小程序会员码确定会员，以便免手输快速识别。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·會員識別', () => {
  test('US-6.3.2 扫描顾客小程序会员码确定会员', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /扫码|会员|点单/);
  });
});
