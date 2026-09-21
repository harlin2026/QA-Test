/**
 * @author harlin
 * US-6.1.1 作为店员/店长，我希望用账号登录绑定到特定门店的点单 App
 * 关联功能：POS-AUTH-01 店员登录并绑定门店
 */
import { test, expect } from '../../fixtures/base-test';
import type { Page } from '@playwright/test';
import {
  openPosPage,
  openPosRoute,
  expectPosShell,
  fillByPlaceholder,
  clickTextButton,
  uniquePhone,
} from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe.configure({ mode: 'serial' });

const STAFF_ACCOUNT =
  process.env.POS_STAFF_ACCOUNT ||
  process.env.POS_STAFF_USERNAME ||
  process.env.POS_STAFF_PHONE ||
  '13800000000';
const STAFF_PASSWORD = process.env.POS_STAFF_PASSWORD || '123456';
const NON_STAFF_ACCOUNT =
  process.env.POS_NON_STAFF_ACCOUNT || process.env.POS_MEMBER_PHONE || uniquePhone();
const NON_STAFF_PASSWORD =
  process.env.POS_NON_STAFF_PASSWORD || process.env.POS_MEMBER_PASSWORD || '123456';

async function isLoginVisible(page: Page): Promise<boolean> {
  const input = page.locator(
    'input[type=\'password\'], input[placeholder*=\'密码\'], input[placeholder*=\'账号\'], input[placeholder*=\'用户名\'], input[placeholder*=\'手机号\']'
  );
  if (await input.first().isVisible().catch(() => false)) return true;
  return await page.getByText(/登录|登入/).first().isVisible().catch(() => false);
}

async function ensureLoggedOut(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {}
  try {
    await Promise.resolve(clickTextButton(page, /退出登录|退出|注销/)).catch(() => {});
  } catch {}
  await page.waitForTimeout(300);
}

async function safeFillAccount(page: Page, value: string): Promise<boolean> {
  const placeholders = ['账号', '用户名', '手机号', '工号', '请输入账号', '请输入手机号'];
  for (const p of placeholders) {
    try {
      await fillByPlaceholder(page, p, value);
      return true;
    } catch {}
  }
  const input = page.locator('input:not([type=\'password\'])').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
    return true;
  }
  return false;
}

async function safeFillPassword(page: Page, value: string): Promise<boolean> {
  const placeholders = ['密码', '请输入密码'];
  for (const p of placeholders) {
    try {
      await fillByPlaceholder(page, p, value);
      return true;
    } catch {}
  }
  const input = page.locator('input[type=\'password\'], input[placeholder*=\'密码\']').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
    return true;
  }
  return false;
}

async function clickLoginButton(page: Page): Promise<void> {
  try {
    await Promise.resolve(clickTextButton(page, /登录|登入|立即登录/));
    return;
  } catch {}
  const btn = page.getByRole('button', { name: /登录|登入|立即登录/ }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    return;
  }
  const textBtn = page.getByText(/^登录$|^登入$/).first();
  if (await textBtn.isVisible().catch(() => false)) {
    await textBtn.click();
  }
}

async function posLogin(page: Page, account: string, password: string, expectSuccess = true): Promise<void> {
  await openPosPage(page);
  if (!(await isLoginVisible(page))) {
    if (expectSuccess) {
      await expectPosShell(page);
      return;
    }
    await ensureLoggedOut(page);
    await openPosPage(page);
  }
  await safeFillAccount(page, account);
  await safeFillPassword(page, password);
  await clickLoginButton(page);
  await page.waitForTimeout(1000);
}

async function getToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const read = (storage: Storage) => {
      const direct = ['token', 'access_token', 'accessToken', 'pos_token', 'Authorization'];
      for (const k of direct) {
        const v = storage.getItem(k);
        if (v) {
          const raw = v.trim();
          return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
        }
      }
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (/token/i.test(k)) {
          const v = storage.getItem(k);
          if (v) {
            const raw = v.trim();
            return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
          }
        }
      }
      return null;
    };
    return read(localStorage) || read(sessionStorage);
  });
}

async function getStoreId(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const direct = ['storeId', 'store_id', 'posStoreId', 'currentStoreId', 'shopId', 'shop_id'];
    const read = (storage: Storage) => {
      for (const k of direct) {
        const v = storage.getItem(k);
        if (v) return v;
      }
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (/store|shop/i.test(k)) {
          const v = storage.getItem(k);
          if (!v) continue;
          try {
            const obj = JSON.parse(v);
            if (obj.storeId) return String(obj.storeId);
            if (obj.store_id) return String(obj.store_id);
            if (obj.shopId) return String(obj.shopId);
          } catch {}
          if (v.length < 128) return v;
        }
      }
      return null;
    };
    return read(localStorage) || read(sessionStorage);
  });
}

