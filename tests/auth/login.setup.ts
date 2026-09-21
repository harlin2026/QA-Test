/**
 * @author harlin
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '../..');
const systems = JSON.parse(fs.readFileSync(path.join(root, 'systems.json'), 'utf8'));
const admin = systems.admin;
const authFile = path.join(root, admin.authFile || 'playwright/.auth/user.json');

setup('admin login', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const username = process.env.LOGIN_USER || admin.loginUser;
  const password = process.env.LOGIN_PASS || admin.loginPass;

  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill(username);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
