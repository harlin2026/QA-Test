/**
 * @author harlin
 */

/**
 * POS 自動登入
 *   npm run login:pos
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const storageStatePath = path.join(root, 'playwright', '.auth', 'pos.json');
const LOGIN_URL = process.env.POS_BASE_URL || 'http://192.168.30.55:8090/';
const USERNAME = process.env.POS_LOGIN_USER || 'teresa';
const PASSWORD = process.env.POS_LOGIN_PASS || 'teresa';
const headless = process.env.HEADLESS === '1';

async function main() {
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`開啟：${LOGIN_URL}`);
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  const inputs = page.locator('input.uni-input-input');
  await inputs.nth(0).fill(USERNAME);
  await inputs.nth(1).fill(PASSWORD);
  await page.locator('uni-button.login-button, uni-button', { hasText: '登录' }).first().click();
  await page.waitForURL(/\/pages\/pos\/index/, { timeout: 20_000 });
  await context.storageState({ path: storageStatePath });
  console.log(`登入成功：${page.url()}`);
  console.log(`已儲存：${storageStatePath}`);

  if (headless) {
    await browser.close();
    return;
  }
  console.log('瀏覽器保持開啟。關閉視窗或按 Ctrl+C 結束。');
  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
    process.on('SIGINT', async () => {
      await browser.close().catch(() => {});
      resolve();
    });
  });
}

main().catch((err) => {
  console.error('POS 自動登入失敗：', err.message || err);
  process.exit(1);
});
