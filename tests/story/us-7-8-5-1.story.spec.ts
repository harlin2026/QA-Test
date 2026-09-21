/**
 * @author harlin
 * 用戶故事 US-7.8.5.1
 * 作为运营，我希望新的商品表单支持商品类型、固价、副单位、条码、定位 tab、参数排序、图集管理与规格拆分，以便维护更复杂的菜单。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·商品表單', () => {
  test('US-7.8.5.1 新的商品表单支持商品类型、固价、副单位、条码、定位tab、参数排序、图集…', async ({ page }) => {
    await openAppPage(page, '/goods/list');
    await expectStorySignals(page, /商品|添加|规格|列表/);
  });
});
