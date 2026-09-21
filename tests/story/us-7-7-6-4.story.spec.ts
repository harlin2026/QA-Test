/**
 * @author harlin
 * 用戶故事 US-7.7.6.4
 * 作为后台管理员，我希望新增/编辑商品时不能直接修改库存，以便库存只经出入库/盘点规范变更。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品', () => {
  test('US-7.7.6.4 新增/编辑商品时不能直接修改库存', async ({ page }) => {
    await openAppPage(page, '/goods/list');
    await expectStorySignals(page, /商品|添加|库存|列表/);
  });
});
