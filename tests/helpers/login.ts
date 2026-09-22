/**
 * @author harlin
 */

import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

const ROOT = path.join(__dirname, '../..');

function loadSystems() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'systems.json'), 'utf8'));
}

export function shouldAutoLogin(filePath: string, title?: string) {
  const file = String(filePath || '').replace(/\\/g, '/');
  if (/\.setup\.(ts|js)$/.test(file)) return false;
  // 專門測登入流程的用例，不要先自動登入
  if (/us-6-1-1/.test(file)) return false;
  if (/登录|登入|login/i.test(String(title || '')) && !/CRUD|冒煙|E2E/i.test(String(title || ''))) {
    return false;
  }
  return true;
}

export async function loginAdmin(page: Page) {
  const admin = loadSystems().admin;
  const username = process.env.LOGIN_USER || admin.loginUser;
  const password = process.env.LOGIN_PASS || admin.loginPass;

  await page.goto('/login');
  if (!/\/login/.test(page.url())) return;

  await page.getByPlaceholder('请输入用户名').fill(username);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

async function fillUniLoginInput(page: Page, index: number, value: string) {
  const input = page.locator('input.uni-input-input').nth(index);
  await expect(input).toBeAttached({ timeout: 8_000 });
  await input.click({ force: true });
  await input.evaluate((el, v) => {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    desc?.set?.call(el, v);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: v, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    let node: HTMLElement | null = el as HTMLElement;
    while (node) {
      const comp = (
        node as unknown as {
          __vueParentComponent?: {
            emit?: (event: string, value: string) => void;
            props?: Record<string, unknown>;
            vnode?: { props?: Record<string, unknown> };
          };
        }
      ).__vueParentComponent;
      if (comp) {
        const onUpdate = comp.vnode?.props?.['onUpdate:modelValue'];
        if (typeof onUpdate === 'function') (onUpdate as (value: string) => void)(v);
        if (typeof comp.emit === 'function' && comp.props && 'modelValue' in comp.props) {
          comp.emit('update:modelValue', v);
        }
      }
      node = node.parentElement;
    }
  }, value);
  await expect(input).toHaveValue(value, { timeout: 5_000 });
}

export async function loginPos(page: Page) {
  const pos = loadSystems().pos;
  const username = process.env.POS_LOGIN_USER || pos.loginUser;
  const password = process.env.POS_LOGIN_PASS || pos.loginPass;

  await page.goto('/');
  const welcome = page.getByText('欢迎登录@Chill收银系统');
  const nav = page.locator('.nav-label', { hasText: '点单' }).first();

  // 已有 storageState 時會直接進收銀；不可再死等登入文案 15 秒
  await Promise.race([
    nav.waitFor({ state: 'visible', timeout: 15_000 }),
    welcome.waitFor({ state: 'visible', timeout: 15_000 }),
  ]).catch(() => {});

  if (await nav.isVisible().catch(() => false)) return;

  await expect(welcome, '未進入收銀時應看到登入頁').toBeVisible({ timeout: 8_000 });
  await fillUniLoginInput(page, 0, username);
  await fillUniLoginInput(page, 1, password);
  await page.locator('uni-button.login-button, uni-button', { hasText: '登录' }).first().click();

  const store = page.getByText(/澳门体验店|珠海门店/).first();
  if (await store.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await store.click({ force: true });
  }

  await expect(nav, '登入後應進入收銀殼層').toBeVisible({ timeout: 20_000 });
  if (!/\/pages\/pos\//.test(page.url())) {
    await page.goto('/pages/pos/index', { waitUntil: 'domcontentloaded' });
    await expect(nav).toBeVisible({ timeout: 15_000 });
  }
}