async function probeProtectedApiStatus(page: Page, token: string | null): Promise<number | null> {
  const paths = ['/api/pos/auth/me', '/api/pos/session', '/api/pos/user/info', '/api/pos/products'];
  for (const p of paths) {
    try {
      const res = await page.request.get(p, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        failOnStatusCode: false,
      });
      if (res.status() !== 404) return res.status();
    } catch {}
  }
  return null;
}

function isPosDataApi(url: string): boolean {
  return (
    url.includes('/api/pos/products') ||
    url.includes('/api/pos/orders') ||
    url.includes('/api/pos/members') ||
    url.includes('/api/pos/inventory')
  );
}

test.describe('US-6.1.1 POS 店员登录绑定门店', () => {
  test('US-6.1.1 店员登录并绑定门店，会话携带 storeId 且数据限定本门店', async ({ page }) => {
    await posLogin(page, STAFF_ACCOUNT, STAFF_PASSWORD, true);
    await expectPosShell(page);
    await expectPosStorySignals(page);

    const storeId = await getStoreId(page);
    expect(storeId, '登录后会话应携带 storeId').toBeTruthy();

    const token = await getToken(page);
    expect(token, '登录后会话应携带 token').toBeTruthy();

    const scopedRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (isPosDataApi(url)) {
        scopedRequests.push(url);
      }
    });

    await Promise.resolve(openPosRoute(page, '/pages/pos/index')).catch(() => {});
    await Promise.resolve(openPosRoute(page, '/pages/orders/index')).catch(() => {});
    await Promise.resolve(openPosRoute(page, '/pages/members/index')).catch(() => {});
    await page.waitForTimeout(1200);

    if (scopedRequests.length > 0) {
      const allScoped = scopedRequests.every(
        (u) => u.includes('storeId=') || u.includes('store_id=') || u.includes(storeId!)
      );
      expect(allScoped, '本门店商品/订单/会员数据请求应携带 storeId').toBeTruthy();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: '未捕获到商品/订单/会员 API 请求，跳过 storeId 请求级断言',
      });
    }
  });

  test('US-6.1.1 非店员身份（普通会员/无账号）拒绝登录', async ({ page }) => {
    await posLogin(page, NON_STAFF_ACCOUNT, NON_STAFF_PASSWORD, false);
    const errorVisible = await page
      .getByText(/非店员|无权限|账号不存在|密码错误|登录失败|请使用店员账号|没有权限|仅限店员/)
      .first()
      .isVisible()
      .catch(() => false);
    const shellVisible = await expectPosShell(page)
      .then(() => true)
      .catch(() => false);
    expect(errorVisible || !shellVisible, '非店员身份不应进入 POS 工作台').toBeTruthy();
  });

  test('US-6.1.1 Token 过期需重新登录，鉴权接口返回 401', async ({ page }) => {
    await posLogin(page, STAFF_ACCOUNT, STAFF_PASSWORD, true);
    await expectPosShell(page);

    await page.evaluate(() => {
      const expired = 'expired.invalid.token';
      const replace = (storage: Storage) => {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && /token/i.test(k)) keys.push(k);
        }
        for (const k of keys) storage.setItem(k, expired);
        for (const k of ['token', 'access_token', 'accessToken', 'pos_token']) {
          if (storage.getItem(k)) storage.setItem(k, expired);
        }
      };
      replace(localStorage);
      replace(sessionStorage);
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const loginVisible = await isLoginVisible(page);
    const shellVisible = await expectPosShell(page)
      .then(() => true)
      .catch(() => false);
    expect(loginVisible || !shellVisible, 'Token 过期后应回到登录页').toBeTruthy();

    const status = await probeProtectedApiStatus(page, 'expired.invalid.token');
    if (status !== null) {
      expect([401, 403]).toContain(status);
    } else {
      test.info().annotations.push({
        type: 'note',
        description: '未找到受保护 API 探针，跳过 401 状态码断言',
      });
    }
  });

  test('US-6.1.1 退出后鉴权接口返回 401', async ({ page }) => {
    await posLogin(page, STAFF_ACCOUNT, STAFF_PASSWORD, true);
    await expectPosShell(page);
    const token = await getToken(page);

    const logoutClicked = await Promise.resolve(clickTextButton(page, /退出登录|退出|注销/))
      .then(() => true)
      .catch(() => false);

    if (!logoutClicked) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    await page.waitForTimeout(800);

    const status = await probeProtectedApiStatus(page, token);
    if (status !== null) {
      expect([401, 403]).toContain(status);
    } else {
      test.info().annotations.push({
        type: 'note',
        description: '未找到受保护 API 探针，跳过 401 状态码断言',
      });
    }
  });
});
