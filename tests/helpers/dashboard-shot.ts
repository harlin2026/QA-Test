/**
 * @author harlin
 * 每個測試步驟結束後截圖，供 Dashboard 結果彈窗顯示。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Page, TestInfo } from '@playwright/test';

/** 與 Dashboard 共用：必須寫在 Playwright outputDir 之外，否則跑測會被清空 */
function resolveQaRoot() {
  if (process.env.QA_DATA_DIR) return process.env.QA_DATA_DIR;
  if (process.env.QA_ROOT) return path.join(process.env.QA_ROOT, 'qa-data');
  return path.join(process.cwd(), 'qa-data');
}

function runDir(runId: string) {
  return path.join(resolveQaRoot(), 'shots', runId);
}

function relFile(testInfo: TestInfo) {
  const root = process.env.QA_ROOT || process.cwd();
  return path.relative(root, testInfo.file).replace(/\\/g, '/');
}

export async function captureDashboardShot(page: Page, testInfo: TestInfo) {
  if (!page || page.isClosed()) return;
  const runId = process.env.QA_RUN_ID || 'adhoc';
  const dir = runDir(runId);
  fs.mkdirSync(dir, { recursive: true });

  let body: Buffer | null = null;
  try {
    body = await page.screenshot({ fullPage: true, timeout: 8_000, type: 'png' });
  } catch {
    try {
      body = await page.screenshot({ timeout: 5_000, type: 'png' });
    } catch {
      body = null;
    }
  }
  if (!body) return;

  const file = relFile(testInfo);
  const hash = crypto.createHash('sha1').update(`${file}|${testInfo.title}`).digest('hex').slice(0, 12);
  const fileName = `${Date.now().toString(36)}-${hash}.png`;
  const abs = path.join(dir, fileName);
  fs.writeFileSync(abs, body);

  const rec = {
    file,
    title: testInfo.title,
    titlePath: testInfo.titlePath,
    status: testInfo.status || 'passed',
    duration: testInfo.duration,
    url: (() => {
      try {
        return page.url();
      } catch {
        return '';
      }
    })(),
    screenshot: fileName,
    error: testInfo.error?.message || null,
  };
  fs.appendFileSync(path.join(dir, 'steps.jsonl'), `${JSON.stringify(rec)}\n`, 'utf8');

  await testInfo.attach('dashboard-shot', { path: abs, contentType: 'image/png' }).catch(() => {});
}
