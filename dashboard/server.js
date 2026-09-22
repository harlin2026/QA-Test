/**
 * @author harlin
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { URL } = require('node:url');

/** 載入專案根目錄 .env（不覆蓋已有環境變數） */
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // ignore
  }
})();

const { exportResultPdf, exportBatchPdf } = require('./export-pdf');
const {
  archiveRun,
  saveCurrent,
  loadCurrent,
  loadRun,
  listHistory,
  readRunLog,
} = require('./history');
const { ROOT, PATHS, shotsDir, ensureQaDataDirs, migrateLegacyIfNeeded } = require('./paths');
const {
  publicAiStatus,
  publicAiConfigPayload,
  saveAiFileConfig,
  generateTestDraft,
  rewriteSpecSource,
  saveGeneratedDraft,
} = require('./ai-generate');
const xuqiuDb = require('./xuqiu-db');
const auth = require('./auth');

const PUBLIC = path.join(__dirname, 'public');
const SYSTEMS_FILE = path.join(ROOT, 'systems.json');
let SYSTEMS = JSON.parse(fs.readFileSync(SYSTEMS_FILE, 'utf8'));
const PORT = Number(process.env.DASHBOARD_PORT || 3456);
const RESULTS_FILE = PATHS.lastFile;
const STRESS_CONFIG = path.join(ROOT, 'stress', 'config.json');
const STRESS_INDEX = path.join(PATHS.stress, 'index.json');

function openBrowser(url) {
  if (process.env.DASHBOARD_NO_OPEN === '1') return;
  const cmd =
    process.platform === 'win32'
      ? { file: 'cmd', args: ['/c', 'start', '', url] }
      : process.platform === 'darwin'
        ? { file: 'open', args: [url] }
        : { file: 'xdg-open', args: [url] };
  const child = spawn(cmd.file, cmd.args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}

function reloadSystems() {
  SYSTEMS = JSON.parse(fs.readFileSync(SYSTEMS_FILE, 'utf8'));
  return SYSTEMS;
}

function saveSystems() {
  fs.writeFileSync(SYSTEMS_FILE, `${JSON.stringify(SYSTEMS, null, 2)}\n`, 'utf8');
}

function envForSystem(sys) {
  if (sys.id === 'pos') {
    return {
      POS_BASE_URL: sys.baseURL,
      POS_LOGIN_USER: sys.loginUser,
      POS_LOGIN_PASS: sys.loginPass,
    };
  }
  return {
    ADMIN_BASE_URL: sys.baseURL,
    LOGIN_USER: sys.loginUser,
    LOGIN_PASS: sys.loginPass,
  };
}

function clearAuthFile(sys) {
  if (!sys?.authFile) return false;
  const abs = path.join(ROOT, sys.authFile);
  if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) return false;
  fs.unlinkSync(abs);
  return true;
}

