/**
 * @author harlin
 */

import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = __dirname;
const systems = JSON.parse(fs.readFileSync(path.join(root, 'systems.json'), 'utf8'));
const admin = systems.admin;
const pos = systems.pos;

const adminAuth = path.join(root, admin.authFile);
const posAuth = path.join(root, pos.authFile);

export default defineConfig({
  testDir: './tests',
  // 勿使用預設 test-results：Playwright 開跑會清空整個 outputDir，
  // 會誤刪 Dashboard 歷史／截圖。專用子目錄即可。
  outputDir: 'test-results/pw-output',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: /auth[\\/]login\.setup\.ts/,
      testIgnore: /pos[\\/]/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_BASE_URL || admin.baseURL,
      },
    },
    {
      name: 'admin',
      dependencies: ['admin-setup'],
      testIgnore: [/pos[\\/]/, /.*\.setup\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_BASE_URL || admin.baseURL,
        storageState: adminAuth,
      },
    },
    {
      name: 'pos-setup',
      testMatch: /pos[\\/]auth[\\/]login\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.POS_BASE_URL || pos.baseURL,
      },
    },
    {
      name: 'pos',
      dependencies: ['pos-setup'],
      testMatch: /pos[\\/].*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.POS_BASE_URL || pos.baseURL,
        storageState: posAuth,
      },
    },
  ],
});
