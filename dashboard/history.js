/**
 * @author harlin
 * 每次 Dashboard 執行都落盤：結果、日誌、可供之後匯出 PDF 的資料。
 */

const fs = require('node:fs');
const path = require('node:path');
const { PATHS, ensureQaDataDirs } = require('./paths');

const HISTORY_DIR = PATHS.history;
const INDEX_FILE = path.join(HISTORY_DIR, 'index.json');
const CURRENT_DIR = PATHS.current;
const MAX_RUNS = 200;

function isSafeRunId(runId) {
  return /^[A-Za-z0-9._-]+$/.test(String(runId || ''));
}

function readIndex() {
  try {
    if (!fs.existsSync(INDEX_FILE)) return [];
    const list = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  ensureQaDataDirs();
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, `${JSON.stringify(list.slice(0, MAX_RUNS), null, 2)}\n`, 'utf8');
}

function countsFor(ids, results) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const id of ids) {
    const st = results[id]?.status;
    if (st === 'passed') passed += 1;
    else if (st === 'failed') failed += 1;
    else if (st === 'skipped') skipped += 1;
  }
  return { total: ids.length, passed, failed, skipped };
}

function sliceResults(ids, results) {
  const out = {};
  for (const id of ids) {
    if (results[id]) out[id] = results[id];
  }
  return out;
}

function archiveRun(payload) {
  const {
    runId,
    system,
    target,
    command,
    exitCode,
    startedAt,
    finishedAt,
    ids,
    results,
    log,
  } = payload;
  if (!isSafeRunId(runId)) return null;

  const slice = sliceResults(ids, results || {});
  const meta = {
    runId,
    system,
    target,
    command: command || '',
    exitCode: exitCode ?? null,
    startedAt: startedAt || null,
    finishedAt: finishedAt || null,
    ids: [...ids],
    counts: countsFor(ids, slice),
  };

  const dir = path.join(HISTORY_DIR, runId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(dir, 'results.json'), `${JSON.stringify(slice, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(dir, 'log.txt'), Array.isArray(log) ? log.join('\n') : String(log || ''), 'utf8');

  const index = readIndex().filter((x) => x.runId !== runId);
  index.unshift(meta);
  writeIndex(index);
  return meta;
}

function saveCurrent(systemId, payload) {
  if (!systemId) return;
  ensureQaDataDirs();
  fs.mkdirSync(CURRENT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CURRENT_DIR, `${systemId}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );
}

function loadCurrent(systemId) {
  const file = path.join(CURRENT_DIR, `${String(systemId)}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function runDir(runId) {
  if (!isSafeRunId(runId)) return null;
  const dir = path.join(HISTORY_DIR, runId);
  if (!dir.startsWith(HISTORY_DIR) || !fs.existsSync(dir)) return null;
  return dir;
}

function loadRun(runId) {
  const dir = runDir(runId);
  if (!dir) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const results = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
    let log = [];
    const logFile = path.join(dir, 'log.txt');
    if (fs.existsSync(logFile)) {
      const raw = fs.readFileSync(logFile, 'utf8');
      log = raw ? raw.split(/\r?\n/) : [];
    }
    return { ...meta, results, log };
  } catch {
    return null;
  }
}

function listHistory(systemId) {
  const list = readIndex();
  if (!systemId) return list;
  return list.filter((x) => x.system === systemId);
}

function readRunLog(runId) {
  const dir = runDir(runId);
  if (!dir) return null;
  const logFile = path.join(dir, 'log.txt');
  if (!fs.existsSync(logFile)) return '';
  return fs.readFileSync(logFile, 'utf8');
}

module.exports = {
  archiveRun,
  saveCurrent,
  loadCurrent,
  loadRun,
  listHistory,
  readRunLog,
  isSafeRunId,
};