function validateSystemConfig(body) {
  if (!body || typeof body !== 'object') throw new Error('請求內容無效');
  const baseURL = String(body.baseURL || '').trim().replace(/\/+$/, '');
  const loginUser = String(body.loginUser || '').trim();
  const loginPass = String(body.loginPass || '');
  const name = String(body.name || '').trim();
  const subtitle = String(body.subtitle || '').trim();
  if (!baseURL) throw new Error('請填寫系統地址 baseURL');
  if (!/^https?:\/\//i.test(baseURL)) throw new Error('baseURL 需以 http:// 或 https:// 開頭');
  if (!loginUser) throw new Error('請填寫登入帳號');
  if (!loginPass) throw new Error('請填寫登入密碼');
  return {
    baseURL,
    loginUser,
    loginPass,
    ...(name ? { name } : {}),
    ...(subtitle ? { subtitle } : {}),
  };
}

/** @type {{ running: boolean, current: string | null, system: string, results: Record<string, any>, log: string[], child: import('node:child_process').ChildProcess | null, runKind: string | null, stressSummary: any }} */
const state = {
  running: false,
  current: null,
  system: 'admin',
  results: {},
  log: [],
  lastExitCode: null,
  startedAt: null,
  finishedAt: null,
  runId: null,
  command: null,
  lastRunIds: [],
  lastTarget: null,
  child: null,
  runKind: null,
  stressSummary: null,
  abortRun: false,
};

function readStressConfig() {
  return JSON.parse(fs.readFileSync(STRESS_CONFIG, 'utf8'));
}

function readStressHistory() {
  try {
    if (!fs.existsSync(STRESS_INDEX)) return [];
    const list = JSON.parse(fs.readFileSync(STRESS_INDEX, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function stopRunningChild() {
  state.abortRun = true;
  const child = state.child;
  if (!child || child.killed) return false;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_MINIAPP_LINK = {
  name: '小程序測試',
  subtitle: 'aChill QA',
  baseURL: 'http://127.0.0.1:3780',
};

function isTestSystem(id) {
  const s = SYSTEMS[id];
  return !!(s && typeof s === 'object' && s.id && s.project);
}

function systemIds() {
  return Object.keys(SYSTEMS).filter(isTestSystem);
}

function getMiniappLink() {
  const saved = SYSTEMS.links && typeof SYSTEMS.links === 'object' ? SYSTEMS.links.miniapp : null;
  const name = String(saved?.name || DEFAULT_MINIAPP_LINK.name).trim() || DEFAULT_MINIAPP_LINK.name;
  const subtitle = String(saved?.subtitle || DEFAULT_MINIAPP_LINK.subtitle).trim() || DEFAULT_MINIAPP_LINK.subtitle;
  const baseURL = String(saved?.baseURL || DEFAULT_MINIAPP_LINK.baseURL).trim().replace(/\/+$/, '') || DEFAULT_MINIAPP_LINK.baseURL;
  return { name, subtitle, baseURL };
}

function validateMiniappLink(body) {
  if (!body || typeof body !== 'object') throw new Error('請求內容無效');
  const baseURL = String(body.baseURL || '').trim().replace(/\/+$/, '');
  const name = String(body.name || '').trim();
  const subtitle = String(body.subtitle || '').trim();
  if (!baseURL) throw new Error('請填寫小程序測試台地址');
  if (!/^https?:\/\//i.test(baseURL)) throw new Error('地址需以 http:// 或 https:// 開頭');
  return {
    name: name || DEFAULT_MINIAPP_LINK.name,
    subtitle: subtitle || DEFAULT_MINIAPP_LINK.subtitle,
    baseURL,
  };
}

function getSystem(systemId = state.system) {
  const sys = SYSTEMS[systemId];
  if (!sys) throw new Error(`未知系統：${systemId}`);
  return sys;
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function writeJson(relPath, data) {
  const abs = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function resolveUnderRoot(relFile) {
  const abs = path.resolve(ROOT, String(relFile || ''));
  const root = path.resolve(ROOT);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.toLowerCase().startsWith(prefix.toLowerCase())) {
    throw new Error(`路徑超出專案根目錄：${relFile}`);
  }
  return abs;
}

/** 僅允許讀寫 tests/ 下的測試腳本 */
function resolveSpecFile(relFile) {
  const norm = String(relFile || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!norm.startsWith('tests/') || !/\.(spec\.)?tsx?$/i.test(norm)) {
    throw new Error('僅可編輯 tests/ 下的 .ts / .spec.ts 腳本');
  }
  const abs = resolveUnderRoot(norm);
  const testsRoot = path.resolve(ROOT, 'tests');
  const testsPrefix = testsRoot + path.sep;
  if (!abs.toLowerCase().startsWith(testsPrefix.toLowerCase())) {
    throw new Error('路徑必須位於 tests/ 目錄內');
  }
  return { abs, rel: norm };
}

function readSpecSource(relFile) {
  const { abs, rel } = resolveSpecFile(relFile);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error(`找不到腳本：${rel}`);
  }
  return { file: rel, content: fs.readFileSync(abs, 'utf8'), size: fs.statSync(abs).size };
}

function writeSpecSource(relFile, content) {
  if (typeof content !== 'string') throw new Error('content 必須為字串');
  if (content.length > 800_000) throw new Error('腳本過大（上限約 800KB）');
  const { abs, rel } = resolveSpecFile(relFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  return { ok: true, file: rel, bytes: Buffer.byteLength(content, 'utf8') };
}

/** 收集某系統 CRUD/E2E/用戶故事 fixture 中仍引用的腳本檔 */
function referencedSpecFiles(systemId, override = {}) {
  const sys = getSystem(systemId);
  const files = new Set();
  for (const kind of ['crud', 'e2e', 'story']) {
    const items = override[kind] || readJson(sys.fixtures[kind]);
    for (const it of items || []) {
      if (it?.file) files.add(String(it.file).replace(/\\/g, '/'));
    }
  }
  return files;
}

/** 僅刪 tests/ 下且無其他引用的 .spec.ts */
function tryDeleteOrphanSpec(relFile, stillReferenced) {
  const norm = String(relFile || '').replace(/\\/g, '/');
  if (!norm || stillReferenced.has(norm)) return null;
  if (!norm.startsWith('tests/') || !/\.spec\.ts$/i.test(norm)) return null;
  try {
    const abs = resolveUnderRoot(norm);
    const testsRoot = path.resolve(ROOT, 'tests');
    const testsPrefix = testsRoot + path.sep;
    if (!abs.toLowerCase().startsWith(testsPrefix.toLowerCase())) return null;
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
    fs.unlinkSync(abs);
    return norm;
  } catch {
    return null;
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : null);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function fixtureRelPath(systemId, kind) {
  const sys = getSystem(systemId);
  if (!sys.fixtures?.[kind]) throw new Error(`未知配置類型：${kind}`);
  return sys.fixtures[kind];
}

function validateFixtureItems(kind, items) {
  if (!Array.isArray(items)) throw new Error('內容必須是陣列');
  if (kind === 'smoke') {
    for (const [i, item] of items.entries()) {
      if (!item?.module || !item?.name || !item?.path) {
        throw new Error(`smoke 第 ${i + 1} 項缺少 module/name/path`);
      }
      if (item.path && !String(item.path).startsWith('/')) {
        throw new Error(`smoke 第 ${i + 1} 項 path 需以 / 開頭`);
      }
      if (item.checks && !Array.isArray(item.checks)) {
        throw new Error(`smoke 第 ${i + 1} 項 checks 需為陣列`);
      }
    }
    const paths = items.map((x) => x.path);
    if (new Set(paths).size !== paths.length) throw new Error('smoke path 不可重複');
    return items.map((item) => {
      const out = {
        module: String(item.module).trim(),
        name: String(item.name).trim(),
        path: String(item.path).trim(),
        checks: Array.isArray(item.checks) && item.checks.length ? item.checks.map(String) : ['pageReady'],
      };
      if (item.nav) out.nav = String(item.nav).trim();
      return out;
    });
  }
  if (kind === 'crud') {
    for (const [i, item] of items.entries()) {
      if (!item?.id || !item?.module || !item?.name || !item?.path || !item?.file) {
        throw new Error(`crud 第 ${i + 1} 項缺少 id/module/name/path/file`);
      }
      const abs = resolveUnderRoot(item.file);
      if (!fs.existsSync(abs)) {
        throw new Error(`crud 第 ${i + 1} 項找不到檔案：${item.file}`);
      }
    }
    const ids = items.map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new Error('crud id 不可重複');
    return items.map((item) => {
      const out = {
        id: String(item.id).trim(),
        module: String(item.module).trim(),
        name: String(item.name).trim(),
        path: String(item.path).trim(),
        file: String(item.file).trim().replace(/\\/g, '/'),
        description: String(item.description || '').trim(),
      };
      if (item.grep) out.grep = String(item.grep).trim();
      return out;
    });
  }
  if (kind === 'e2e') {
    for (const [i, item] of items.entries()) {
      if (!item?.id || !item?.module || !item?.name || !item?.file) {
        throw new Error(`e2e 第 ${i + 1} 項缺少 id/module/name/file`);
      }
      const abs = resolveUnderRoot(item.file);
      if (!fs.existsSync(abs)) {
        throw new Error(`e2e 第 ${i + 1} 項找不到檔案：${item.file}`);
      }
    }
    const ids = items.map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new Error('e2e id 不可重複');
    return items.map((item) => ({
      id: String(item.id).trim(),
      module: String(item.module).trim(),
      name: String(item.name).trim(),
      file: String(item.file).trim().replace(/\\/g, '/'),
      description: String(item.description || '').trim(),
    }));
  }
  if (kind === 'story') {
    for (const [i, item] of items.entries()) {
      if (!item?.id || !item?.module || !item?.name || !item?.file) {
        throw new Error(`story 第 ${i + 1} 項缺少 id/module/name/file`);
      }
      const abs = resolveUnderRoot(item.file);
      if (!fs.existsSync(abs)) {
        throw new Error(`story 第 ${i + 1} 項找不到檔案：${item.file}`);
      }
    }
    const ids = items.map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new Error('story id 不可重複');
    return items.map((item) => ({
      id: String(item.id).trim(),
      storyId: String(item.storyId || item.id.replace(/^story:/, '')).trim(),
      module: String(item.module).trim(),
      name: String(item.name).trim(),
      file: String(item.file).trim().replace(/\\/g, '/'),
      description: String(item.description || '').trim(),
    }));
  }
  throw new Error(`未知 kind：${kind}`);
}

function listSpecFiles(systemId, kind) {
  const sys = getSystem(systemId);
  const dir = sys.dirs?.[kind];
  if (!dir) return [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.spec\.ts$/i.test(name)) out.push(path.relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  walk(abs);
  return out.sort();
}

/**
 * 從 Playwright spec 解析 test('…') 標題，供未執行時預覽步驟。
 * @param {string} relFile
 * @returns {string[]}
 */
function extractSpecSteps(relFile) {
  if (!relFile) return [];
  const abs = path.isAbsolute(relFile) ? relFile : path.join(ROOT, relFile);
  if (!fs.existsSync(abs)) return [];
  let src = '';
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch {
    return [];
  }
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const steps = [];
  const re = /\btest(?:\.(?:only|skip|fix|fail))?\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = re.exec(cleaned))) {
    const title = m[2]
      .replace(/\\(['"`\\nrt])/g, (_, ch) => {
        if (ch === 'n') return ' ';
        if (ch === 'r' || ch === 't') return ' ';
        return ch;
      })
      .replace(/\s+/g, ' ')
      .trim();
    if (!title || title.includes('${')) continue;
    steps.push(title);
  }
  return steps;
}

function inferCrudGrep(suite, crudModules = []) {
  if (suite?.grep) return suite.grep;
  const file = suite?.file;
  if (!file) return null;
  const siblings = crudModules.filter((m) => m.file === file);
  if (siblings.length <= 1) return null;
  const titles = extractSpecSteps(file);
  const name = String(suite.name || '').trim();
  if (!name) return null;
  const hit = titles.find((title) => title.includes(name));
  return hit || name;
}

function withPlannedSteps(item, crudModules = []) {
  let plannedSteps = extractSpecSteps(item.file);
  const grep = inferCrudGrep(item, crudModules);
  if (grep) {
    plannedSteps = plannedSteps.filter((title) => title.includes(grep));
  }
  if (!plannedSteps.length && item.name) plannedSteps = [item.name];
  return {
    ...item,
    grep: grep || item.grep,
    plannedSteps,
    plannedStepSummary: plannedSteps.length ? `預計 ${plannedSteps.length} 步驟` : null,
  };
}

function loadFixtures(systemId) {
  const sys = getSystem(systemId);
  const smokeRaw = readJson(sys.fixtures.smoke);
  const crudRaw = readJson(sys.fixtures.crud);
  const e2eRaw = readJson(sys.fixtures.e2e);
  const storyRaw = sys.fixtures.story ? readJson(sys.fixtures.story) : [];
  return {
    smokeModules: smokeRaw,
    crudModules: crudRaw,
    e2eSuites: e2eRaw.map((s) => ({ ...s, kind: 'e2e' })),
    storySuites: (Array.isArray(storyRaw) ? storyRaw : []).map((s) => ({ ...s, kind: 'story' })),
  };
}

function catalog(systemId = state.system) {
  const { smokeModules, crudModules, e2eSuites, storySuites } = loadFixtures(systemId);
  const smokeFile = systemId === 'pos' ? 'tests/pos/smoke/modules.spec.ts' : 'tests/smoke/modules.spec.ts';
  const smoke = smokeModules.map((m) => ({
    id: `smoke:${m.path}`,
    kind: 'smoke',
    module: m.module,
    name: m.name,
    path: m.path,
    file: smokeFile,
    checks: m.checks,
    description: `冒煙：開啟 ${m.path} 並檢查可用性（共用腳本 ${smokeFile}）`,
    plannedSteps: [`開啟 ${m.path} 功能可用`],
    plannedStepSummary: '預計 1 步驟',
  }));
  const crud = crudModules.map((m) => withPlannedSteps({ ...m, kind: 'crud' }, crudModules));
  const e2e = e2eSuites.map((s) => withPlannedSteps(s));
  const story = storySuites.map((s) => ({
    ...s,
    kind: 'story',
    plannedSteps: [s.name || s.storyId || s.id],
    plannedStepSummary: '預計 1 步驟',
  }));
  return { system: systemId, smoke, e2e, crud, story };
}

function findCatalogEntry(systemId, itemId) {
  const cat = catalog(systemId);
  for (const kind of ['smoke', 'crud', 'e2e', 'story']) {
    const item = (cat[kind] || []).find((x) => x.id === itemId);
    if (item) return { kind, item };
  }
  return null;
}

/** 從 fixture 移除一項；CRUD/E2E/故事若腳本無其他引用則刪檔 */
function deleteCatalogItem(systemId, itemId) {
  const hit = findCatalogEntry(systemId, itemId);
  if (!hit) {
    const err = new Error('找不到此測試項');
    err.status = 404;
    throw err;
  }
  const { kind, item } = hit;
  const rel = fixtureRelPath(systemId, kind);
  const raw = readJson(rel);
  const list = Array.isArray(raw) ? raw : [];
  const next =
    kind === 'smoke'
      ? list.filter(
          (x) =>
            !(String(x.path) === String(item.path) && String(x.name) === String(item.name)),
        )
      : list.filter((x) => String(x.id) !== String(item.id));
  if (next.length === list.length) {
    const err = new Error('找不到此測試項');
    err.status = 404;
    throw err;
  }
  writeJson(rel, next);

  let deletedFile = null;
  let fileKept = null;
  if ((kind === 'crud' || kind === 'e2e' || kind === 'story') && item.file) {
    const still = referencedSpecFiles(systemId, { [kind]: next });
    const norm = String(item.file).replace(/\\/g, '/');
    deletedFile = tryDeleteOrphanSpec(norm, still);
    if (!deletedFile && still.has(norm)) fileKept = norm;
  }

  return {
    ok: true,
    id: itemId,
    kind,
    name: item.name,
    module: item.module,
    deletedFile,
    fileKept,
    catalog: catalog(systemId),
  };
}

function sendJson(res, status, data, extraHeaders) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(extraHeaders || {}),
  });
  res.end(body);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    }[ext] || 'application/octet-stream'
  );
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC, urlPath));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(filePath).toLowerCase();
  const noCache = ['.html', '.js', '.css'].includes(ext);
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': noCache ? 'no-store, max-age=0' : 'public, max-age=86400',
  });
  fs.createReadStream(filePath).pipe(res);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function grepWithSetup(systemId, pattern) {
  if (!pattern) return pattern;
  const login = systemId === 'pos' ? 'pos login' : 'admin login';
  return `(?:${pattern}|${login})`;
}

function buildPlaywrightArgs(systemId, target) {
  const sys = getSystem(systemId);
  const { smokeModules, crudModules, e2eSuites, storySuites } = loadFixtures(systemId);
  const base = ['playwright', 'test', `--project=${sys.project}`, '--workers=1'];

  if (target === 'smoke') return [...base, sys.dirs.smoke];
  if (target === 'e2e') return [...base, sys.dirs.e2e];
  if (target === 'crud') return [...base, sys.dirs.crud];
  if (target === 'story') return [...base, sys.dirs.story];
  if (target === 'all') {
    return [
      ...base,
      sys.dirs.smoke,
      sys.dirs.e2e,
      sys.dirs.crud,
      ...(sys.dirs.story ? [sys.dirs.story] : []),
    ];
  }

  if (target.startsWith('smoke:')) {
    const itemPath = target.slice('smoke:'.length);
    const item = smokeModules.find((m) => m.path === itemPath);
    if (!item) throw new Error(`找不到功能：${itemPath}`);
    return [...base, sys.dirs.smoke, '-g', grepWithSetup(systemId, `開啟 ${escapeRegExp(item.path)} 功能可用`)];
  }
  if (target.startsWith('e2e:')) {
    const suite = e2eSuites.find((s) => s.id === target);
    if (!suite) throw new Error(`找不到 E2E：${target}`);
    return [...base, suite.file];
  }
  if (target.startsWith('crud:')) {
    const suite = crudModules.find((s) => s.id === target);
    if (!suite) throw new Error(`找不到 CRUD：${target}`);
    const args = [...base, suite.file];
    const grep = inferCrudGrep(suite, crudModules);
    if (grep) args.push('-g', grepWithSetup(systemId, grep));
    return args;
  }
  if (target.startsWith('story:')) {
    const suite = storySuites.find((s) => s.id === target);
    if (!suite) throw new Error(`找不到用戶故事：${target}`);
    const grep = escapeRegExp(suite.storyId || target.slice('story:'.length));
    return [...base, suite.file, '-g', grepWithSetup(systemId, grep)];
  }
  if (target.startsWith('crud-module:')) {
    const moduleName = target.slice('crud-module:'.length);
    const files = crudModules.filter((m) => m.module === moduleName).map((m) => m.file);
    if (!files.length) throw new Error(`找不到 CRUD 模組：${moduleName}`);
    return [...base, ...files];
  }
  if (target.startsWith('e2e-module:')) {
    const moduleName = target.slice('e2e-module:'.length);
    const files = e2eSuites.filter((m) => m.module === moduleName).map((m) => m.file);
    if (!files.length) throw new Error(`找不到 E2E 模組：${moduleName}`);
    return [...base, ...files];
  }
  if (target.startsWith('story-module:')) {
    const moduleName = target.slice('story-module:'.length);
    const items = storySuites.filter((m) => m.module === moduleName);
    if (!items.length) throw new Error(`找不到用戶故事模組：${moduleName}`);
    const files = [...new Set(items.map((m) => m.file))];
    const pattern = items.map((m) => escapeRegExp(m.storyId || String(m.id).replace(/^story:/, ''))).join('|');
    return [...base, ...files, '-g', grepWithSetup(systemId, `(${pattern})`)];
  }
  if (target.startsWith('module:')) {
    const moduleName = target.slice('module:'.length);
    const items = smokeModules.filter((m) => m.module === moduleName);
    if (!items.length) throw new Error(`找不到模組：${moduleName}`);
    const pattern = items.map((m) => escapeRegExp(m.path)).join('|');
    return [...base, sys.dirs.smoke, '-g', grepWithSetup(systemId, `開啟 (${pattern}) 功能可用`)];
  }
  throw new Error(`未知 target：${target}`);
}

function markRunning(ids) {
  for (const id of ids) {
    state.results[id] = {
      id,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      steps: [],
      runId: state.runId || null,
      command: state.command || null,
      hasShots: false,
    };
  }
}

function idsForTarget(systemId, target) {
  const { smoke, e2e, crud, story } = catalog(systemId);
  if (target === 'smoke') return smoke.map((s) => s.id);
  if (target === 'e2e') return e2e.map((s) => s.id);
  if (target === 'crud') return crud.map((s) => s.id);
  if (target === 'story') return story.map((s) => s.id);
  if (target === 'all') return [...smoke, ...e2e, ...crud, ...story].map((s) => s.id);
  if (target.startsWith('module:')) {
    const moduleName = target.slice('module:'.length);
    return smoke.filter((s) => s.module === moduleName).map((s) => s.id);
  }
  if (target.startsWith('crud-module:')) {
    const moduleName = target.slice('crud-module:'.length);
    return crud.filter((s) => s.module === moduleName).map((s) => s.id);
  }
  if (target.startsWith('e2e-module:')) {
    const moduleName = target.slice('e2e-module:'.length);
    return e2e.filter((s) => s.module === moduleName).map((s) => s.id);
  }
  if (target.startsWith('story-module:')) {
    const moduleName = target.slice('story-module:'.length);
    return story.filter((s) => s.module === moduleName).map((s) => s.id);
  }
  return [target];
}

function stripAnsi(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, '');
}

