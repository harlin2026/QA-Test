/**
 * @author harlin
 * API 壓力測試執行器（可配置 VU / 時長 / 爬坡）。
 *
 * CLI：
 *   node stress/runner.js --system=admin --vus=10 --duration=15
 *   node stress/runner.js --system=pos --vus=100 --duration=60 --scenarios=pos-me,pos-products
 *   node stress/runner.js --system=admin --with-ui --ui-workers=5
 *
 * 環境變數（Dashboard spawn 用）：
 *   STRESS_SYSTEM, STRESS_VUS, STRESS_DURATION, STRESS_RAMP, STRESS_SCENARIOS,
 *   STRESS_WITH_UI, STRESS_UI_WORKERS, STRESS_RUN_ID, STRESS_TIMEOUT
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const OUT_ROOT = process.env.QA_DATA_DIR
  ? path.join(process.env.QA_DATA_DIR, 'stress')
  : path.join(ROOT, 'qa-data', 'stress');

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

function envOrArg(envKey, argName, fallback) {
  if (process.env[envKey] != null && process.env[envKey] !== '') return process.env[envKey];
  const v = arg(argName, null);
  return v == null ? fallback : v;
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function newRunId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

function readToken(authFileRel, tokenKey) {
  const abs = path.join(ROOT, authFileRel);
  if (!fs.existsSync(abs)) {
    throw new Error(`缺少登入態 ${authFileRel}，請先執行 npm run login 或 login:pos`);
  }
  const state = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const origin of state.origins || []) {
    for (const item of origin.localStorage || []) {
      if (item.name === tokenKey && item.value) return item.value;
    }
  }
  throw new Error(`在 ${authFileRel} 找不到 tokenKey=${tokenKey}`);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function pickScenario(scenarios) {
  const total = scenarios.reduce((s, x) => s + (Number(x.weight) || 1), 0);
  let r = Math.random() * total;
  for (const sc of scenarios) {
    r -= Number(sc.weight) || 1;
    if (r <= 0) return sc;
  }
  return scenarios[scenarios.length - 1];
}

function emit(event, data) {
  // Dashboard 以一行 JSON 解析；同時給人看的日誌走 stderr / 純文字 stdout 前綴
  const line = JSON.stringify({ event, ...data, ts: Date.now() });
  process.stdout.write(`${line}\n`);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function oneRequest(apiBase, token, scenario, timeoutMs, signal) {
  const url = new URL(scenario.path, apiBase).toString();
  const method = String(scenario.method || 'GET').toUpperCase();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(scenario.headers || {}),
  };
  const init = { method, headers, signal };
  if (scenario.body != null && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    init.body = typeof scenario.body === 'string' ? scenario.body : JSON.stringify(scenario.body);
  }

  const started = Date.now();
  const ac = new AbortController();
  const onParentAbort = () => ac.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    const ms = Date.now() - started;
    // 消耗 body 避免連線佔用
    try {
      await res.arrayBuffer();
    } catch {
      // ignore
    }
    return {
      scenarioId: scenario.id,
      ok: res.ok,
      status: res.status,
      ms,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const ms = Date.now() - started;
    const aborted = err?.name === 'AbortError';
    return {
      scenarioId: scenario.id,
      ok: false,
      status: 0,
      ms,
      error: aborted ? (signal?.aborted ? 'stopped' : 'timeout') : err.message || String(err),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

function makeStats() {
  return {
    total: 0,
    ok: 0,
    fail: 0,
    latencies: [],
    byStatus: {},
    byScenario: {},
    errors: [],
    errorGroups: {},
  };
}

function record(stats, result) {
  stats.total += 1;
  if (result.ok) stats.ok += 1;
  else stats.fail += 1;
  stats.latencies.push(result.ms);
  const st = String(result.status || 0);
  stats.byStatus[st] = (stats.byStatus[st] || 0) + 1;
  if (!stats.byScenario[result.scenarioId]) {
    stats.byScenario[result.scenarioId] = { total: 0, ok: 0, fail: 0, latencies: [] };
  }
  const sc = stats.byScenario[result.scenarioId];
  sc.total += 1;
  if (result.ok) sc.ok += 1;
  else sc.fail += 1;
  sc.latencies.push(result.ms);
  if (!result.ok) {
    const errKey = `${result.scenarioId}|${result.status}|${result.error || 'unknown'}`;
    if (!stats.errorGroups[errKey]) {
      stats.errorGroups[errKey] = {
        scenarioId: result.scenarioId,
        status: result.status,
        error: result.error || 'unknown',
        count: 0,
        lastMs: result.ms,
      };
    }
    stats.errorGroups[errKey].count += 1;
    stats.errorGroups[errKey].lastMs = result.ms;
    if (stats.errors.length < 80) {
      stats.errors.push({
        scenarioId: result.scenarioId,
        status: result.status,
        error: result.error,
        ms: result.ms,
      });
    }
  }
}

function summarize(stats, startedAt, vus) {
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const elapsedSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
  const byScenario = {};
  const failByScenario = [];
  for (const [id, sc] of Object.entries(stats.byScenario)) {
    const s = [...sc.latencies].sort((a, b) => a - b);
    byScenario[id] = {
      total: sc.total,
      ok: sc.ok,
      fail: sc.fail,
      p50: percentile(s, 50),
      p95: percentile(s, 95),
      p99: percentile(s, 99),
    };
    if (sc.fail > 0) {
      failByScenario.push({
        scenarioId: id,
        fail: sc.fail,
        total: sc.total,
        ok: sc.ok,
        failRate: Number(((sc.fail / sc.total) * 100).toFixed(2)),
      });
    }
  }
  failByScenario.sort((a, b) => b.fail - a.fail);
  const errorGroups = Object.values(stats.errorGroups || {}).sort((a, b) => b.count - a.count);
  return {
    vus,
    elapsedSec: Number(elapsedSec.toFixed(2)),
    total: stats.total,
    ok: stats.ok,
    fail: stats.fail,
    errorRate: stats.total ? Number(((stats.fail / stats.total) * 100).toFixed(2)) : 0,
    rps: Number((stats.total / elapsedSec).toFixed(2)),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    byStatus: { ...stats.byStatus },
    byScenario,
    failByScenario,
    errorGroups,
    errors: stats.errors.slice(-20),
  };
}

async function runUiConcurrent({ systemId, workers, uiPaths, runId, signal }) {
  if (!workers || workers < 1) return null;
  const SYSTEMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'systems.json'), 'utf8'));
  const sys = SYSTEMS[systemId];
  if (!sys) return null;

  const smokeDir = sys.dirs?.smoke;
  if (!smokeDir) {
    emit('log', { line: '此系統無 smoke 目錄，略過 UI 並發' });
    return null;
  }

  emit('log', {
    line: `啟動 UI 並發：workers=${workers} paths=${(uiPaths || []).join(',') || 'smoke'}`,
  });

  const playwrightCli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
  const args = [
    playwrightCli,
    'test',
    smokeDir,
    `--project=${sys.project}`,
    `--workers=${workers}`,
  ];

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        QA_SYSTEM: systemId,
        QA_RUN_ID: `${runId}-ui`,
        QA_ROOT: ROOT,
        QA_DATA_DIR: process.env.QA_DATA_DIR || path.join(ROOT, 'qa-data'),
        ...(systemId === 'pos'
          ? {
              POS_BASE_URL: sys.baseURL,
              POS_LOGIN_USER: sys.loginUser,
              POS_LOGIN_PASS: sys.loginPass,
            }
          : {
              ADMIN_BASE_URL: sys.baseURL,
              LOGIN_USER: sys.loginUser,
              LOGIN_PASS: sys.loginPass,
            }),
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const onAbort = () => {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    let buf = '';
    const onChunk = (chunk) => {
      buf += chunk.toString('utf8');
      const parts = buf.split(/\r?\n/);
      buf = parts.pop() || '';
      for (const line of parts) {
        if (line.trim()) emit('log', { line: `[ui] ${line}` });
      }
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      emit('log', { line: `UI 並發結束，exit=${code}` });
      resolve({ exitCode: code ?? 1 });
    });
  });
}

async function main() {
  const config = loadConfig();
  const defaults = config.defaults || {};
  const systemId = String(envOrArg('STRESS_SYSTEM', 'system', 'admin'));
  const sysCfg = config.systems?.[systemId];
  if (!sysCfg) throw new Error(`config 中無系統：${systemId}`);

  const vus = Math.max(1, Number(envOrArg('STRESS_VUS', 'vus', defaults.vus || 100)));
  const durationSec = Math.max(1, Number(envOrArg('STRESS_DURATION', 'duration', defaults.durationSec || 60)));
  const rampUpSec = Math.max(0, Number(envOrArg('STRESS_RAMP', 'ramp', defaults.rampUpSec || 10)));
  const timeoutMs = Math.max(1000, Number(envOrArg('STRESS_TIMEOUT', 'timeout', defaults.timeoutMs || 15000)));
  const withUi =
    String(envOrArg('STRESS_WITH_UI', 'with-ui', '0')) === '1' ||
    envOrArg('STRESS_WITH_UI', 'with-ui', false) === true;
  const uiMax = Number(config.ui?.maxWorkers || 10);
  let uiWorkers = Math.max(0, Number(envOrArg('STRESS_UI_WORKERS', 'ui-workers', config.ui?.defaultWorkers || 5)));
  uiWorkers = Math.min(uiMax, uiWorkers);

  const scenarioFilter = String(envOrArg('STRESS_SCENARIOS', 'scenarios', ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let scenarios = (sysCfg.scenarios || []).filter((s) => s && s.path);
  if (scenarioFilter.length) {
    scenarios = scenarios.filter((s) => scenarioFilter.includes(s.id));
  }
  // 預設只跑 readOnly / GET，避免寫入污染
  scenarios = scenarios.filter((s) => {
    if (s.readOnly === false) return scenarioFilter.includes(s.id);
    const m = String(s.method || 'GET').toUpperCase();
    return m === 'GET' || m === 'HEAD' || s.readOnly === true;
  });
  if (!scenarios.length) throw new Error('沒有可執行的場景（請檢查 --scenarios 或 config）');

  const runId = String(envOrArg('STRESS_RUN_ID', 'run-id', newRunId()));
  const outDir = path.join(OUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });

  const token = readToken(sysCfg.authFile, sysCfg.tokenKey);
  const apiBase = String(sysCfg.apiBase || '').replace(/\/+$/, '');
  if (!apiBase) throw new Error('apiBase 未設定');

  const abort = new AbortController();
  const stop = () => {
    if (!abort.signal.aborted) {
      emit('log', { line: '收到停止信號，正在結束…' });
      abort.abort();
    }
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  const meta = {
    runId,
    system: systemId,
    apiBase,
    vus,
    durationSec,
    rampUpSec,
    timeoutMs,
    withUi,
    uiWorkers: withUi ? uiWorkers : 0,
    scenarios: scenarios.map((s) => ({ id: s.id, name: s.name, method: s.method, path: s.path, weight: s.weight })),
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  emit('start', { ...meta });
  emit('log', {
    line: `開始壓測 system=${systemId} vus=${vus} duration=${durationSec}s ramp=${rampUpSec}s scenarios=${scenarios.length}`,
  });

  const stats = makeStats();
  const startedAt = Date.now();
  const endAt = startedAt + durationSec * 1000;
  let active = 0;
  let uiPromise = null;

  if (withUi && uiWorkers > 0) {
    uiPromise = runUiConcurrent({
      systemId,
      workers: uiWorkers,
      uiPaths: sysCfg.uiPaths,
      runId,
      signal: abort.signal,
    });
  }

  const tick = setInterval(() => {
    if (abort.signal.aborted) return;
    emit('metrics', summarize(stats, startedAt, vus));
  }, 1000);

  async function vuLoop(vuIndex) {
    // ramp：依序延遲啟動
    if (rampUpSec > 0 && vus > 1) {
      const delay = (rampUpSec * 1000 * vuIndex) / vus;
      try {
        await sleep(delay, abort.signal);
      } catch {
        return;
      }
    }
    active += 1;
    try {
      while (!abort.signal.aborted && Date.now() < endAt) {
        const sc = pickScenario(scenarios);
        const result = await oneRequest(apiBase, token, sc, timeoutMs, abort.signal);
        if (result.error === 'stopped') break;
        record(stats, result);
      }
    } finally {
      active -= 1;
    }
  }

  const workers = [];
  for (let i = 0; i < vus; i += 1) workers.push(vuLoop(i));
  await Promise.all(workers);
  clearInterval(tick);

  let uiResult = null;
  if (uiPromise) {
    uiResult = await uiPromise;
  }

  const summary = {
    ...meta,
    finishedAt: new Date().toISOString(),
    stopped: abort.signal.aborted,
    metrics: summarize(stats, startedAt, vus),
    ui: uiResult,
  };
  // 精簡 latencies 不寫入檔案（已在 summarize 去掉）
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'failures.json'),
    `${JSON.stringify(
      {
        runId,
        system: systemId,
        fail: summary.metrics.fail,
        failByScenario: summary.metrics.failByScenario,
        errorGroups: summary.metrics.errorGroups,
        errors: summary.metrics.errors,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  // 更新簡易索引
  const indexPath = path.join(OUT_ROOT, 'index.json');
  let index = [];
  try {
    if (fs.existsSync(indexPath)) index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    index = [];
  }
  index.unshift({
    runId,
    system: systemId,
    startedAt: meta.startedAt,
    finishedAt: summary.finishedAt,
    vus,
    durationSec,
    total: summary.metrics.total,
    ok: summary.metrics.ok,
    fail: summary.metrics.fail,
    rps: summary.metrics.rps,
    p95: summary.metrics.p95,
    errorRate: summary.metrics.errorRate,
    stopped: summary.stopped,
    topFails: (summary.metrics.failByScenario || []).slice(0, 5).map((x) => ({
      scenarioId: x.scenarioId,
      fail: x.fail,
    })),
  });
  fs.writeFileSync(indexPath, `${JSON.stringify(index.slice(0, 100), null, 2)}\n`, 'utf8');

  emit('done', summary);
  emit('log', {
    line: `結束：total=${summary.metrics.total} ok=${summary.metrics.ok} fail=${summary.metrics.fail} rps=${summary.metrics.rps} p95=${summary.metrics.p95}ms errorRate=${summary.metrics.errorRate}%`,
  });

  process.exitCode = summary.metrics.fail > 0 && summary.metrics.ok === 0 ? 1 : 0;
}

main().catch((err) => {
  emit('fail', { message: err.message || String(err) });
  console.error(err);
  process.exit(1);
});
