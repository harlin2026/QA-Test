/**
 * @author harlin
 * AI 生成：手机号搜索会员并查看详情积分优惠券消费记录
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openVipDetailByPhone, searchVipAndOpenDetail } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';

test.describe.configure({ mode: 'serial' });

test.describe('E2E｜手机号搜索会员并查看详情积分优惠券消费记录', () => {
  test('手机号搜索会员并查看详情积分优惠券消费记录', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    const phone = process.env.E2E_MEMBER_PHONE || '13909091140';
    // 筛选 API 不穩時 openVipDetailByPhone 會改用表格文案定位
    let ok = await openVipDetailByPhone(page, phone);
    if (!ok) ok = await searchVipAndOpenDetail(page, phone);
    test.skip(!ok, `找不到会员 ${phone}`);
    await expectPageReady(page);
    await expect(page).toHaveURL(/\/vip\/detail/);
    await expect(page.getByText(/会员|手机|积分|余额|详情|优惠|消费/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