function parseLineResults(systemId, logText) {
  const lines = String(logText).split(/\r?\n/);
  const updates = [];
  for (const raw of lines) {
    const line = stripAnsi(raw).replace(/\r/g, '');
    // Playwright list reporter：✓ / ✘ / - / ok / x
    const ok = line.match(/^\s*(?:✓|✔|√|ok)\s+(\d+)\s+\[([^\]]+)\]\s+›\s+(.+?)\s*(?:\([\d.]+\s*\w+\))?\s*$/i);
    const fail = line.match(
      /^\s*(?:✘|✕|✗|×|x|failed?)\s+(\d+)\s+\[([^\]]+)\]\s+›\s+(.+?)\s*(?:\([\d.]+\s*\w+\))?\s*$/i,
    );
    const skip = line.match(/^\s*(?:-|−|–|skipped?)\s+(\d+)\s+\[([^\]]+)\]\s+›\s+(.+?)\s*(?:\([\d.]+\s*\w+\))?\s*$/i);
    const prog = line.match(/^\s*\[(\d+)\/(\d+)\]\s+\[([^\]]+)\]\s+›\s+(.+)$/);
    const m = ok || fail || skip || prog;
    if (!m) continue;

    const title = (ok || fail || skip ? m[3] : m[4]).trim();
    const project = ok || fail || skip ? m[2] : m[3];
    if (/setup$/i.test(project) || /\.setup\.ts/i.test(title) || /login\.setup/i.test(title)) {
      continue;
    }

    let status = 'passed';
    if (fail) status = 'failed';
    else if (skip) status = 'skipped';
    else if (prog && !ok) status = 'running';

    const mapped = mapTitleToResultId(systemId, title);
    if (mapped) updates.push({ id: mapped, status, title });
  }
  return updates;
}

function suiteMatchScore(suite, normalizedTitle) {
  if (!suite?.file) return 0;
  const fileKey = path.basename(suite.file, '.spec.ts');
  const base = path.basename(suite.file);
  const rel = String(suite.file).replace(/\\/g, '/');
  let score = 0;
  // 最長檔名／路徑優先，避免 member-dine-pay-kitchen-pickup-journey
  // 被較短的 dine-pay-kitchen-pickup-journey 先吃掉
  if (rel && normalizedTitle.includes(rel)) score = Math.max(score, rel.length + 100);
  if (base && normalizedTitle.includes(base)) score = Math.max(score, base.length + 50);
  if (fileKey && normalizedTitle.includes(fileKey)) score = Math.max(score, fileKey.length + 20);
  // 同檔多個 CRUD（新增/查找/更新/删除）檔名分數相同；grep 必須加在檔名之上
  // 否則 Math.max(檔名 130, grep 9) 會讓四個動作同分，結果永遠落到第一個（新增）
  const leaf = String(normalizedTitle.split('›').pop() || '').trim();
  if (suite.grep && (leaf === suite.grep || normalizedTitle.includes(suite.grep))) {
    score += String(suite.grep).length + 80;
  } else if (suite.name && (leaf === suite.name || leaf.includes(String(suite.name)))) {
    score += String(suite.name).length + 20;
  }
  return score;
}

function suiteFileMatchesTitle(suite, normalizedTitle) {
  return suiteMatchScore(suite, normalizedTitle) > 0;
}

