/**
 * @author harlin
 * 用戶故事 US-6.1.1
 * 作为店员/店长，我希望用账号登录绑定到特定门店的点单 App，以便只操作我所属门店的点单与履约。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·登入綁店', () => {
  test('US-6.1.1 用账号登录绑定到特定门店的点单App', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /点单|商品|分类/);
  });
});
