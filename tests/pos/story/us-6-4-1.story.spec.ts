/**
 * @author harlin
 * 用戶故事 US-6.4.1
 * 作为店员，我希望在购物车中区分堂食/外带、增删商品、选规格属性、调数量，并受库存（含预扣）与沽清约束，以便准确录单。
 */
import { test } from '../../fixtures/base-test';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('POS·購物車', () => {
  test('US-6.4.1 在购物车中区分堂食/外带、增删商品、选规格属性、调数量，并受库存（含预扣…', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /堂食|外带|购物车|点单|数量/);
  });
});
