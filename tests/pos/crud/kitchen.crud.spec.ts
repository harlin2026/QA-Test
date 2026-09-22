/**
 * @author harlin
 */

import { test, expect } from '../../fixtures/base-test';
import { clickFirstKitchenAction, clickKitchenStatusTab, openPosPage } from '../helpers/pos';

test.describe('POS CRUD 廚房製作進度', () => {
  test('制作进度', async ({ page }) => {
    await openPosPage(page, '/pages/kitchen/index', '制作进度');
    await expect(page.locator('uni-button.stage-tab').first()).toBeVisible({ timeout: 15_000 });

    await clickKitchenStatusTab(page, '制作中');
    const acted = await clickFirstKitchenAction(page);
    if (!acted) {
      await clickKitchenStatusTab(page, '全部');
      await clickFirstKitchenAction(page);
    }

    await expect(page.locator('uni-button.stage-tab', { hasText: /制作中|全部|待制作/ }).first()).toBeVisible();
    await expect(page.getByText(/完成制作|完成取单|重打小票|暂无订单/).first()).toBeVisible({
      timeout: 8_000,
    });
  });
});
