/**
 * @author harlin
 * 將測試結果編成 PDF（單項或批次合併匯出）。
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const { shotsDir } = require('./paths');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusZh(st) {
  if (st === 'passed') return '通過';
  if (st === 'failed') return '失敗';
  if (st === 'running') return '執行中';
  if (st === 'skipped') return '跳過';
  return '未跑';
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { hour12: false });
}

function fmtDur(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return '—';
  const n = Number(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

function shotAbs(screenshotUrl) {
  const m = String(screenshotUrl || '').match(/\/api\/shots\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  const abs = path.join(shotsDir(decodeURIComponent(m[1])), decodeURIComponent(m[2]));
  if (!fs.existsSync(abs)) return null;
  return abs;
}

function toDataUri(abs) {
  try {
    const buf = fs.readFileSync(abs);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

function cjkFontFace() {
  const win = 'C:\\Windows\\Fonts';
  const candidates = [
    path.join(win, 'msjh.ttc'),
    path.join(win, 'msyh.ttc'),
    path.join(win, 'msjh.ttf'),
    path.join(win, 'msyh.ttf'),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) return '';
  const fileUrl = `file:///${hit.replace(/\\/g, '/')}`;
  return `@font-face { font-family: ReportCJK; src: url('${fileUrl}'); }`;
}

function reportCss() {
  return `${cjkFontFace()}
    * { box-sizing: border-box; }
    body {
      font-family: ReportCJK, "Microsoft JhengHei", "Microsoft YaHei", "Noto Sans CJK TC", sans-serif;
      color: #1a2430;
      margin: 0;
      padding: 28px 32px;
      font-size: 13px;
      line-height: 1.55;
    }
    h1 { font-size: 20px; margin: 0 0 6px; }
    h2 { font-size: 14px; margin: 22px 0 10px; border-bottom: 1px solid #d7e2ee; padding-bottom: 6px; }
    h3 { font-size: 14px; margin: 0 0 8px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .kicker { color: #0f766e; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; }
    .desc { color: #5b6b7c; margin: 0 0 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f8fbfd; border: 1px solid #e4ebf2; border-radius: 10px; padding: 12px 14px; }
    .grid span { display: block; color: #7a8a99; font-size: 11px; }
    .grid em { font-style: normal; word-break: break-all; }
    .pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #e8eef4; white-space: nowrap; }
    .pill.passed { background: #e5f6ec; color: #157a3a; }
    .pill.failed { background: #fde8e6; color: #b42318; }
    .pill.skipped { background: #eef3f8; color: #5b6b7c; }
    .step { margin: 0 0 18px; page-break-inside: avoid; }
    .shot { display: block; width: 100%; max-height: 360px; object-fit: contain; object-position: top; border: 1px solid #d7e2ee; border-radius: 8px; background: #f4f7fa; }
    .meta-line, .muted { margin: 0 0 4px; color: #5b6b7c; font-size: 12px; word-break: break-all; }
    .err { color: #b42318; margin: 4px 0 8px; }
    .foot { margin-top: 24px; color: #7a8a99; font-size: 11px; }
    .toc { margin: 12px 0 20px; padding: 12px 14px; border: 1px solid #e4ebf2; border-radius: 10px; background: #fff; }
    .toc li { margin: 4px 0; }
    .case { page-break-before: always; }
    .case:first-of-type { page-break-before: auto; }
    .summary-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
    .summary-table th, .summary-table td { border: 1px solid #d7e2ee; padding: 6px 8px; text-align: left; font-size: 12px; }
    .summary-table th { background: #f4f7fa; }
  `;
}

function buildCaseSection(item, result, index) {
  const st = result.status || 'idle';
  const title = `${item.module ? `${item.module} / ` : ''}${item.name}`;
  const dur =
    result.startedAt && result.finishedAt
      ? fmtDur(new Date(result.finishedAt) - new Date(result.startedAt))
      : '—';
  const steps = Array.isArray(result.steps)
    ? result.steps.filter((s) => s && s.status && s.status !== 'idle')
    : [];
  const planned = !steps.length && Array.isArray(item.plannedSteps) ? item.plannedSteps : [];

  const stepBlocks = (steps.length ? steps : planned.map((t) => ({ title: t, status: 'idle' })))
    .map((step, i) => {
      const abs = shotAbs(step.screenshot);
      const img = abs ? `<img class="shot" src="${toDataUri(abs)}" alt="${esc(step.title)}" />` : '<p class="muted">此步驟無截圖</p>';
      return `<section class="step">
        <h3>${i + 1}. ${esc(String(step.title || '').replace(/^.*›\s*/, ''))}
          <span class="pill ${esc(step.status || 'idle')}">${esc(statusZh(step.status))}</span>
        </h3>
        <p class="meta-line">${esc(step.how || 'Playwright 自動執行')}</p>
        ${step.url ? `<p class="meta-line">頁面：${esc(step.url)}</p>` : ''}
        ${step.duration != null ? `<p class="meta-line">耗時：${esc(fmtDur(step.duration))}</p>` : ''}
        ${step.error ? `<p class="err">${esc(step.error)}</p>` : ''}
        ${img}
      </section>`;
    })
    .join('');

  return `<article class="case">
    <h2>${index != null ? `${index}. ` : ''}${esc(title)}
      <span class="pill ${esc(st)}">${esc(statusZh(st))}</span>
    </h2>
    <p class="desc">${esc(item.description || item.path || item.file || '')}</p>
    <div class="grid">
      <div><span>結果</span><em>${esc(statusZh(st))}</em></div>
      <div><span>耗時</span><em>${esc(dur)}</em></div>
      <div><span>開始</span><em>${esc(fmtTime(result.startedAt))}</em></div>
      <div><span>結束</span><em>${esc(fmtTime(result.finishedAt))}</em></div>
      <div style="grid-column:1/-1"><span>步驟摘要</span><em>${esc(result.stepSummary || '—')}</em></div>
      <div style="grid-column:1/-1"><span>路徑</span><em>${esc(item.path || item.file || item.id)}</em></div>
    </div>
    <h3 style="margin-top:14px">執行步驟與畫面</h3>
    ${stepBlocks || '<p class="muted">尚無步驟結果</p>'}
  </article>`;
}

function buildHtml({ systemName, item, result }) {
  const title = `${item.module ? `${item.module} / ` : ''}${item.name}`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <style>${reportCss()}</style>
</head>
<body>
  <p class="kicker">Peterson QA 測試報告</p>
  <h1>${esc(title)}</h1>
  <p class="desc">${esc(systemName)} · 單項報告</p>
  ${buildCaseSection(item, result)}
  <p class="foot">匯出時間 ${esc(fmtTime(new Date().toISOString()))} · ${esc(item.id)}</p>
</body>
</html>`;
}