function matchSuiteByFile(suites, normalizedTitle) {
  const hits = (suites || [])
    .map((suite) => ({ suite, score: suiteMatchScore(suite, normalizedTitle) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!hits.length) return null;
  return hits[0].suite.id;
}

function mapTitleToResultId(systemId, title) {
  const { smokeModules, crudModules, e2eSuites, storySuites } = loadFixtures(systemId);
  const normalized = title.replace(/\\/g, '/');

  // 用戶故事：標題含 US-x.y.z
  const storyHit = normalized.match(/\bUS-[\d.]+/);
  if (storyHit) {
    const sid = storyHit[0];
    const found = storySuites.find(
      (s) => s.storyId === sid || s.id === `story:${sid}` || String(s.name || '').includes(sid),
    );
    if (found) return found.id.startsWith('story:') ? found.id : `story:${sid}`;
  }

  // 依路徑片段決定優先匹配類型，避免 CRUD / E2E 檔名互相搶結果
  const looksSmoke = /\/smoke\//i.test(normalized) || /modules\.spec/i.test(normalized) || /開啟\s+\S+\s+功能可用/.test(normalized);
  const looksCrud = /\/crud\//i.test(normalized) || /\.crud\.spec/i.test(normalized);
  const looksE2e = /\/e2e\//i.test(normalized) || /journey\.spec/i.test(normalized) || /bridge-/i.test(normalized);
  const looksStory = /\/story\//i.test(normalized) || /用戶故事/i.test(normalized);

  if (looksSmoke || (!looksCrud && !looksE2e && !looksStory)) {
    const smokeByPath = [...smokeModules].sort((a, b) => String(b.path).length - String(a.path).length);
    for (const item of smokeByPath) {
      if (normalized.includes(`開啟 ${item.path} 功能可用`)) return `smoke:${item.path}`;
    }
    const smokeMatch = normalized.match(/›\s+(.+?)\s+\/\s+(.+?)\s+›/);
    if (smokeMatch) {
      const moduleName = smokeMatch[1].trim();
      const name = smokeMatch[2].trim();
      const item = smokeModules.find((x) => x.module === moduleName && x.name === name);
      if (item) return `smoke:${item.path}`;
    }
  }

  if (looksStory) {
    const storyId = matchSuiteByFile(storySuites, normalized);
    if (storyId) return storyId;
  }
  if (looksCrud) {
    const crudId = matchSuiteByFile(crudModules, normalized);
    if (crudId) return crudId;
  }
  if (looksE2e) {
    const e2eId = matchSuiteByFile(e2eSuites, normalized);
    if (e2eId) return e2eId;
  }

  // 備援：仍依序嘗試 story → CRUD → E2E
  const storyId = matchSuiteByFile(storySuites, normalized);
  if (storyId) return storyId;
  const crudId = matchSuiteByFile(crudModules, normalized);
  if (crudId) return crudId;
  const e2eId = matchSuiteByFile(e2eSuites, normalized);
  if (e2eId) return e2eId;
  return null;
}

function stepTitleKey(title) {
  return String(title || '')
    .replace(/^.*›\s*/, '')
    .trim();
}

function mergeSteps(prevSteps, incoming) {
  const list = Array.isArray(prevSteps) ? prevSteps.map((s) => ({ ...s })) : [];
  for (const step of incoming) {
    const key = stepTitleKey(step.title);
    const idx = list.findIndex((s) => s.title === step.title || stepTitleKey(s.title) === key);
    if (idx >= 0) {
      for (const [k, v] of Object.entries(step)) {
        if (v !== undefined) list[idx][k] = v;
      }
    } else list.push({ ...step });
  }
  return list;
}

function newRunId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
}

function serveShot(res, runId, fileName) {
  if (!/^[A-Za-z0-9._-]+$/.test(runId) || !/^[A-Za-z0-9._-]+$/.test(fileName)) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  const dir = path.resolve(shotsDir(runId));
  const abs = path.resolve(dir, path.basename(fileName));
  const rel = path.relative(dir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': contentType(abs),
    'Cache-Control': 'public, max-age=86400',
  });
  fs.createReadStream(abs).pipe(res);
}

function attachArtifacts(systemId, runId, fallbackIds = []) {
  if (!runId) return;
  const jsonl = path.join(shotsDir(runId), 'steps.jsonl');
  if (!fs.existsSync(jsonl)) return;
  let raw = '';
  try {
    raw = fs.readFileSync(jsonl, 'utf8');
  } catch {
    return;
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const titleForMap = `${String(rec.file || '').replace(/\\/g, '/')} › ${(rec.titlePath || []).join(' › ')}`;
    let id = mapTitleToResultId(systemId, titleForMap);
    if (fallbackIds.length === 1 && id !== fallbackIds[0]) {
      const { crudModules } = loadFixtures(systemId);
      const want = crudModules.find((s) => s.id === fallbackIds[0]);
      const got = crudModules.find((s) => s.id === id);
      if (want && (!id || (got && want.file === got.file))) id = fallbackIds[0];
    }
    if (!id && fallbackIds.length === 1) id = fallbackIds[0];
    if (!id) continue;
    const prev = state.results[id] || { id, steps: [] };
    const shotFile = path.basename(String(rec.screenshot || ''));
    const screenshot = shotFile ? `/api/shots/${encodeURIComponent(runId)}/${encodeURIComponent(shotFile)}` : undefined;
    const statusRaw = rec.status === 'timedOut' || rec.status === 'interrupted' ? 'failed' : rec.status;
    const incoming = {
      title: rec.title || (Array.isArray(rec.titlePath) ? rec.titlePath[rec.titlePath.length - 1] : '步驟'),
      screenshot,
      url: rec.url || undefined,
      duration: typeof rec.duration === 'number' ? rec.duration : undefined,
      error: rec.error || undefined,
      how: `Playwright 執行 ${rec.file || ''} → ${(rec.titlePath || []).join(' › ')}`,
    };
    const existing = (prev.steps || []).find(
      (s) => s.title === incoming.title || stepTitleKey(s.title) === stepTitleKey(incoming.title),
    );
    if (!existing || existing.status === 'idle' || existing.status === 'running' || !existing.status) {
      incoming.status = statusRaw || 'passed';
    }
    const steps = mergeSteps(prev.steps, [incoming]);
    const summary = summarizeSteps(steps.filter((s) => s.status && s.status !== 'idle'));
    state.results[id] = {
      ...prev,
      id,
      runId,
      steps,
      stepSummary: summary.stepSummary || prev.stepSummary,
      hasShots: steps.some((s) => s.screenshot),
    };
  }
}

