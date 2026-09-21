/**
 * @author harlin
 * 用戶故事 US-6.2.1
 * 作为店员，我希望看到已配置的分类列表，以便按分类找点单商品。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·點單選品', () => {
  test('US-6.2.1 看到已配置的分类列表', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /分类|商品|点单/);
  });
});
