/**
 * @author harlin
 * 用戶故事 US-7.8.10.1
 * 作为管理员，我希望维护取酒凭证、退单凭证（退单小票）与收银小票优惠明细模板，以便新票据统一出票。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·憑證模板', () => {
  test('US-7.8.10.1 维护取酒凭证、退单凭证（退单小票）与收银小票优惠明细模板', async ({ page }) => {
    await openAppPage(page, '/system/receipt-template');
    await expectStorySignals(page, /模板|凭证|小票|退单|取酒/);
  });
});
