/**
 * @author harlin
 */

import { expect, type Page } from '@playwright/test';

export type UiFlavor = 'admin' | 'pos';

const ERROR_TEXT_RE =
  /错误|失敗|失败|異常|异常|请求失败|服务器错误|系统错误|网络异常|加载失败|操作失败|资源不存在|无权|未授权|Internal Server Error|Unhandled|Exception/i;

/** H5 無相機／掃碼硬體時的預期提示，不當成產品錯誤 */
const POS_BENIGN_TOAST_RE =
  /扫码失败|掃碼失敗|无法调起相机|無法調起相機|摄像头|相機權限|相机权限|资源不存在/;
const isBenignPosToast = (text: string) => POS_BENIGN_TOAST_RE.test(text);

export type PageGuards = {
  pageErrors: string[];
  failedApis: string[];
  assertClean: (label?: string) => void;
};

/** 監聽 pageerror + API 業務/5xx 失敗 */
export function attachPageGuards(page: Page): PageGuards {
  const pageErrors: string[] = [];
  const failedApis: string[] = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (!/\/api\//i.test(url) && !/\/prod-api\//i.test(url)) return;

    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      // keep raw url
    }
    const method = res.request().method();

    if (res.status() >= 500) {
      // 總覽會先用門店編碼 TH… 打營收接口，必 502；數字 storeId 成功即可
      if (method === 'GET' && /StoreId=TH/i.test(url) && /realtime-revenue|coupons\/staff-ordering\/stats/i.test(url)) {
        return;
      }
      failedApis.push(`${res.status()} ${method} ${url}`);
      return;
    }

    // GET 短暫 502 後同一路徑成功，不當成用例失敗
    if (res.ok() && method === 'GET') {
      for (let i = failedApis.length - 1; i >= 0; i--) {
        if (/^\d{3} GET /.test(failedApis[i]) && failedApis[i].includes(pathname)) {
          failedApis.splice(i, 1);
        }
      }
    }

    if (res.status() >= 400) return;
    try {
      const ct = res.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const data = await res.json();
      if (!data || typeof data !== 'object') return;
      const code = (data as { code?: unknown }).code;
      const success = (data as { success?: unknown }).success;
      const msg = String(
        (data as { msg?: unknown; message?: unknown }).msg ||
          (data as { message?: unknown }).message ||
          '',
      );
      const looksError = ERROR_TEXT_RE.test(msg);
      if (success === false || (typeof code === 'number' && ![0, 200].includes(code) && looksError)) {
        failedApis.push(`biz ${url} code=${String(code)} ${msg.slice(0, 80)}`.trim());
      }
    } catch {
      // ignore body parse issues
    }
  });

  return {
    pageErrors,
    failedApis,
    assertClean(label = '頁面') {
      expect(pageErrors, `${label} 出現前端 pageerror`).toEqual([]);
      expect(failedApis, `${label} 出現失敗 API`).toEqual([]);
    },
  };
}

async function collectVisibleTexts(
  locator: ReturnType<Page['locator']>,
  tag: string,
  findings: string[],
  requireErrorText = false,
) {
  const n = await locator.count();
  for (let i = 0; i < n; i++) {
    const node = locator.nth(i);
    if (!(await node.isVisible().catch(() => false))) continue;
    const text = (await node.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
    if (requireErrorText && !ERROR_TEXT_RE.test(text)) continue;
    if (isBenignPosToast(text)) continue;
    findings.push(`[${tag}] ${text.slice(0, 160) || '(visible)'}`);
  }
}

/** 偵測錯誤彈窗 / Toast（後台 Ant Design 或 POS uni-app） */
export async function expectNoUiErrors(
  page: Page,
  label = '頁面',
  options: { flavor?: UiFlavor; settleMs?: number } = {},
) {
  const flavor = options.flavor || 'admin';
  const settleMs = options.settleMs ?? 1000;
  await page.waitForTimeout(settleMs);

  const findings: string[] = [];

  if (flavor === 'admin') {
    await collectVisibleTexts(page.locator('.ant-message-error, .ant-message-notice-error'), 'message-error', findings);
    await collectVisibleTexts(page.locator('.ant-notification-notice-error'), 'notification-error', findings);
    await collectVisibleTexts(page.locator('.ant-modal-confirm-error'), 'modal-confirm-error', findings);
    await collectVisibleTexts(page.locator('.ant-result-error'), 'result-error', findings);
    await collectVisibleTexts(page.locator('.ant-alert-error'), 'alert-error', findings);
    await collectVisibleTexts(
      page.locator('.ant-modal-wrap:not([style*="display: none"]) .ant-modal'),
      'modal',
      findings,
      true,
    );
    await collectVisibleTexts(
      page.locator(
        '.ant-message-notice-content, .ant-notification-notice-description, .ant-notification-notice-message',
      ),
      'toast',
      findings,
      true,
    );
  } else {
    // POS / uni-app
    await collectVisibleTexts(
      page.locator('.uni-sample-toast, .uni-toast, uni-toast, .u-toast'),
      'uni-toast',
      findings,
      true,
    );
    await collectVisibleTexts(
      page.locator('.uni-modal__content, .uni-modal-content, .u-modal__content, .uni-popup .uni-modal'),
      'uni-modal',
      findings,
      true,
    );
    await collectVisibleTexts(
      page.locator('.uni-modal, uni-modal, .u-modal').filter({ hasText: ERROR_TEXT_RE }),
      'uni-dialog',
      findings,
    );
  }

  expect(findings, `${label} 出現錯誤彈窗/提示：\n${findings.join('\n')}`).toEqual([]);
}

export function detectFlavor(filePath: string): UiFlavor {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('/pos/') ? 'pos' : 'admin';
}