function serveShot(res, runId, fileName) {
  if (!/^[A-Za-z0-9._-]+$/.test(runId) || !/^[A-Za-z0-9._-]+$/.test(fileName)) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  const abs = path.join(shotsDir(runId), fileName);
  if (!abs.startsWith(shotsDir(runId)) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': contentType(abs),
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(abs).pipe(res);
}

function summarizeSteps(list) {
  const failed = list.some((x) => x.status === 'failed');
  const passed = list.some((x) => x.status === 'passed');
  const allSkipped = list.length > 0 && list.every((x) => x.status === 'skipped');
  const onlyRunning = !failed && !passed && !allSkipped && list.some((x) => x.status === 'running');

  let status = 'passed';
  if (failed) status = 'failed';
  else if (onlyRunning) status = 'running';
  else if (allSkipped) status = 'skipped';
  else if (passed) status = 'passed';

  const passCount = list.filter((x) => x.status === 'passed').length;
  const failCount = list.filter((x) => x.status === 'failed').length;
  const skipCount = list.filter((x) => x.status === 'skipped').length;

  return {
    status,
    error: failed ? list.find((x) => x.status === 'failed')?.title : null,
    stepSummary: `步驟 ${list.length}（通過 ${passCount} · 失敗 ${failCount} · 跳過 ${skipCount}）`,
  };
}

/**
 * @param {Array} updates
 * @param {string[]} fallbackIds
 * @param {number|null|undefined} exitCode
 * @param {{ replaceSteps?: boolean }} options replaceSteps=true 用於整段日誌重算，覆蓋串流中間態
 */
function applyParsedUpdates(updates, fallbackIds, exitCode, options = {}) {
  const replaceSteps = !!options.replaceSteps;
  let incomingUpdates = Array.isArray(updates) ? updates : [];
  // 單套件執行時，若標題被較短檔名搶走，把步驟收回這次真正跑的 id
  if (fallbackIds.length === 1 && incomingUpdates.length && !incomingUpdates.some((u) => u.id === fallbackIds[0])) {
    incomingUpdates = incomingUpdates.map((u) => ({ ...u, id: fallbackIds[0] }));
  }
  const byId = {};
  for (const u of incomingUpdates) {
    if (!byId[u.id]) byId[u.id] = [];
    byId[u.id].push(u);
  }

  for (const id of Object.keys(byId)) {
    const incoming = byId[id];
    const prev = state.results[id] || {};
    const list = mergeSteps(prev.steps, incoming);
    const summary = summarizeSteps(list);

    state.results[id] = {
      ...prev,
      id,
      status: summary.status,
      finishedAt: summary.status === 'running' ? null : new Date().toISOString(),
      steps: list,
      stepSummary: summary.stepSummary,
      error: summary.error,
    };
  }

  if (exitCode === null || exitCode === undefined) return;

  const parsedAny = Object.keys(byId).length > 0;
  for (const id of fallbackIds) {
    if (state.results[id]?.status !== 'running') continue;
    if (parsedAny) {
      state.results[id] = {
        ...state.results[id],
        status: 'idle',
        finishedAt: new Date().toISOString(),
        error: null,
      };
      continue;
    }
    state.results[id] = {
      ...state.results[id],
      status: exitCode === 0 ? 'passed' : 'failed',
      finishedAt: new Date().toISOString(),
      error: exitCode === 0 ? null : '執行失敗（詳見日誌）',
    };
  }
}

function shouldIsolateCrud(target, ids) {
  if (!ids || ids.length <= 1) return false;
  return target === 'crud' || String(target).startsWith('crud-module:');
}

function spawnPlaywright(systemId, args, runId, sse, send) {
  return new Promise((resolve, reject) => {
    const playwrightCli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
    const sys = getSystem(systemId);
    const child = spawn(process.execPath, [playwrightCli, ...args.slice(1)], {
      cwd: ROOT,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        QA_SYSTEM: systemId,
        QA_RUN_ID: runId,
        QA_ROOT: ROOT,
        QA_DATA_DIR: PATHS.qaData,
        PYTHONUNBUFFERED: '1',
        ...envForSystem(sys),
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    state.child = child;
    state.runKind = 'functional';
    if (child.stdout) child.stdout.setEncoding('utf8');
    if (child.stderr) child.stderr.setEncoding('utf8');

    send('log', { line: `$ [${systemId}] node ${path.relative(ROOT, playwrightCli)} ${args.slice(1).join(' ')}` });

    let lineBuf = '';
    const onChunk = (chunk) => {
      lineBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      const parts = lineBuf.split(/\r?\n/);
      lineBuf = parts.pop() || '';
      for (const line of parts) {
        if (!line.trim()) continue;
        state.log.push(line);
        if (state.log.length > 4000) state.log.shift();
        send('log', { line });

        const updates = parseLineResults(systemId, line);
        if (updates.length) {
          applyParsedUpdates(updates, [], null, { replaceSteps: false });
          attachArtifacts(systemId, runId);
          send('status', { running: true, current: state.current, system: systemId, results: state.results });
        }
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);

    child.on('error', (err) => {
      state.child = null;
      reject(err);
    });

    child.on('close', (code) => {
      if (lineBuf.trim()) {
        state.log.push(lineBuf.trim());
        send('log', { line: lineBuf.trim() });
      }
      state.child = null;
      resolve(code ?? 1);
    });
  });
}

function finishFunctionalRun(systemId, target, ids, runId, exitCode, sse, send) {
  state.lastExitCode = exitCode;
  state.running = false;
  state.current = null;
  state.child = null;
  state.runKind = null;
  state.finishedAt = new Date().toISOString();

  const updates = parseLineResults(systemId, state.log.join('\n'));
  applyParsedUpdates(updates, ids, exitCode, { replaceSteps: true });
  attachArtifacts(systemId, runId, ids);
  for (const id of ids) {
    if (!state.results[id]) continue;
    state.results[id].runId = runId;
    state.results[id].command = state.results[id].command || state.command;
    state.results[id].startedAt = state.results[id].startedAt || state.startedAt;
    state.results[id].finishedAt = state.results[id].finishedAt || state.finishedAt;
    if (state.abortRun && state.results[id].status === 'running') {
      state.results[id].status = 'idle';
      state.results[id].error = '已停止';
    }
  }

  try {
    persistRunArtifacts({
      runId,
      systemId,
      target,
      command: state.command,
      exitCode,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      ids,
      results: state.results,
      log: state.log,
    });
  } catch (err) {
    console.error('[dashboard] 持久化執行結果失敗：', err);
    state.log.push(`[persist-error] ${err.message || String(err)}`);
    send('log', { line: `⚠️ 結果寫入磁碟失敗：${err.message || String(err)}（刷新後可能看不到歷史／截圖）` });
  }

  send('status', {
    running: false,
    current: null,
    system: systemId,
    results: state.results,
    exitCode,
    finishedAt: state.finishedAt,
  });
  send('done', { exitCode, system: systemId });
}

function runTests(systemId, target, sse) {
  const ids = idsForTarget(systemId, target);
  const runId = newRunId();
  const isolate = shouldIsolateCrud(target, ids);

  let firstArgs;
  try {
    firstArgs = buildPlaywrightArgs(systemId, isolate ? ids[0] : target);
  } catch (err) {
    return Promise.reject(err);
  }

  state.abortRun = false;
  state.running = true;
  state.current = target;
  state.system = systemId;
  state.log = [];
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastExitCode = null;
  state.runId = runId;
  state.command = isolate
    ? `npx playwright test 逐項執行 ${ids.length} 個 CRUD`
    : `npx ${firstArgs.join(' ')}`;
  state.lastRunIds = ids;
  state.lastTarget = target;
  markRunning(ids);

  const send = (event, data) => {
    if (!sse || sse.writableEnded) return;
    sse.write(`event: ${event}\n`);
    sse.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof sse.flush === 'function') sse.flush();
  };

  send('status', { running: true, current: target, system: systemId, results: state.results });

  return (async () => {
    let lastExit = 0;
    try {
      if (isolate) {
        send('log', { line: `CRUD 將逐項獨立執行（共 ${ids.length} 項），互不影響。` });
        for (let i = 0; i < ids.length; i += 1) {
          if (state.abortRun) {
            send('log', { line: '已停止，後續 CRUD 項目不會執行。' });
            break;
          }
          const id = ids[i];
          const itemArgs = buildPlaywrightArgs(systemId, id);
          send('log', { line: `\n════ CRUD ${i + 1}/${ids.length}  ${id} ════` });
          state.current = id;
          const code = await spawnPlaywright(systemId, itemArgs, runId, sse, send);
          const updates = parseLineResults(systemId, state.log.join('\n')).filter((u) => u.id === id);
          applyParsedUpdates(updates, [id], code, { replaceSteps: true });
          if (state.results[id]) {
            state.results[id].command = `npx ${itemArgs.join(' ')}`;
            state.results[id].runId = runId;
            state.results[id].finishedAt = new Date().toISOString();
          }
          send('status', { running: true, current: id, system: systemId, results: state.results });
          if (code !== 0) lastExit = code;
        }
      } else {
        lastExit = await spawnPlaywright(systemId, firstArgs, runId, sse, send);
      }
    } catch (err) {
      state.running = false;
      state.current = null;
      state.child = null;
      state.runKind = null;
      state.finishedAt = new Date().toISOString();
      send('fail', { message: err.message });
      throw err;
    }

    finishFunctionalRun(systemId, target, ids, runId, lastExit, sse, send);
    return lastExit;
  })();
}

function ensureResultsDirs() {
  migrateLegacyIfNeeded();
  ensureQaDataDirs();
}

function persistRunArtifacts({
  runId,
  systemId,
  target,
  command,
  exitCode,
  startedAt,
  finishedAt,
  ids,
  results,
  log,
}) {
  archiveRun({
    runId,
    system: systemId,
    target,
    command,
    exitCode,
    startedAt,
    finishedAt,
    ids,
    results,
    log,
  });
  saveCurrent(systemId, {
    system: systemId,
    target,
    runId,
    command,
    exitCode,
    startedAt,
    finishedAt,
    lastRunIds: ids,
    results,
    log: Array.isArray(log) ? log.slice(-800) : [],
  });
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.writeFileSync(
    RESULTS_FILE,
    JSON.stringify(
      {
        system: systemId,
        target,
        runId,
        command,
        exitCode,
        startedAt,
        finishedAt,
        lastRunIds: ids,
        results,
        log: Array.isArray(log) ? log.slice(-500) : [],
      },
      null,
      2,
    ),
  );
}

function loadPersistedResults() {
  try {
    ensureResultsDirs();
  } catch (err) {
    console.error('[dashboard] test-results 目錄不可寫：', path.join(ROOT, 'test-results'));
    console.error(err);
  }

  let data = null;
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[dashboard] 讀取 dashboard-last.json 失敗：', err.message);
  }

  // 若 last 缺失，改從 dashboard-current 裡挑最近一筆
  if (!data?.results) {
    try {
      let best = null;
      for (const id of systemIds()) {
        const cur = loadCurrent(id);
        if (!cur?.results) continue;
        if (!best || String(cur.finishedAt || '') > String(best.finishedAt || '')) best = cur;
      }
      if (best) data = best;
    } catch (err) {
      console.error('[dashboard] 讀取 dashboard-current 失敗：', err.message);
    }
  }

  if (!data) return;

  try {
    if (data?.results) state.results = data.results;
    if (data?.system && SYSTEMS[data.system]) state.system = data.system;
    if (Array.isArray(data?.log)) state.log = data.log;
    state.lastExitCode = data.exitCode ?? null;
    state.startedAt = data.startedAt || null;
    state.finishedAt = data.finishedAt || null;
    state.runId = data.runId || null;
    state.command = data.command || null;
    state.lastRunIds = Array.isArray(data.lastRunIds) ? data.lastRunIds : [];
    state.lastTarget = data.target || null;
    if (!state.lastRunIds.length && data?.results) {
      state.lastRunIds = Object.keys(data.results).filter(
        (id) => data.results[id]?.runId === data.runId || data.results[id]?.status,
      );
    }
    if (data?.system && SYSTEMS[data.system] && !loadCurrent(data.system)) {
      saveCurrent(data.system, {
        system: data.system,
        target: data.target,
        runId: data.runId,
        command: data.command,
        exitCode: data.exitCode,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        lastRunIds: state.lastRunIds,
        results: data.results || {},
        log: data.log || [],
      });
    }
    console.log(
      `[dashboard] 已載入上次結果 system=${state.system} runId=${state.runId || '—'} items=${state.lastRunIds.length}`,
    );
  } catch (err) {
    console.error('[dashboard] 套用持久化結果失敗：', err.message);
  }
}

loadPersistedResults();
try {
  if (state.runId && !loadRun(state.runId) && (state.lastRunIds || []).length) {
    archiveRun({
      runId: state.runId,
      system: state.system,
      target: state.lastTarget,
      command: state.command,
      exitCode: state.lastExitCode,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      ids: state.lastRunIds,
      results: state.results,
      log: state.log,
    });
  }
} catch {
  // ignore
}

function runStress(options, sse) {
  return new Promise((resolve, reject) => {
    const {
      systemId,
      vus,
      durationSec,
      rampUpSec,
      scenarios,
      withUi,
      uiWorkers,
    } = options;

    const runId = `stress-${Date.now().toString(36)}`;
    state.running = true;
    state.current = `stress:${systemId}`;
    state.system = systemId;
    state.log = [];
    state.startedAt = new Date().toISOString();
    state.finishedAt = null;
    state.lastExitCode = null;
    state.runId = runId;
    state.runKind = 'stress';
    state.stressSummary = null;
    state.command = `node stress/runner.js --system=${systemId} --vus=${vus} --duration=${durationSec}`;
    state.lastTarget = state.current;
    state.lastRunIds = [];

    const send = (event, data) => {
      if (!sse || sse.writableEnded) return;
      sse.write(`event: ${event}\n`);
      sse.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof sse.flush === 'function') sse.flush();
    };

    send('status', {
      running: true,
      current: state.current,
      system: systemId,
      runKind: 'stress',
    });
    send('log', { line: `$ ${state.command}` });

    const child = spawn(process.execPath, [path.join(ROOT, 'stress', 'runner.js')], {
      cwd: ROOT,
      env: {
        ...process.env,
        STRESS_SYSTEM: systemId,
        STRESS_VUS: String(vus),
        STRESS_DURATION: String(durationSec),
        STRESS_RAMP: String(rampUpSec),
        STRESS_SCENARIOS: (scenarios || []).join(','),
        STRESS_WITH_UI: withUi ? '1' : '0',
        STRESS_UI_WORKERS: String(uiWorkers || 0),
        STRESS_RUN_ID: runId,
        QA_ROOT: ROOT,
        QA_DATA_DIR: PATHS.qaData,
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    state.child = child;
    if (child.stdout) child.stdout.setEncoding('utf8');
    if (child.stderr) child.stderr.setEncoding('utf8');

    let lineBuf = '';
    const onChunk = (chunk) => {
      lineBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      const parts = lineBuf.split(/\r?\n/);
      lineBuf = parts.pop() || '';
      for (const line of parts) {
        if (!line.trim()) continue;
        state.log.push(line);
        if (state.log.length > 2000) state.log.shift();
        try {
          const msg = JSON.parse(line);
          if (msg.event === 'log') {
            send('log', { line: msg.line });
          } else if (msg.event === 'metrics') {
            send('stress-metrics', msg);
          } else if (msg.event === 'start') {
            send('stress-start', msg);
            send('log', { line: `壓測開始 runId=${msg.runId}` });
          } else if (msg.event === 'done') {
            state.stressSummary = msg;
            send('stress-done', msg);
          } else if (msg.event === 'fail') {
            send('fail', { message: msg.message });
            send('log', { line: `失敗：${msg.message}` });
          } else {
            send('log', { line });
          }
        } catch {
          send('log', { line });
        }
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8').trim();
      if (!text) return;
      state.log.push(text);
      send('log', { line: text });
    });

    child.on('error', (err) => {
      state.running = false;
      state.current = null;
      state.child = null;
      state.runKind = null;
      state.finishedAt = new Date().toISOString();
      send('fail', { message: err.message });
      reject(err);
    });

    child.on('close', (code) => {
      if (lineBuf.trim()) {
        try {
          const msg = JSON.parse(lineBuf.trim());
          if (msg.event === 'done') state.stressSummary = msg;
        } catch {
          send('log', { line: lineBuf.trim() });
        }
        lineBuf = '';
      }
      const exitCode = code ?? 1;
      state.lastExitCode = exitCode;
      state.running = false;
      state.current = null;
      state.child = null;
      state.runKind = null;
      state.finishedAt = new Date().toISOString();
      send('status', {
        running: false,
        current: null,
        system: systemId,
        runKind: null,
        exitCode,
        finishedAt: state.finishedAt,
        stressSummary: state.stressSummary,
      });
      send('done', { exitCode, system: systemId, kind: 'stress', summary: state.stressSummary });
      resolve(exitCode);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const method = String(req.method || 'GET').toUpperCase();

  if (url.pathname.startsWith('/api/')) {
    const authUser = auth.userFromRequest(req);

    if (url.pathname === '/api/auth/login' && method === 'POST') {
      if (!auth.checkLoginRate(req)) {
        return sendJson(res, 429, { error: '嘗試次數過多，請稍後再試' });
      }
      try {
        const body = await readRequestBody(req);
        const result = auth.login(body?.username, body?.password);
        if (!result.ok) return sendJson(res, 401, { error: result.error });
        return sendJson(
          res,
          200,
          { ok: true, user: auth.publicUser(result.user) },
          { 'Set-Cookie': auth.cookieHeader(result.token, auth.SESSION_TTL_SEC) },
        );
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    if (url.pathname === '/api/auth/me' && method === 'GET') {
      return sendJson(res, 200, { user: auth.publicUser(authUser) });
    }

    if (url.pathname === '/api/auth/logout' && (method === 'POST' || method === 'GET')) {
      auth.destroySession(req);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookieHeader() });
    }

    if (!authUser) {
      return sendJson(res, 401, { error: '請先登入' });
    }
    if (authUser.role !== 'admin' && !auth.runnerMay(method, url.pathname)) {
      return sendJson(res, 403, { error: '權限不足：執行者僅可執行腳本，不可編輯或刪除' });
    }

    if (url.pathname === '/api/users' && method === 'GET') {
      if (authUser.role !== 'admin') return sendJson(res, 403, { error: '僅管理員可管理用戶' });
      return sendJson(res, 200, { users: auth.listUsers() });
    }
    if (url.pathname === '/api/users' && method === 'POST') {
      if (authUser.role !== 'admin') return sendJson(res, 403, { error: '僅管理員可新增用戶' });
      try {
        const body = await readRequestBody(req);
        const user = auth.createRunner({
          username: body?.username,
          password: body?.password,
          displayName: body?.displayName,
        });
        return sendJson(res, 200, { ok: true, user });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/users/') && (method === 'PUT' || method === 'PATCH')) {
      if (authUser.role !== 'admin') return sendJson(res, 403, { error: '僅管理員可修改用戶' });
      try {
        const id = decodeURIComponent(url.pathname.slice('/api/users/'.length));
        const body = await readRequestBody(req);
        const user = auth.patchUser(id, body || {}, authUser);
        return sendJson(res, 200, { ok: true, user });
      } catch (err) {
        return sendJson(res, err.status || 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/users/') && method === 'DELETE') {
      if (authUser.role !== 'admin') return sendJson(res, 403, { error: '僅管理員可刪除用戶' });
      try {
        const id = decodeURIComponent(url.pathname.slice('/api/users/'.length));
        return sendJson(res, 200, auth.deleteUser(id, authUser));
      } catch (err) {
        return sendJson(res, err.status || 400, { error: err.message || String(err) });
      }
    }
  }

  if (url.pathname === '/api/systems') {
    reloadSystems();
    return sendJson(
      res,
      200,
      systemIds().map((id) => {
        const s = SYSTEMS[id];
        return {
          id: s.id,
          name: s.name,
          subtitle: s.subtitle,
          baseURL: s.baseURL,
          loginUser: s.loginUser,
        };
      }),
    );
  }

  if (url.pathname === '/api/system-config') {
    const systemId = url.searchParams.get('system') || state.system;
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });

    if (req.method === 'GET') {
      reloadSystems();
      const s = SYSTEMS[systemId];
      return sendJson(res, 200, {
        id: s.id,
        name: s.name,
        subtitle: s.subtitle,
        baseURL: s.baseURL,
        loginUser: s.loginUser,
        loginPass: s.loginPass,
        authFile: s.authFile,
        file: 'systems.json',
      });
    }

    if (req.method === 'PUT') {
      if (state.running) return sendJson(res, 409, { error: '測試執行中，暫不可改系統配置' });
      try {
        const body = await readRequestBody(req);
        const patch = validateSystemConfig(body);
        reloadSystems();
        const s = SYSTEMS[systemId];
        Object.assign(s, patch);
        saveSystems();
        const clearedAuth = clearAuthFile(s);
        return sendJson(res, 200, {
          ok: true,
          system: systemId,
          file: 'systems.json',
          clearedAuth,
          config: {
            id: s.id,
            name: s.name,
            subtitle: s.subtitle,
            baseURL: s.baseURL,
            loginUser: s.loginUser,
            loginPass: s.loginPass,
            authFile: s.authFile,
          },
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/miniapp-config') {
    if (req.method === 'GET') {
      reloadSystems();
      return sendJson(res, 200, {
        ...getMiniappLink(),
        file: 'systems.json',
      });
    }

    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req);
        const patch = validateMiniappLink(body);
        reloadSystems();
        if (!SYSTEMS.links || typeof SYSTEMS.links !== 'object' || Array.isArray(SYSTEMS.links)) {
          SYSTEMS.links = {};
        }
        SYSTEMS.links.miniapp = patch;
        saveSystems();
        return sendJson(res, 200, {
          ok: true,
          file: 'systems.json',
          config: getMiniappLink(),
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/catalog') {
    const systemId = url.searchParams.get('system') || state.system;
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    return sendJson(res, 200, catalog(systemId));
  }

  if (url.pathname === '/api/catalog-item') {
    if (req.method !== 'DELETE') return sendJson(res, 405, { error: 'Method Not Allowed' });
    const systemId = url.searchParams.get('system') || state.system;
    const itemId = url.searchParams.get('id');
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    if (!itemId) return sendJson(res, 400, { error: '缺少 id' });
    if (state.running) return sendJson(res, 409, { error: '測試執行中，暫不可刪腳本' });
    try {
      return sendJson(res, 200, deleteCatalogItem(systemId, itemId));
    } catch (err) {
      return sendJson(res, err.status || 400, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/spec') {
    if (req.method === 'GET') {
      try {
        const file = url.searchParams.get('file');
        if (!file) return sendJson(res, 400, { error: '缺少 file' });
        return sendJson(res, 200, readSpecSource(file));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (req.method === 'PUT') {
      if (state.running) return sendJson(res, 409, { error: '測試執行中，暫不可改腳本' });
      try {
        const body = await readRequestBody(req);
        if (!body?.file) return sendJson(res, 400, { error: '缺少 file' });
        if (body.content == null) return sendJson(res, 400, { error: '缺少 content' });
        const result = writeSpecSource(body.file, String(body.content));
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/storage') {
    const checks = {
      root: PATHS.root,
      qaData: PATHS.qaData,
      history: PATHS.history,
      shots: PATHS.shots,
      current: PATHS.current,
      lastFile: PATHS.lastFile,
      stress: PATHS.stress,
    };
    const exists = {};
    for (const [k, p] of Object.entries(checks)) {
      exists[k] = fs.existsSync(p);
    }
    let writable = false;
    let writeError = null;
    try {
      ensureQaDataDirs();
      writable = true;
    } catch (err) {
      writeError = err.message || String(err);
    }
    let historyCount = 0;
    let shotRuns = 0;
    try {
      historyCount = listHistory().length;
    } catch {
      historyCount = -1;
    }
    try {
      if (fs.existsSync(PATHS.shots)) {
        shotRuns = fs.readdirSync(PATHS.shots).filter((n) => fs.statSync(path.join(PATHS.shots, n)).isDirectory()).length;
      }
    } catch {
      shotRuns = -1;
    }
    return sendJson(res, 200, {
      paths: checks,
      exists,
      writable,
      writeError,
      historyCount,
      shotRuns,
      memory: {
        system: state.system,
        runId: state.runId,
        lastRunIds: (state.lastRunIds || []).length,
        resultKeys: Object.keys(state.results || {}).length,
      },
    });
  }

  if (url.pathname === '/api/state') {
    return sendJson(res, 200, {
      running: state.running,
      current: state.current,
      system: state.system,
      results: state.results,
      log: state.log.slice(-300),
      lastExitCode: state.lastExitCode,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      lastRunIds: state.lastRunIds || [],
      lastTarget: state.lastTarget,
      runId: state.runId,
      runKind: state.runKind,
      stressSummary: state.stressSummary,
    });
  }

  if (url.pathname === '/api/current') {
    const systemId = url.searchParams.get('system') || state.system;
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    const cur = loadCurrent(systemId);
    if (!cur) return sendJson(res, 200, { system: systemId, results: {}, lastRunIds: [], log: [] });
    // 刷新時依 jsonl 補回截圖路徑（避免結果在、圖 URL 丟了）
    if (cur.runId && cur.results) {
      const prev = state.results;
      state.results = { ...cur.results };
      attachArtifacts(systemId, cur.runId);
      cur.results = state.results;
      state.results = prev;
    }
    return sendJson(res, 200, cur);
  }

  if (url.pathname === '/api/history') {
    const systemId = url.searchParams.get('system') || '';
    return sendJson(res, 200, { items: listHistory(systemId || undefined) });
  }

  if (url.pathname.startsWith('/api/history/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    // api history runId [log]
    const runId = decodeURIComponent(parts[2] || '');
    const extra = parts[3];
    if (extra === 'log') {
      const text = readRunLog(runId);
      if (text == null) return sendJson(res, 404, { error: '找不到此紀錄' });
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${runId}.log.txt"`,
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }
    const run = loadRun(runId);
    if (!run) return sendJson(res, 404, { error: '找不到此紀錄' });
    if (run.runId && run.system && run.results) {
      const prev = state.results;
      state.results = { ...run.results };
      attachArtifacts(run.system, run.runId);
      run.results = state.results;
      state.results = prev;
    }
    return sendJson(res, 200, run);
  }

  if (url.pathname === '/api/fixtures') {
    const systemId = url.searchParams.get('system') || state.system;
    const kind = url.searchParams.get('kind');
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    if (!['smoke', 'crud', 'e2e', 'story'].includes(kind)) {
      return sendJson(res, 400, { error: 'kind 需為 smoke / crud / e2e / story' });
    }

    if (req.method === 'GET') {
      const rel = fixtureRelPath(systemId, kind);
      return sendJson(res, 200, {
        system: systemId,
        kind,
        file: rel,
        items: readJson(rel),
        specFiles: kind === 'smoke' ? [] : listSpecFiles(systemId, kind),
        checkOptions:
          systemId === 'pos'
            ? ['posShell', 'productGrid', 'statusTabs', 'orderList', 'memberSearch', 'wineList', 'wineCreate', 'cleaning', 'dashboard', 'pageReady']
            : ['dashboard', 'tableOrEmpty', 'search', 'pageReady'],
      });
    }

    if (req.method === 'PUT') {
      if (state.running) return sendJson(res, 409, { error: '測試執行中，暫不可改路徑' });
      try {
        const body = await readRequestBody(req);
        const items = validateFixtureItems(kind, body?.items);
        const rel = fixtureRelPath(systemId, kind);
        const prevItems = readJson(rel);
        const prevFiles = new Set(
          (Array.isArray(prevItems) ? prevItems : [])
            .map((x) => (x?.file ? String(x.file).replace(/\\/g, '/') : ''))
            .filter(Boolean),
        );
        const nextFiles = new Set(
          items.map((x) => (x?.file ? String(x.file).replace(/\\/g, '/') : '')).filter(Boolean),
        );
        writeJson(rel, items);

        // 被移出本 fixture、且系統內其他 CRUD/E2E 也不再引用 → 刪腳本
        const deletedFiles = [];
        if (kind === 'crud' || kind === 'e2e' || kind === 'story') {
          const still = referencedSpecFiles(systemId, { [kind]: items });
          for (const f of prevFiles) {
            if (nextFiles.has(f)) continue;
            const removed = tryDeleteOrphanSpec(f, still);
            if (removed) deletedFiles.push(removed);
          }
        }

        return sendJson(res, 200, {
          ok: true,
          system: systemId,
          kind,
          file: rel,
          count: items.length,
          deletedFiles,
          catalog: catalog(systemId),
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/export-pdf') {
    const systemId = url.searchParams.get('system') || state.system;
    const id = url.searchParams.get('id');
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    if (!id) return sendJson(res, 400, { error: '缺少 id' });
    const cat = catalog(systemId);
    const item = [...cat.smoke, ...cat.crud, ...cat.e2e, ...(cat.story || [])].find((x) => x.id === id);
    if (!item) return sendJson(res, 404, { error: '找不到測試項' });
    const resultRunId = url.searchParams.get('runId') || '';
    let result = state.results[id];
    if (resultRunId) {
      const run = loadRun(resultRunId);
      if (!run) return sendJson(res, 404, { error: '找不到該次執行紀錄' });
      result = run.results?.[id];
    }
    if (!result || !result.status || result.status === 'idle' || result.status === 'running') {
      return sendJson(res, 400, { error: '尚無可匯出的執行結果，請先執行此項或載入歷史紀錄' });
    }
    try {
      const { pdf, fileName } = await exportResultPdf({
        systemName: SYSTEMS[systemId].name || systemId,
        item,
        result,
      });
      const ascii = fileName.replace(/[^\x20-\x7E]/g, '_');
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(pdf),
      });
      return res.end(pdf);
    } catch (err) {
      return sendJson(res, 500, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/export-pdf-batch' && req.method === 'POST') {
    const systemId = url.searchParams.get('system') || state.system;
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });
    try {
      const body = await readRequestBody(req);
      const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
      if (!ids.length) return sendJson(res, 400, { error: '請選擇至少一項' });
      if (ids.length > 80) return sendJson(res, 400, { error: '一次最多匯出 80 項，請縮小範圍' });
      const resultRunId = String(body?.runId || '');
      const reportTitle = String(body?.title || '批次測試報告').trim() || '批次測試報告';
      let resultMap = state.results;
      if (resultRunId) {
        const run = loadRun(resultRunId);
        if (!run) return sendJson(res, 404, { error: '找不到該次執行紀錄' });
        resultMap = run.results || {};
      }
      const cat = catalog(systemId);
      const allItems = [...cat.smoke, ...cat.crud, ...cat.e2e, ...(cat.story || [])];
      const entries = [];
      for (const id of ids) {
        const item = allItems.find((x) => x.id === id);
        const result = resultMap[id];
        if (!item || !result || !result.status || result.status === 'idle' || result.status === 'running') {
          continue;
        }
        entries.push({ item, result });
      }
      if (!entries.length) return sendJson(res, 400, { error: '選中項尚無可匯出的執行結果' });
      const { pdf, fileName } = await exportBatchPdf({
        systemName: SYSTEMS[systemId].name || systemId,
        entries,
        reportTitle,
      });
      const ascii = fileName.replace(/[^\x20-\x7E]/g, '_');
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(pdf),
      });
      return res.end(pdf);
    } catch (err) {
      return sendJson(res, 500, { error: err.message || String(err) });
    }
  }

  if (url.pathname.startsWith('/api/shots/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    // api / shots / runId / file
    if (parts.length !== 4) return sendJson(res, 404, { error: 'not found' });
    return serveShot(res, decodeURIComponent(parts[2]), decodeURIComponent(parts[3]));
  }

  if (url.pathname === '/api/stress/config') {
    try {
      return sendJson(res, 200, readStressConfig());
    } catch (err) {
      return sendJson(res, 500, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/stress/history') {
    const systemId = url.searchParams.get('system') || '';
    let items = readStressHistory();
    if (systemId) {
      items = items.filter((x) => String(x.system || '') === systemId);
    }
    return sendJson(res, 200, { items, system: systemId || null });
  }

  if (url.pathname.startsWith('/api/stress/run/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    // api stress run runId
    const runId = decodeURIComponent(parts[3] || '');
    if (!/^[A-Za-z0-9._-]+$/.test(runId)) return sendJson(res, 400, { error: '無效 runId' });
    const summaryPath = path.join(PATHS.stress, runId, 'summary.json');
    const failuresPath = path.join(PATHS.stress, runId, 'failures.json');
    // 相容舊路徑
    const legacySummary = path.join(ROOT, 'test-results', 'stress', runId, 'summary.json');
    const legacyFailures = path.join(ROOT, 'test-results', 'stress', runId, 'failures.json');
    const useSummary = fs.existsSync(summaryPath) ? summaryPath : legacySummary;
    const useFailures = fs.existsSync(failuresPath) ? failuresPath : legacyFailures;
    if (!fs.existsSync(useSummary)) return sendJson(res, 404, { error: '找不到此次壓測結果' });
    try {
      const summary = JSON.parse(fs.readFileSync(useSummary, 'utf8'));
      let failures = null;
      if (fs.existsSync(useFailures)) {
        failures = JSON.parse(fs.readFileSync(useFailures, 'utf8'));
      }
      return sendJson(res, 200, { summary, failures });
    } catch (err) {
      return sendJson(res, 500, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/stop' && (req.method === 'POST' || req.method === 'GET')) {
    if (!state.running) return sendJson(res, 200, { ok: true, stopped: false, message: '目前沒有執行中的任務' });
    const ok = stopRunningChild();
    state.log.push('使用者請求停止執行');
    return sendJson(res, 200, { ok: true, stopped: ok, runKind: state.runKind });
  }

  if (url.pathname === '/api/stress/stop' && (req.method === 'POST' || req.method === 'GET')) {
    if (!state.running || state.runKind !== 'stress') {
      return sendJson(res, 200, { ok: true, stopped: false, message: '目前沒有壓力測試在執行' });
    }
    const ok = stopRunningChild();
    state.log.push('使用者請求停止壓力測試');
    return sendJson(res, 200, { ok: true, stopped: ok });
  }

  if (url.pathname === '/api/stress/run') {
    if (state.running) {
      return sendJson(res, 409, { error: '已有測試正在執行，請稍候（或先停止）' });
    }
    const systemId = url.searchParams.get('system') || state.system;
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });

    let cfg;
    try {
      cfg = readStressConfig();
    } catch (err) {
      return sendJson(res, 500, { error: `讀取 stress/config.json 失敗：${err.message}` });
    }
    const defaults = cfg.defaults || {};
    const uiCfg = cfg.ui || {};
    const vus = Math.max(1, Number(url.searchParams.get('vus') || defaults.vus || 100));
    const durationSec = Math.max(1, Number(url.searchParams.get('duration') || defaults.durationSec || 60));
    const rampUpSec = Math.max(0, Number(url.searchParams.get('ramp') || defaults.rampUpSec || 10));
    const withUi = url.searchParams.get('withUi') === '1';
    let uiWorkers = Math.max(0, Number(url.searchParams.get('uiWorkers') || uiCfg.defaultWorkers || 5));
    uiWorkers = Math.min(Number(uiCfg.maxWorkers || 10), uiWorkers);
    const scenarios = String(url.searchParams.get('scenarios') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.write(': connected\n\n');

    try {
      await runStress(
        {
          systemId,
          vus,
          durationSec,
          rampUpSec,
          scenarios,
          withUi,
          uiWorkers,
        },
        res,
      );
    } catch (err) {
      res.write(`event: fail\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      state.running = false;
      state.current = null;
      state.child = null;
      state.runKind = null;
    }
    return res.end();
  }

  if (url.pathname === '/api/ai/status') {
    return sendJson(res, 200, publicAiStatus());
  }

  if (url.pathname === '/api/ai/config') {
    if (req.method === 'GET') {
      return sendJson(res, 200, publicAiConfigPayload());
    }
    if (req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        saveAiFileConfig(body || {});
        return sendJson(res, 200, { ok: true, ...publicAiConfigPayload() });
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
  }

  if (url.pathname === '/api/ai/generate' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const draft = await generateTestDraft({
        system: body?.system || state.system,
        kind: body?.kind || 'e2e',
        requirement: body?.requirement || '',
        module: body?.module || '',
        name: body?.name || '',
        storyId: body?.storyId || '',
        relatedTasks: body?.relatedTasks || [],
      });
      return sendJson(res, 200, { ok: true, draft });
    } catch (err) {
      return sendJson(res, 400, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/ai/rewrite' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const result = await rewriteSpecSource({
        source: body?.source || '',
        instruction: body?.instruction || '',
        lastError: body?.lastError || '',
        file: body?.file || '',
        system: body?.system || state.system,
        kind: body?.kind || '',
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/ai/save' && req.method === 'POST') {
    if (state.running) return sendJson(res, 409, { error: '測試執行中，暫不可寫入新腳本' });
    try {
      const body = await readRequestBody(req);
      if (!body?.draft) throw new Error('缺少 draft');
      // 允許前端微調後再存
      const result = saveGeneratedDraft(body.draft, { overwrite: !!body.overwrite });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message || String(err) });
    }
  }

  if (url.pathname === '/api/run') {
    if (state.running) {
      return sendJson(res, 409, { error: '已有測試正在執行，請稍候' });
    }
    const target = url.searchParams.get('target');
    const systemId = url.searchParams.get('system') || state.system;
    if (!target) return sendJson(res, 400, { error: '缺少 target' });
    if (!SYSTEMS[systemId]) return sendJson(res, 400, { error: `未知系統：${systemId}` });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.write(': connected\n\n');

    try {
      await runTests(systemId, target, res);
    } catch (err) {
      res.write(`event: fail\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      for (const id of idsForTarget(systemId, target)) {
        if (state.results[id]?.status === 'running') {
          state.results[id].status = 'failed';
          state.results[id].error = err.message;
          state.results[id].finishedAt = new Date().toISOString();
        }
      }
      state.running = false;
      state.current = null;
      state.child = null;
      state.runKind = null;
    }
    return res.end();
  }

  if (url.pathname.startsWith('/api/')) {
    // —— 需求庫（xuqiu CSV → SQLite CRUD）——
    if (url.pathname === '/api/xuqiu/status') {
      try {
        xuqiuDb.ensureImported();
        return sendJson(res, 200, xuqiuDb.stats());
      } catch (err) {
        return sendJson(res, 500, { error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/xuqiu/import' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        const result = xuqiuDb.importFromCsv({ replace: body?.replace !== false });
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/xuqiu/stories' && req.method === 'GET') {
      try {
        return sendJson(
          res,
          200,
          xuqiuDb.listStories({
            q: url.searchParams.get('q') || '',
            limit: url.searchParams.get('limit') || 200,
            offset: url.searchParams.get('offset') || 0,
          }),
        );
      } catch (err) {
        return sendJson(res, 500, { error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/xuqiu/stories' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        return sendJson(res, 200, xuqiuDb.createStory(body || {}));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/xuqiu/stories/') && req.method === 'GET') {
      const id = url.pathname.slice('/api/xuqiu/stories/'.length);
      const row = xuqiuDb.getStory(id);
      if (!row) return sendJson(res, 404, { error: '找不到用戶故事' });
      return sendJson(res, 200, row);
    }
    if (url.pathname.startsWith('/api/xuqiu/stories/') && req.method === 'PUT') {
      try {
        const id = url.pathname.slice('/api/xuqiu/stories/'.length);
        const body = await readRequestBody(req);
        return sendJson(res, 200, xuqiuDb.updateStory(id, body || {}));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/xuqiu/stories/') && req.method === 'DELETE') {
      try {
        const id = url.pathname.slice('/api/xuqiu/stories/'.length);
        return sendJson(res, 200, xuqiuDb.deleteStory(id));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/xuqiu/tasks' && req.method === 'GET') {
      try {
        return sendJson(
          res,
          200,
          xuqiuDb.listTasks({
            q: url.searchParams.get('q') || '',
            featureKey: url.searchParams.get('featureKey') || '',
            limit: url.searchParams.get('limit') || 200,
            offset: url.searchParams.get('offset') || 0,
          }),
        );
      } catch (err) {
        return sendJson(res, 500, { error: err.message || String(err) });
      }
    }
    if (url.pathname === '/api/xuqiu/tasks' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        return sendJson(res, 200, xuqiuDb.createTask(body || {}));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/xuqiu/tasks/') && req.method === 'GET') {
      const id = url.pathname.slice('/api/xuqiu/tasks/'.length);
      const row = xuqiuDb.getTask(id);
      if (!row) return sendJson(res, 404, { error: '找不到功能任務' });
      return sendJson(res, 200, row);
    }
    if (url.pathname.startsWith('/api/xuqiu/tasks/') && req.method === 'PUT') {
      try {
        const id = url.pathname.slice('/api/xuqiu/tasks/'.length);
        const body = await readRequestBody(req);
        return sendJson(res, 200, xuqiuDb.updateTask(id, body || {}));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }
    if (url.pathname.startsWith('/api/xuqiu/tasks/') && req.method === 'DELETE') {
      try {
        const id = url.pathname.slice('/api/xuqiu/tasks/'.length);
        return sendJson(res, 200, xuqiuDb.deleteTask(id));
      } catch (err) {
        return sendJson(res, 400, { error: err.message || String(err) });
      }
    }

    return sendJson(res, 404, { error: 'not found' });
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`Peterson QA Dashboard → ${url}`);
  console.log(`[dashboard] ROOT=${ROOT}`);
  console.log(`[dashboard] qa-data=${PATHS.qaData}`);
  openBrowser(url);
});
