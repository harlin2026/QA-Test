/**
 * @author harlin
 */

import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loginPos } from '../../helpers/login';

const root = path.join(__dirname, '../../..');
const systems = JSON.parse(fs.readFileSync(path.join(root, 'systems.json'), 'utf8'));
const pos = systems.pos;
const authFile = path.join(root, pos.authFile || 'playwright/.auth/pos.json');

setup('pos login', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await loginPos(page);
  await page.context().storageState({ path: authFile });
});
