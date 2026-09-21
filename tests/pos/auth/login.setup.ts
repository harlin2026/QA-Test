/**
 * @author harlin
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '../../..');
const systems = JSON.parse(fs.readFileSync(path.join(root, 'systems.json'), 'utf8'));
const pos = systems.pos;
const authFile = path.join(root, pos.authFile || 'playwright/.auth/pos.json');

setup('pos login', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const username = process.env.POS_LOGIN_USER || pos.loginUser;
  const password = process.env.POS_LOGIN_PASS || pos.loginPass;

  await page.goto('/');
  await expect(page.getByText('欢迎登录@Chill收银系统')).toBeVisible({ timeout: 15_000 });

  const inputs = page.locator('input.uni-input-input');
  await inputs.nth(0).fill(username);
  await inputs.nth(1).fill(password);
  await page.locator('uni-button.login-button, uni-button', { hasText: '登录' }).first().click();

  await expect(page).toHaveURL(/\/pages\/pos\/index/, { timeout: 20_000 });
  await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
