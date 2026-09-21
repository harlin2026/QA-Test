/**
 * @author harlin
 */

/**
 * 自動登入後台管理系統
 *
 * 用法：
 *   npm run login
 *
 * 可選環境變數：
 *   LOGIN_URL   預設 http://192.168.30.55:5174/login
 *   LOGIN_USER  預設 admin@peterson.com
 *   LOGIN_PASS  預設 Admin@123
 *   HEADLESS=1  無頭模式（預設會開啟瀏覽器視窗）
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const authDir = path.join(root, 'playwright', '.auth');
const storageStatePath = path.join(authDir, 'user.json');

const LOGIN_URL = process.env.LOGIN_URL || 'http://192.168.30.55:5174/login';
const USERNAME = process.env.LOGIN_USER || 'admin@peterson.com';
const PASSWORD = process.env.LOGIN_PASS || 'Admin@123';
const headless = process.env.HEADLESS === '1';

async function main() {
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`開啟：${LOGIN_URL}`);
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('请输入用户名').fill(USERNAME);
  await page.getByPlaceholder('请输入密码').fill(PASSWORD);
  await page.getByRole('button', { name: '登 录' }).click();

  // 登入成功後會離開 /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });

  await context.storageState({ path: storageStatePath });
  console.log(`登入成功：${page.url()}`);
  console.log(`已儲存登入狀態：${storageStatePath}`);

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
  console.error('自動登入失敗：', err.message || err);
  process.exit(1);
});
