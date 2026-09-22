/**
 * @author harlin
 */

import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loginAdmin } from '../helpers/login';

const root = path.join(__dirname, '../..');
const systems = JSON.parse(fs.readFileSync(path.join(root, 'systems.json'), 'utf8'));
const admin = systems.admin;
const authFile = path.join(root, admin.authFile || 'playwright/.auth/user.json');

setup('admin login', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await loginAdmin(page);
  await page.context().storageState({ path: authFile });
});
