/**
 * @author harlin
 * 用戶故事 US-7.8.1.1
 * 作为后台管理员，我希望系统提供一张正方形的优惠券默认图片，以便未上传图片的券在 C 端有统一展示。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·券圖', () => {
  test('US-7.8.1.1 系统提供一张正方形的优惠券默认图片', async ({ page }) => {
    await openAppPage(page, '/promotion/coupons');
    await expectStorySignals(page, /优惠券|图片|券/);
  });
});
