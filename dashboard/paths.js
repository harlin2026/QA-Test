/**
 * @author harlin
 * Dashboard 持久化路徑（必須在 Playwright 的 test-results 之外，
 * 否則每次跑測會被 Playwright 清空 outputDir）。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const QA_DATA = path.join(ROOT, 'qa-data');

const PATHS = {
  root: ROOT,
  qaData: QA_DATA,
  history: path.join(QA_DATA, 'history'),
  shots: path.join(QA_DATA, 'shots'),
  current: path.join(QA_DATA, 'current'),
  lastFile: path.join(QA_DATA, 'last.json'),
  stress: path.join(QA_DATA, 'stress'),
};

function shotsDir(runId) {
  return path.join(PATHS.shots, String(runId || ''));
}

function ensureQaDataDirs() {
  for (const dir of [PATHS.qaData, PATHS.history, PATHS.shots, PATHS.current, PATHS.stress]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const probe = path.join(PATHS.qaData, '.write-probe');
  fs.writeFileSync(probe, String(Date.now()));
  fs.unlinkSync(probe);
}

/** 把舊版 test-results/dashboard-* 遷移到 qa-data（只在目標為空時） */
function migrateLegacyIfNeeded() {
  const legacy = {
    history: path.join(ROOT, 'test-results', 'dashboard-history'),
    shots: path.join(ROOT, 'test-results', 'dashboard-shots'),
    current: path.join(ROOT, 'test-results', 'dashboard-current'),
    lastFile: path.join(ROOT, 'test-results', 'dashboard-last.json'),
    stress: path.join(ROOT, 'test-results', 'stress'),
  };

  const copyDir = (from, to) => {
    if (!fs.existsSync(from)) return false;
    if (fs.existsSync(to) && fs.readdirSync(to).length) return false;
    fs.mkdirSync(to, { recursive: true });
    fs.cpSync(from, to, { recursive: true, force: false });
    return true;
  };

  try {
    ensureQaDataDirs();
    if (copyDir(legacy.history, PATHS.history)) console.log('[dashboard] migrated history → qa-data/history');
    if (copyDir(legacy.shots, PATHS.shots)) console.log('[dashboard] migrated shots → qa-data/shots');
    if (copyDir(legacy.current, PATHS.current)) console.log('[dashboard] migrated current → qa-data/current');
    if (copyDir(legacy.stress, PATHS.stress)) console.log('[dashboard] migrated stress → qa-data/stress');
    if (fs.existsSync(legacy.lastFile) && !fs.existsSync(PATHS.lastFile)) {
      fs.copyFileSync(legacy.lastFile, PATHS.lastFile);
      console.log('[dashboard] migrated last.json → qa-data/last.json');
    }
  } catch (err) {
    console.error('[dashboard] legacy migrate failed：', err.message || err);
  }
}

module.exports = {
  ROOT,
  PATHS,
  shotsDir,
  ensureQaDataDirs,
  migrateLegacyIfNeeded,
};
