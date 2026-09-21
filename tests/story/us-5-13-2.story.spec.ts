/**
 * @author harlin
 * 用戶故事 US-5.13.2（小程序 · 待接入自動化）
 * 作为会员，我希望查看结账详情并完成微信付款；支付失败时生成待支付订单，15 分钟未付自动超时取消。
 */
import { test } from '../fixtures/base-test';

test.describe('小程序·登入會員', () => {
  test('US-5.13.2 查看结账详情并完成微信付款；支付失败时生成待支付订单，15分钟未付自动超…', async () => {
    test.skip(true, '小程序端尚未接入 Playwright；故事已入庫，待接入後補齊自動化步驟');
  });
});