function buildBatchHtml({ systemName, entries, reportTitle }) {
  const counts = { passed: 0, failed: 0, skipped: 0, other: 0 };
  for (const { result } of entries) {
    const st = result?.status;
    if (st === 'passed') counts.passed += 1;
    else if (st === 'failed') counts.failed += 1;
    else if (st === 'skipped') counts.skipped += 1;
    else counts.other += 1;
  }

  const toc = entries
    .map(({ item, result }, i) => {
      const title = `${item.module ? `${item.module} / ` : ''}${item.name}`;
      return `<li>${i + 1}. ${esc(title)} — ${esc(statusZh(result.status))}</li>`;
    })
    .join('');

  const summaryRows = entries
    .map(({ item, result }, i) => {
      const title = `${item.module ? `${item.module} / ` : ''}${item.name}`;
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(title)}</td>
        <td>${esc(statusZh(result.status))}</td>
        <td>${esc(result.stepSummary || '—')}</td>
      </tr>`;
    })
    .join('');

  const cases = entries.map(({ item, result }, i) => buildCaseSection(item, result, i + 1)).join('');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <style>${reportCss()}</style>
</head>
<body>
  <p class="kicker">Peterson QA 測試報告</p>
  <h1>${esc(reportTitle || '批次測試報告')}</h1>
  <p class="desc">${esc(systemName)} · 共 ${entries.length} 項 · 通過 ${counts.passed} · 失敗 ${counts.failed} · 跳過 ${counts.skipped}</p>
  <div class="grid">
    <div><span>系統</span><em>${esc(systemName)}</em></div>
    <div><span>匯出時間</span><em>${esc(fmtTime(new Date().toISOString()))}</em></div>
    <div><span>通過</span><em>${counts.passed}</em></div>
    <div><span>失敗</span><em>${counts.failed}</em></div>
  </div>
  <h2>彙總表</h2>
  <table class="summary-table">
    <thead><tr><th>#</th><th>任務</th><th>結果</th><th>步驟</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
  <h2>目錄</h2>
  <ol class="toc">${toc}</ol>
  ${cases}
  <p class="foot">匯出時間 ${esc(fmtTime(new Date().toISOString()))} · ${entries.length} 項</p>
</body>
</html>`;
}

function safeFileName(name) {
  return String(name || 'report')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

async function renderPdfBuffer(html) {
  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch {
    ({ chromium } = require('@playwright/test'));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });
    return pdf;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function exportResultPdf({ systemName, item, result }) {
  const html = buildHtml({ systemName, item, result });
  const pdf = await renderPdfBuffer(html);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const fileName = `QA_${safeFileName(systemName)}_${safeFileName(item.name)}_${stamp}.pdf`;
  return { pdf, fileName };
}

async function exportBatchPdf({ systemName, entries, reportTitle }) {
  if (!entries?.length) throw new Error('沒有可匯出的項目');
  const html = buildBatchHtml({ systemName, entries, reportTitle });
  const pdf = await renderPdfBuffer(html);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const fileName = `QA_${safeFileName(systemName)}_${safeFileName(reportTitle || 'batch')}_${entries.length}items_${stamp}.pdf`;
  return { pdf, fileName };
}

module.exports = { exportResultPdf, exportBatchPdf, safeFileName };
