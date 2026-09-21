/**
 * @author harlin
 * 帶登入態開啟關鍵頁，攔截 XHR/fetch，輸出發現的 API。
 *
 * 用法：
 *   node stress/capture-apis.js
 *   node stress/capture-apis.js --system=admin
 *   node stress/capture-apis.js --system=pos
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SYSTEMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'systems.json'), 'utf8'));

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function isApiLike(url) {
  try {
    const u = new URL(url);
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|map|ttf)(\?|$)/i.test(u.pathname)) return false;
    if (u.pathname.includes('/assets/')) return false;
    // Keycloak / static SPA 本體排除，只留業務 API
    if (u.port === '8080' || /\/realms\//i.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function methodOk(method) {
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(String(method || '').toUpperCase());
}

async function captureSystem(systemId) {
  const sys = SYSTEMS[systemId];
  if (!sys) throw new Error(`未知系統：${systemId}`);

  const fixturesRel =
    systemId === 'pos' ? 'tests/pos/fixtures/modules.json' : 'tests/fixtures/modules.json';
  const modules = JSON.parse(fs.readFileSync(path.join(ROOT, fixturesRel), 'utf8'));
  const paths = [...new Set(modules.map((m) => m.path).filter(Boolean))].slice(0, 12);
  const authFile = path.join(ROOT, sys.authFile);
  if (!fs.existsSync(authFile)) {
    throw new Error(`缺少登入態 ${sys.authFile}，請先執行 npm run login 或 login:pos`);
  }

  const seen = new Map(); // key = METHOD pathWithoutQuery origin
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: sys.baseURL,
    storageState: authFile,
  });
  const page = await context.newPage();

  page.on('request', (req) => {
    const method = req.method().toUpperCase();
    if (!methodOk(method)) return;
    const url = req.url();
    if (!isApiLike(url)) return;
    let u;
    try {
      u = new URL(url);
    } catch {
      return;
    }
    // 排除對 SPA 自身 HTML 的導航
    if (req.resourceType() === 'document') return;
    const types = new Set(['xhr', 'fetch', 'other']);
    if (!types.has(req.resourceType()) && !/\/api\//i.test(u.pathname)) {
      // 仍保留像 /goods/... 這類後端路徑
      if (u.origin === new URL(sys.baseURL).origin && !u.pathname.startsWith('/api')) {
        // Vite 前端同源請求可能走 proxy；保留非靜態
      }
    }
    const key = `${method} ${u.origin}${u.pathname}`;
    if (seen.has(key)) {
      seen.get(key).count += 1;
      return;
    }
    seen.set(key, {
      method,
      origin: u.origin,
      path: u.pathname + (u.search || ''),
      pathname: u.pathname,
      resourceType: req.resourceType(),
      count: 1,
    });
  });

  for (const p of paths) {
    try {
      await page.goto(p, { waitUntil: 'networkidle', timeout: 25_000 });
      await page.waitForTimeout(800);
    } catch (err) {
      console.warn(`[${systemId}] 開啟 ${p} 失敗：${err.message}`);
    }
  }

  await browser.close();

  const entries = [...seen.values()].sort((a, b) => b.count - a.count);
  const originCounts = {};
  for (const e of entries) {
    originCounts[e.origin] = (originCounts[e.origin] || 0) + e.count;
  }
  const apiBase =
    Object.entries(originCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    new URL(sys.baseURL).origin;

  const out = {
    system: systemId,
    capturedAt: new Date().toISOString(),
    baseURL: sys.baseURL,
    apiBase,
    originCounts,
    endpoints: entries,
  };

  const outPath = path.join(__dirname, `discovered-${systemId}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`[${systemId}] 寫入 ${outPath}（${entries.length} 端點，apiBase=${apiBase}）`);
  return out;
}

function pickReadOnlyScenarios(discovered, limit = 8) {
  const getOnes = discovered.endpoints.filter(
    (e) => e.method === 'GET' && !/\/(create|update|delete|save|submit|checkout|pay)/i.test(e.pathname),
  );
  const picked = [];
  const seenPath = new Set();
  for (const e of getOnes) {
    if (seenPath.has(e.pathname)) continue;
    seenPath.add(e.pathname);
    picked.push(e);
    if (picked.length >= limit) break;
  }
  return picked.map((e, i) => ({
    id: `ro-${i + 1}`,
    name: `${e.method} ${e.pathname}`,
    weight: 1,
    method: 'GET',
    path: e.path.startsWith('http') ? e.pathname + (e.path.includes('?') ? e.path.slice(e.path.indexOf('?')) : '') : e.path,
    readOnly: true,
  }));
}

async function main() {
  const only = arg('system');
  const ids = only ? [only] : ['admin', 'pos'];
  const results = {};
  for (const id of ids) {
    results[id] = await captureSystem(id);
  }

  // 若兩邊都抓到，順便產出一份建議 config 片段
  const configPath = path.join(__dirname, 'config.json');
  let existing = {
    defaults: {
      vus: 100,
      durationSec: 60,
      rampUpSec: 10,
      timeoutMs: 15000,
    },
    ui: {
      maxWorkers: 10,
      defaultWorkers: 5,
    },
    systems: {},
  };
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  for (const id of ids) {
    const d = results[id];
    const sys = SYSTEMS[id];
    const scenarios = pickReadOnlyScenarios(d);
    existing.systems[id] = {
      ...(existing.systems[id] || {}),
      apiBase: d.apiBase,
      authFile: sys.authFile,
      tokenKey: id === 'pos' ? 'token' : 'admin_token',
      uiPaths: (id === 'pos'
        ? ['/pages/pos/index', '/pages/orders/index', '/pages/dashboard/index']
        : ['/', '/orders/list', '/goods/list', '/vip/list']
      ),
      scenarios: scenarios.length
        ? scenarios
        : existing.systems[id]?.scenarios || [
            {
              id: 'health-html',
              name: '前端首頁',
              weight: 1,
              method: 'GET',
              path: '/',
              readOnly: true,
            },
          ],
    };
  }

  fs.writeFileSync(configPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
  console.log(`已更新 ${configPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
