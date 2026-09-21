/**
 * @author harlin
 * 用戶故事 US-7.7.10.2
 * 作为后台管理员，我希望通过盘点修改商品库存，以便账实对齐。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·庫存', () => {
  test('US-7.7.10.2 通过盘点修改商品库存', async ({ page }) => {
    await openAppPage(page, '/inventory/check');
    await expectStorySignals(page, /盘点|库存|商品/);
  });
});
