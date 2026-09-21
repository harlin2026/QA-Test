/**
 * @author harlin
 * 用戶故事 US-7.8.8.1
 * 作为管理员，我希望会员档案含消费次数、累计金额、来源、首充金额，并有会员 ID 与会员卡号两个编号（按渠道规则生成），以便会员运营。
 */
import { test } from '../fixtures/base-test';
import { openAppPage } from '../helpers/e2e';
import { expectStorySignals } from '../helpers/story';

test.describe('後台·會員檔案', () => {
  test('US-7.8.8.1 会员档案含消费次数、累计金额、来源、首充金额，并有会员ID与会员卡号两个…', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    await expectStorySignals(page, /会员|消费|来源|手机/);
  });
});
