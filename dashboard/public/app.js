/**
 * @author harlin
 */

const DEFAULT_MINIAPP = {
  name: '小程序測試',
  subtitle: 'aChill QA',
  baseURL: 'http://127.0.0.1:3780',
};

const MODE_META = {
  smoke: {
    title: '冒煙測試',
    desc: '檢查各功能頁能否正常開啟與基本可用性。可單項執行，或跑本類型全部。',
    runLabel: '跑本類型全部（冒煙）',
  },
  crud: {
    title: 'CRUD 測試',
    desc: '檢查新增 / 查詢 / 刪除或寫入入口是否可用。可單項執行，或跑本類型全部。',
    runLabel: '跑本類型全部（CRUD）',
  },
  e2e: {
    title: 'E2E 測試',
    desc: '跨模組業務閉環。可單項執行，或跑本類型全部。',
    runLabel: '跑本類型全部（E2E）',
  },
  story: {
    title: '用戶故事',
    desc: '每條用戶故事對應一個獨立腳本（來源 xuqiu）。後台含 US-7 與小程序 US-5（暫 skip）；POS 含 US-6。可單項／分組／全部執行。',
    runLabel: '跑本類型全部（用戶故事）',
  },
  stress: {
    title: '壓力測試',
    desc: '可配置並發對 Admin／POS API 施壓，可選同時跑少量 UI 並發。',
    runLabel: '開始壓測',
  },
};

const state = {
  system: 'admin',
  systems: [],
  mode: 'smoke',
  /** 'workspace' = 系統測試；'aigen' = AI；'xuqiu' = 需求庫 */
  nav: 'workspace',
  catalog: { smoke: [], e2e: [], crud: [], story: [] },
  results: {},
  selectedId: null,
  running: false,
  es: null,
  lastRunIds: [],
  lastTarget: null,
  pathKind: 'smoke',
  pathItems: [],
  pathMeta: { file: '', checkOptions: [], specFiles: [] },
  stepsModalId: null,
  /** 目前正在編輯的腳本相對路徑 */
  editingSpecFile: null,
  xuqiuTab: 'stories',
  xuqiuSelectedId: null,
  xuqiuItems: [],
  xuqiuRelatedCache: null,
  xuqiuTestDraft: null,
  xuqiuTestLastRunId: null,
  activeRunId: null,
  history: [],
  exportSelectedIds: [],
  stressConfig: null,
  stressSelectedIds: [],
  stressMetrics: null,
  stressEs: null,
  aiDraft: null,
  aiProviders: [],
  aiLastRunId: null,
  loadingDepth: 0,
  miniapp: { ...DEFAULT_MINIAPP },
};

const el = {
  systemBar: document.getElementById('systemBar'),
  brandKicker: document.getElementById('brandKicker'),
  workspaceSystemName: document.getElementById('workspaceSystemName'),
  suiteList: document.getElementById('suiteList'),
  suiteTitle: document.getElementById('suiteTitle'),
  suiteCount: document.getElementById('suiteCount'),
  modeEyebrow: document.getElementById('modeEyebrow'),
  modeTitle: document.getElementById('modeTitle'),
  modeDesc: document.getElementById('modeDesc'),
  detailTitle: document.getElementById('detailTitle'),
  detailDesc: document.getElementById('detailDesc'),
  detailPath: document.getElementById('detailPath'),
  detailError: document.getElementById('detailError'),
  detailSteps: document.getElementById('detailSteps'),
  detailStepsHint: document.getElementById('detailStepsHint'),
  resultBadge: document.getElementById('resultBadge'),
  logView: document.getElementById('logView'),
  btnRunSelected: document.getElementById('btnRunSelected'),
  btnEditSpec: document.getElementById('btnEditSpec'),
  btnEditSpecDetail: document.getElementById('btnEditSpecDetail'),
  btnEditSpecFromSteps: document.getElementById('btnEditSpecFromSteps'),
  btnRunType: document.getElementById('btnRunType'),
  btnAll: document.getElementById('btnAll'),
  typeTotals: document.getElementById('typeTotals'),
  totalSmoke: document.getElementById('totalSmoke'),
  totalCrud: document.getElementById('totalCrud'),
  totalE2e: document.getElementById('totalE2e'),
  totalStory: document.getElementById('totalStory'),
  totalAll: document.getElementById('totalAll'),
  btnManagePaths: document.getElementById('btnManagePaths'),
  btnSystemConfig: document.getElementById('btnSystemConfig'),
  btnClearLog: document.getElementById('btnClearLog'),
  statPassed: document.getElementById('statPassed'),
  statFailed: document.getElementById('statFailed'),
  statSkipped: document.getElementById('statSkipped'),
  statIdle: document.getElementById('statIdle'),
  batchList: document.getElementById('batchList'),
  batchProgress: document.getElementById('batchProgress'),
  batchToolbar: document.getElementById('batchToolbar'),
  batchSelHint: document.getElementById('batchSelHint'),
  chkSelectAllBatch: document.getElementById('chkSelectAllBatch'),
  btnSelectPassed: document.getElementById('btnSelectPassed'),
  btnSelectFailed: document.getElementById('btnSelectFailed'),
  btnSelectSkipped: document.getElementById('btnSelectSkipped'),
  btnClearBatchSel: document.getElementById('btnClearBatchSel'),
  btnExportSelectedPdf: document.getElementById('btnExportSelectedPdf'),
  btnExportRunPdf: document.getElementById('btnExportRunPdf'),
  historyList: document.getElementById('historyList'),
  historyHint: document.getElementById('historyHint'),
  pathModal: document.getElementById('pathModal'),
  pathModalHint: document.getElementById('pathModalHint'),
  stepsModal: document.getElementById('stepsModal'),
  stepsModalEyebrow: document.getElementById('stepsModalEyebrow'),
  stepsModalTitle: document.getElementById('stepsModalTitle'),
  stepsModalDesc: document.getElementById('stepsModalDesc'),
  stepsModalPath: document.getElementById('stepsModalPath'),
  stepsModalHint: document.getElementById('stepsModalHint'),
  stepsModalList: document.getElementById('stepsModalList'),
  stepsModalMeta: document.getElementById('stepsModalMeta'),
  stepsModalShotsWrap: document.getElementById('stepsModalShotsWrap'),
  stepsModalShots: document.getElementById('stepsModalShots'),
  stepsModalShotsHint: document.getElementById('stepsModalShotsHint'),
  btnCloseStepsModal: document.getElementById('btnCloseStepsModal'),
  specEditModal: document.getElementById('specEditModal'),
  specEditModalTitle: document.getElementById('specEditModalTitle'),
  specEditModalHint: document.getElementById('specEditModalHint'),
  specEditFileLabel: document.getElementById('specEditFileLabel'),
  specEditNote: document.getElementById('specEditNote'),
  specEditSource: document.getElementById('specEditSource'),
  btnReloadSpec: document.getElementById('btnReloadSpec'),
  btnSaveSpec: document.getElementById('btnSaveSpec'),
  btnCloseSpecEditModal: document.getElementById('btnCloseSpecEditModal'),
  btnExportPdf: document.getElementById('btnExportPdf'),
  btnRunFromStepsModal: document.getElementById('btnRunFromStepsModal'),
  shotLightbox: document.getElementById('shotLightbox'),
  shotLightboxImg: document.getElementById('shotLightboxImg'),
  shotLightboxCap: document.getElementById('shotLightboxCap'),
  btnCloseLightbox: document.getElementById('btnCloseLightbox'),
  pathKindBar: document.getElementById('pathKindBar'),
  pathEditor: document.getElementById('pathEditor'),
  pathFileLabel: document.getElementById('pathFileLabel'),
  pathNote: document.getElementById('pathNote'),
  btnAddPath: document.getElementById('btnAddPath'),
  btnReloadPaths: document.getElementById('btnReloadPaths'),
  btnSavePaths: document.getElementById('btnSavePaths'),
  btnClosePathModal: document.getElementById('btnClosePathModal'),
  systemModal: document.getElementById('systemModal'),
  systemModalHint: document.getElementById('systemModalHint'),
  systemForm: document.getElementById('systemForm'),
  systemFileLabel: document.getElementById('systemFileLabel'),
  btnReloadSystem: document.getElementById('btnReloadSystem'),
  btnSaveSystem: document.getElementById('btnSaveSystem'),
  btnCloseSystemModal: document.getElementById('btnCloseSystemModal'),
  miniappModal: document.getElementById('miniappModal'),
  miniappForm: document.getElementById('miniappForm'),
  miniappFileLabel: document.getElementById('miniappFileLabel'),
  btnReloadMiniapp: document.getElementById('btnReloadMiniapp'),
  btnSaveMiniapp: document.getElementById('btnSaveMiniapp'),
  btnCloseMiniappModal: document.getElementById('btnCloseMiniappModal'),
  modeBar: document.getElementById('modeBar'),
  functionalStage: document.getElementById('functionalStage'),
  stressStage: document.getElementById('stressStage'),
  aiGenStage: document.getElementById('aiGenStage'),
  xuqiuStage: document.getElementById('xuqiuStage'),
  xuqiuStatusBanner: document.getElementById('xuqiuStatusBanner'),
  xuqiuTabBar: document.getElementById('xuqiuTabBar'),
  xuqiuSearch: document.getElementById('xuqiuSearch'),
  btnXuqiuSearch: document.getElementById('btnXuqiuSearch'),
  btnXuqiuImport: document.getElementById('btnXuqiuImport'),
  btnXuqiuCreate: document.getElementById('btnXuqiuCreate'),
  btnXuqiuSave: document.getElementById('btnXuqiuSave'),
  btnXuqiuDelete: document.getElementById('btnXuqiuDelete'),
  btnXuqiuGenTest: document.getElementById('btnXuqiuGenTest'),
  btnXuqiuAddTaskRow: document.getElementById('btnXuqiuAddTaskRow'),
  btnXuqiuShowRelated2: document.getElementById('btnXuqiuShowRelated2'),
  btnCloseXuqiuRelatedModal: document.getElementById('btnCloseXuqiuRelatedModal'),
  btnCloseXuqiuGenTestModal: document.getElementById('btnCloseXuqiuGenTestModal'),
  btnXuqiuDoGenTest: document.getElementById('btnXuqiuDoGenTest'),
  btnXuqiuSaveGenTest: document.getElementById('btnXuqiuSaveGenTest'),
  btnXuqiuRunGenTest: document.getElementById('btnXuqiuRunGenTest'),
  btnXuqiuGenViewResult: document.getElementById('btnXuqiuGenViewResult'),
  xuqiuGenTestModal: document.getElementById('xuqiuGenTestModal'),
  xuqiuGenTestModalTitle: document.getElementById('xuqiuGenTestModalTitle'),
  xuqiuGenTestModalHint: document.getElementById('xuqiuGenTestModalHint'),
  xuqiuGenSystem: document.getElementById('xuqiuGenSystem'),
  xuqiuGenModule: document.getElementById('xuqiuGenModule'),
  xuqiuGenRequirement: document.getElementById('xuqiuGenRequirement'),
  xuqiuGenMeta: document.getElementById('xuqiuGenMeta'),
  xuqiuGenSpecSource: document.getElementById('xuqiuGenSpecSource'),
  xuqiuGenOverwrite: document.getElementById('xuqiuGenOverwrite'),
  xuqiuGenSaveHint: document.getElementById('xuqiuGenSaveHint'),
  xuqiuGenRunResult: document.getElementById('xuqiuGenRunResult'),
  xuqiuGenRunStatus: document.getElementById('xuqiuGenRunStatus'),
  xuqiuRelatedModal: document.getElementById('xuqiuRelatedModal'),
  xuqiuRelatedModalTitle: document.getElementById('xuqiuRelatedModalTitle'),
  xuqiuRelatedModalHint: document.getElementById('xuqiuRelatedModalHint'),
  xuqiuRelatedModalBody: document.getElementById('xuqiuRelatedModalBody'),
  xuqiuRelatedTitle: document.getElementById('xuqiuRelatedTitle'),
  xuqiuRelatedHint: document.getElementById('xuqiuRelatedHint'),
  xuqiuRelated: document.getElementById('xuqiuRelated'),
  xuqiuRelatedList: document.getElementById('xuqiuRelatedList'),
  xuqiuList: document.getElementById('xuqiuList'),
  xuqiuListTitle: document.getElementById('xuqiuListTitle'),
  xuqiuListCount: document.getElementById('xuqiuListCount'),
  xuqiuForm: document.getElementById('xuqiuForm'),
  xuqiuEditorTitle: document.getElementById('xuqiuEditorTitle'),
  globalLoading: document.getElementById('globalLoading'),
  globalLoadingText: document.getElementById('globalLoadingText'),
  btnAiGenerate: document.getElementById('btnAiGenerate'),
  btnAiSave: document.getElementById('btnAiSave'),
  btnAiRun: document.getElementById('btnAiRun'),
  btnAiViewResult: document.getElementById('btnAiViewResult'),
  aiRunResult: document.getElementById('aiRunResult'),
  aiRunStatus: document.getElementById('aiRunStatus'),
  btnAiReloadStatus: document.getElementById('btnAiReloadStatus'),
  btnAiConfig: document.getElementById('btnAiConfig'),
  aiConfigModal: document.getElementById('aiConfigModal'),
  aiConfigModalHint: document.getElementById('aiConfigModalHint'),
  aiConfigForm: document.getElementById('aiConfigForm'),
  aiCfgProvider: document.getElementById('aiCfgProvider'),
  aiCfgBaseURL: document.getElementById('aiCfgBaseURL'),
  aiCfgModel: document.getElementById('aiCfgModel'),
  aiCfgModelList: document.getElementById('aiCfgModelList'),
  aiCfgApiKey: document.getElementById('aiCfgApiKey'),
  aiCfgKeyHint: document.getElementById('aiCfgKeyHint'),
  aiCfgTemperature: document.getElementById('aiCfgTemperature'),
  aiCfgJsonMode: document.getElementById('aiCfgJsonMode'),
  aiCfgFileLabel: document.getElementById('aiCfgFileLabel'),
  btnCloseAiConfigModal: document.getElementById('btnCloseAiConfigModal'),
  btnReloadAiConfig: document.getElementById('btnReloadAiConfig'),
  aiKind: document.getElementById('aiKind'),
  aiSystem: document.getElementById('aiSystem'),
  aiModule: document.getElementById('aiModule'),
  aiName: document.getElementById('aiName'),
  aiRequirement: document.getElementById('aiRequirement'),
  aiStatusBanner: document.getElementById('aiStatusBanner'),
  aiPreviewWrap: document.getElementById('aiPreviewWrap'),
  aiPreviewMeta: document.getElementById('aiPreviewMeta'),
  aiPreviewFields: document.getElementById('aiPreviewFields'),
  aiSpecSource: document.getElementById('aiSpecSource'),
  aiOverwrite: document.getElementById('aiOverwrite'),
  aiSaveHint: document.getElementById('aiSaveHint'),
  btnStopRun: document.getElementById('btnStopRun'),
  btnStressStart: document.getElementById('btnStressStart'),
  btnStressStop: document.getElementById('btnStressStop'),
  stressVus: document.getElementById('stressVus'),
  stressDuration: document.getElementById('stressDuration'),
  stressRamp: document.getElementById('stressRamp'),
  stressWithUi: document.getElementById('stressWithUi'),
  stressUiWorkers: document.getElementById('stressUiWorkers'),
  stressScenarioList: document.getElementById('stressScenarioList'),
  stressScenarioCount: document.getElementById('stressScenarioCount'),
  stressApiBase: document.getElementById('stressApiBase'),
  stressLogView: document.getElementById('stressLogView'),
  btnClearStressLog: document.getElementById('btnClearStressLog'),
  stressDetailList: document.getElementById('stressDetailList'),
  stressDetailHint: document.getElementById('stressDetailHint'),
  stressHistoryList: document.getElementById('stressHistoryList'),
  mRps: document.getElementById('mRps'),
  mTotal: document.getElementById('mTotal'),
  mOk: document.getElementById('mOk'),
  mFail: document.getElementById('mFail'),
  mFailHint: document.getElementById('mFailHint'),
  statFailCard: document.getElementById('statFailCard'),
  stressFailPanel: document.getElementById('stressFailPanel'),
  stressFailList: document.getElementById('stressFailList'),
  stressFailHint: document.getElementById('stressFailHint'),
  stressFailModal: document.getElementById('stressFailModal'),
  stressFailModalTitle: document.getElementById('stressFailModalTitle'),
  stressFailModalDesc: document.getElementById('stressFailModalDesc'),
  stressFailModalBody: document.getElementById('stressFailModalBody'),
  btnCloseStressFailModal: document.getElementById('btnCloseStressFailModal'),
  mErrRate: document.getElementById('mErrRate'),
  mP50: document.getElementById('mP50'),
  mP95: document.getElementById('mP95'),
  mP99: document.getElementById('mP99'),
  summary: document.getElementById('summary'),
};

function allItems() {
  return [
    ...state.catalog.smoke,
    ...(state.catalog.crud || []),
    ...state.catalog.e2e,
    ...(state.catalog.story || []),
  ];
}

function modeItems() {
  if (state.mode === 'smoke') return state.catalog.smoke;
  if (state.mode === 'crud') return state.catalog.crud || [];
  if (state.mode === 'e2e') return state.catalog.e2e;
  if (state.mode === 'story') return state.catalog.story || [];
  return [];
}

function findItem(id) {
  return allItems().find((x) => x.id === id);
}

function currentSystem() {
  return state.systems.find((s) => s.id === state.system) || state.systems[0];
}

function statusOf(id) {
  return state.results[id]?.status || 'idle';
}

function statusLabel(st) {
  if (st === 'passed') return '通過';
  if (st === 'failed') return '失敗';
  if (st === 'running') return '執行中';
  if (st === 'skipped') return '跳過';
  return '未跑';
}

function groupByModule(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.module || '其他';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function appendLog(line) {
  if (!el.logView) return;
  el.logView.textContent += `${line}\n`;
  el.logView.scrollTop = el.logView.scrollHeight;
}

function showLoading(message) {
  state.loadingDepth = Math.max(0, Number(state.loadingDepth) || 0) + 1;
  if (el.globalLoadingText) {
    el.globalLoadingText.textContent = message || '正在處理任務…';
  }
  if (el.globalLoading) el.globalLoading.hidden = false;
}

/** @param {boolean} [force] 強制關閉（執行結束時用，避免 depth／狀態不同步） */
function hideLoading(force = false) {
  if (force) {
    state.loadingDepth = 0;
  } else {
    state.loadingDepth = Math.max(0, (Number(state.loadingDepth) || 0) - 1);
  }
  if (state.loadingDepth > 0) return;
  state.loadingDepth = 0;
  if (el.globalLoading) el.globalLoading.hidden = true;
}

function setBusy(busy) {
  const next = !!busy;
  const wasRunning = !!state.running;
  state.running = next;
  const hideFunctionalRun = state.mode === 'stress' || state.nav === 'aigen' || state.nav === 'xuqiu';
  if (el.btnAll) el.btnAll.disabled = next || state.nav === 'aigen' || state.nav === 'xuqiu';
  if (el.btnRunType) el.btnRunType.disabled = next || hideFunctionalRun;
  if (el.btnStopRun) el.btnStopRun.hidden = !next || state.mode === 'stress' || state.nav === 'aigen' || state.nav === 'xuqiu';
  if (el.btnStressStart) el.btnStressStart.disabled = next;
  if (el.btnStressStop) el.btnStressStop.disabled = !next;
  if (el.btnAiGenerate) el.btnAiGenerate.disabled = next;
  if (el.btnAiSave) el.btnAiSave.disabled = next;
  if (el.btnAiRun) el.btnAiRun.disabled = next;
  refreshSelectedActions();
  renderSystemBar();
  if (state.mode !== 'stress' && state.nav !== 'aigen' && state.nav !== 'xuqiu') renderSuiteList();
  refreshStressFormBusy();

  if (next && !wasRunning) {
    const msg = state.mode === 'stress' ? '正在執行壓力測試…' : '正在執行測試，請稍候…';
    showLoading(msg);
  } else if (!next) {
    // 無論先前 state.running 是否已被改寫，結束時一律關掉載入圈
    hideLoading(true);
  }
}

function refreshSelectedActions() {
  const item = findItem(state.selectedId);
  const inMode = item && modeItems().some((x) => x.id === item.id);
  el.btnRunSelected.disabled = !inMode || state.running;
  const hasSpec = !!(item?.file && String(item.file).replace(/\\/g, '/').startsWith('tests/'));
  const canEdit = !!(inMode && hasSpec && !state.running);
  const title = hasSpec
    ? `編輯 ${item.file}`
    : '請先選取一項測試（冒煙／CRUD／E2E／用戶故事皆可）';
  for (const btn of [el.btnEditSpec, el.btnEditSpecDetail]) {
    if (!btn) continue;
    btn.disabled = !canEdit;
    btn.hidden = false;
    btn.title = title;
  }
}

function renderSystemBar() {
  const isAi = state.nav === 'aigen';
  const isXuqiu = state.nav === 'xuqiu';
  const isTool = isAi || isXuqiu;
  if (isAi) {
    el.brandKicker.textContent = '工具 · 依需求生成腳本並寫入 tests/';
    if (el.workspaceSystemName) el.workspaceSystemName.textContent = 'AI 生成測試';
  } else if (isXuqiu) {
    el.brandKicker.textContent = '工具 · 根據用戶定義生成腳本';
    if (el.workspaceSystemName) el.workspaceSystemName.textContent = '需求庫';
  } else {
    const sys = currentSystem();
    if (sys) {
      el.brandKicker.textContent = `${sys.subtitle} · ${sys.baseURL}`;
      if (el.workspaceSystemName) el.workspaceSystemName.textContent = sys.name;
    }
  }

  const systemButtons = state.systems
    .map((s) => {
      const active = !isTool && s.id === state.system ? 'active' : '';
      return `<button class="system-menu-item ${active}" type="button" data-system="${s.id}" ${
        state.running ? 'disabled' : ''
      }><strong>${s.name}</strong><span>${s.subtitle}</span></button>`;
    })
    .join('');

  const miniapp = state.miniapp || DEFAULT_MINIAPP;
  const miniappUrl = String(miniapp.baseURL || DEFAULT_MINIAPP.baseURL).replace(/\/+$/, '');
  const miniappHref = `${miniappUrl}/`;
  const miniappLink = `<div class="system-menu-row"><a class="system-menu-item system-menu-link" href="${escapeHtml(miniappHref)}" target="_blank" rel="noopener noreferrer" title="另開頁面前往小程序測試台"><strong>${escapeHtml(miniapp.name || DEFAULT_MINIAPP.name)}</strong><span>跳轉 ${escapeHtml(miniappUrl)}</span></a><button class="system-menu-config" type="button" data-nav="miniapp-config" title="配置小程序測試地址">配置</button></div>`;
  const aiButton = `<button class="system-menu-item system-menu-tool ${isAi ? 'active' : ''}" type="button" data-nav="aigen" ${
    state.running ? 'disabled' : ''
  }><strong>AI 生成測試</strong><span>自然語言 → 腳本</span></button>`;
  const xuqiuButton = `<button class="system-menu-item system-menu-tool ${isXuqiu ? 'active' : ''}" type="button" data-nav="xuqiu" ${
    state.running ? 'disabled' : ''
  }><strong>需求庫</strong><span>根據用戶定義生成腳本</span></button>`;

  el.systemBar.innerHTML = `${systemButtons}${miniappLink}<div class="system-menu-divider" role="separator"></div>${aiButton}${xuqiuButton}`;
  renderTypeTotals();
}

function syncAiSystemOptions() {
  if (!el.aiSystem) return;
  const cur = el.aiSystem.value || state.system;
  el.aiSystem.innerHTML = state.systems
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join('');
  if ([...el.aiSystem.options].some((o) => o.value === cur)) el.aiSystem.value = cur;
  else if (state.system) el.aiSystem.value = state.system;
}

function renderTypeTotals() {
  const smoke = state.catalog.smoke?.length || 0;
  const crud = state.catalog.crud?.length || 0;
  const e2e = state.catalog.e2e?.length || 0;
  const story = state.catalog.story?.length || 0;
  const all = smoke + crud + e2e + story;
  if (el.totalSmoke) el.totalSmoke.textContent = String(smoke);
  if (el.totalCrud) el.totalCrud.textContent = String(crud);
  if (el.totalE2e) el.totalE2e.textContent = String(e2e);
  if (el.totalStory) el.totalStory.textContent = String(story);
  if (el.totalAll) el.totalAll.textContent = String(all);
  if (el.typeTotals) {
    el.typeTotals.title = `${currentSystem()?.name || '目前系統'}：冒煙 ${smoke} · CRUD ${crud} · E2E ${e2e} · 用戶故事 ${story} · 合計 ${all}`;
  }
  if (el.btnAll) {
    el.btnAll.title = all ? `將依序執行全部 ${all} 項（冒煙+CRUD+E2E+用戶故事）` : '尚無測試項';
  }
}

function renderModeTabs() {
  const isAi = state.nav === 'aigen';
  const isXuqiu = state.nav === 'xuqiu';
  const isTool = isAi || isXuqiu;
  const isStress = !isTool && state.mode === 'stress';
  if (el.modeBar) el.modeBar.hidden = isTool;

  document.querySelectorAll('.mode-bar .mode-tab').forEach((btn) => {
    btn.classList.toggle('active', !isTool && btn.dataset.mode === state.mode);
  });

  if (el.functionalStage) el.functionalStage.hidden = isStress || isTool;
  if (el.stressStage) el.stressStage.hidden = !isStress || isTool;
  if (el.aiGenStage) el.aiGenStage.hidden = !isAi;
  if (el.xuqiuStage) el.xuqiuStage.hidden = !isXuqiu;
  if (el.summary) el.summary.hidden = isStress || isTool;
  if (el.btnAll) el.btnAll.hidden = isStress || isTool;
  if (el.typeTotals) el.typeTotals.hidden = isStress || isTool;
  if (el.btnSystemConfig) el.btnSystemConfig.hidden = isTool;
  if (el.btnManagePaths) el.btnManagePaths.hidden = isTool;

  if (isTool || isStress) return;
  const meta = MODE_META[state.mode];
  if (!meta) return;
  el.modeEyebrow.textContent = '目前類型';
  el.modeTitle.textContent = meta.title;
  el.modeDesc.textContent = meta.desc;
  el.btnRunType.textContent = meta.runLabel;
}

function renderSummary() {
  const items = modeItems();
  let passed = 0;
  let failed = 0;
  let running = 0;
  let skipped = 0;
  let idle = 0;
  for (const item of items) {
    const s = statusOf(item.id);
    if (s === 'passed') passed += 1;
    else if (s === 'failed') failed += 1;
    else if (s === 'running') running += 1;
    else if (s === 'skipped') skipped += 1;
    else idle += 1;
  }
  // 執行中暫時併入「未跑」旁的跳過欄位上方：通過+失敗+跳過+未跑(+執行中) = 總數
  el.statPassed.textContent = String(passed);
  el.statFailed.textContent = String(failed);
  el.statSkipped.textContent = String(skipped);
  el.statIdle.textContent = String(idle + running);
  el.suiteCount.textContent = `${items.length} 項（通過 ${passed} · 失敗 ${failed} · 跳過 ${skipped} · 未跑 ${idle}${
    running ? ` · 執行中 ${running}` : ''
  }）`;
  renderBatchBoard();
  renderHistory();
}

function targetLabel(target) {
  if (target === 'smoke') return '冒煙全部';
  if (target === 'crud') return 'CRUD 全部';
  if (target === 'e2e') return 'E2E 全部';
  if (target === 'story') return '用戶故事全部';
  if (target === 'all') return '全部類型';
  if (String(target).startsWith('smoke:')) return '冒煙單項';
  if (String(target).startsWith('crud:')) return 'CRUD 單項';
  if (String(target).startsWith('e2e:')) return 'E2E 單項';
  if (String(target).startsWith('story:')) return '用戶故事單項';
  if (String(target).startsWith('module:')) return '冒煙分組';
  if (String(target).startsWith('crud-module:')) return 'CRUD 分組';
  if (String(target).startsWith('e2e-module:')) return 'E2E 分組';
  if (String(target).startsWith('story-module:')) return '用戶故事分組';
  return target || '執行';
}

function renderHistory() {
  if (!el.historyList) return;
  const items = state.history || [];
  if (el.historyHint) {
    el.historyHint.textContent = items.length
      ? `已保存 ${items.length} 次（目前系統）`
      : '每次執行都會存檔，可隨時載入查看與匯出 PDF';
  }
  if (!items.length) {
    el.historyList.innerHTML = '<p class="batch-empty">尚無歷史紀錄。執行測試後會自動保存在此。</p>';
    return;
  }
  el.historyList.innerHTML = items
    .map((row) => {
      const c = row.counts || {};
      const active = state.activeRunId === row.runId ? 'active' : '';
      return `<div class="history-row ${active}">
        <span>
          <strong>${escapeHtml(formatTime(row.finishedAt || row.startedAt))}</strong>
          <em>${escapeHtml(targetLabel(row.target))} · 通過 ${c.passed || 0} · 失敗 ${c.failed || 0} · 共 ${c.total || 0}</em>
        </span>
        <span class="item-actions">
          <button class="btn tiny" type="button" data-load-run="${escapeHtml(row.runId)}">載入</button>
          <button class="btn tiny" type="button" data-pdf-run="${escapeHtml(row.runId)}">匯出 PDF</button>
          <button class="btn tiny ghost" type="button" data-log-run="${escapeHtml(row.runId)}">日誌</button>
        </span>
      </div>`;
    })
    .join('');
}

async function loadHistory() {
  const res = await fetch(`/api/history?system=${encodeURIComponent(state.system)}`);
  const data = await res.json();
  state.history = data.items || [];
  renderHistory();
}

function applySnapshot(data, options = {}) {
  if (!data) return;
  if (data.results) {
    state.results = options.replaceResults ? data.results : { ...state.results, ...data.results };
  }
  state.lastRunIds = Array.isArray(data.lastRunIds)
    ? data.lastRunIds
    : Array.isArray(data.ids)
      ? data.ids
      : state.lastRunIds;
  state.lastTarget = data.target || state.lastTarget;
  state.activeRunId = data.runId || state.activeRunId;
  if (Array.isArray(data.log)) {
    el.logView.textContent = data.log.join('\n') + (data.log.length ? '\n' : '');
    el.logView.scrollTop = el.logView.scrollHeight;
  }
  if (options.render !== false) {
    renderSuiteList();
    renderDetail();
    renderSummary();
  }
}

function renderBatchBoard() {
  const ids = state.lastRunIds || [];
  if (!ids.length) {
    el.batchProgress.textContent = '尚未執行';
    el.batchList.innerHTML = '<p class="batch-empty">先選系統與類型，再執行測試。</p>';
    if (el.batchToolbar) el.batchToolbar.hidden = true;
    state.exportSelectedIds = [];
    return;
  }

  const selected = new Set(state.exportSelectedIds || []);
  // 去掉已不在本輪的勾選
  state.exportSelectedIds = [...selected].filter((id) => ids.includes(id));

  let passed = 0;
  let failed = 0;
  let running = 0;
  let skipped = 0;
  const rows = ids
    .map((id) => {
      const item = findItem(id);
      if (!item) return '';
      const st = statusOf(id);
      if (st === 'passed') passed += 1;
      else if (st === 'failed') failed += 1;
      else if (st === 'running') running += 1;
      else if (st === 'skipped') skipped += 1;
      const result = state.results[id] || {};
      const stepHint = result.stepSummary ? `<i>${result.stepSummary}</i>` : '';
      const checked = state.exportSelectedIds.includes(id) ? 'checked' : '';
      const canPick = st === 'passed' || st === 'failed' || st === 'skipped';
      return `
        <div class="batch-row" data-id="${id}">
          <label class="batch-check" title="勾選後可批次匯出 PDF">
            <input type="checkbox" data-export-id="${id}" ${checked} ${canPick ? '' : 'disabled'} />
          </label>
          <button class="batch-main" data-id="${id}" type="button">
            <span class="pill ${st}">${statusLabel(st)}</span>
            <span>
              <strong>${item.module ? item.module + ' / ' : ''}${item.name}</strong>
              <em>${item.path || item.file || id}</em>
              ${stepHint}
            </span>
            <span>${item.kind.toUpperCase()}</span>
          </button>
        </div>
      `;
    })
    .join('');

  const done = passed + failed + skipped;
  el.batchProgress.textContent = state.running
    ? `執行中 ${done}/${ids.length}（通過 ${passed} · 失敗 ${failed} · 跳過 ${skipped} · 進行中 ${running}）`
    : `完成 ${ids.length} 項（通過 ${passed} · 失敗 ${failed} · 跳過 ${skipped}）`;
  el.batchList.innerHTML = rows || '<p class="batch-empty">沒有可顯示的結果。</p>';
  if (el.batchToolbar) el.batchToolbar.hidden = false;
  refreshBatchExportUi();
}

function refreshBatchExportUi() {
  const n = (state.exportSelectedIds || []).length;
  const failedN = batchIdsByStatus('failed').length;
  const passedN = batchIdsByStatus('passed').length;
  if (el.batchSelHint) {
    el.batchSelHint.textContent = `已選 ${n} 項（本輪通過 ${passedN} · 失敗 ${failedN}）`;
  }
  if (el.btnExportSelectedPdf) el.btnExportSelectedPdf.disabled = n === 0 || !!state.running;
  if (el.btnExportRunPdf) {
    const hasDone = (state.lastRunIds || []).some((id) => {
      const st = statusOf(id);
      return st === 'passed' || st === 'failed' || st === 'skipped';
    });
    el.btnExportRunPdf.disabled = !hasDone || !!state.running;
  }
  if (el.btnSelectFailed) el.btnSelectFailed.disabled = failedN === 0 || !!state.running;
  if (el.btnSelectPassed) el.btnSelectPassed.disabled = passedN === 0 || !!state.running;
  if (el.btnSelectSkipped) {
    el.btnSelectSkipped.disabled = batchIdsByStatus('skipped').length === 0 || !!state.running;
  }
  if (el.chkSelectAllBatch) {
    const ids = batchIdsByStatus('passed', 'failed', 'skipped');
    el.chkSelectAllBatch.checked = ids.length > 0 && ids.every((id) => state.exportSelectedIds.includes(id));
    el.chkSelectAllBatch.indeterminate =
      state.exportSelectedIds.length > 0 && state.exportSelectedIds.length < ids.length;
  }
}

async function downloadPdfBlob(res, fallbackName) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `匯出失敗（${res.status}）`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = cd.match(/filename="([^"]+)"/i);
  const name = decodeURIComponent(star?.[1] || '') || plain?.[1] || fallbackName;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

async function exportBatchPdf(ids, title) {
  const runId = state.activeRunId || '';
  const res = await fetch(`/api/export-pdf-batch?system=${encodeURIComponent(state.system)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, runId: runId || undefined, title }),
  });
  await downloadPdfBlob(res, 'QA-batch-report.pdf');
}

function renderSuiteList() {
  const items = modeItems();
  el.suiteTitle.textContent = `${MODE_META[state.mode].title}項目`;
  const groups = groupByModule(items);
  const parts = [];
  for (const [moduleName, list] of groups) {
    parts.push(`
      <div class="group">
        <div class="group-title">
          <span>${moduleName}</span>
          <button type="button" class="linkish" data-run-group="${encodeURIComponent(moduleName)}" ${
            state.running ? 'disabled' : ''
          }>跑此分組</button>
        </div>
        ${list
          .map((item) => {
            const st = statusOf(item.id);
            const active = state.selectedId === item.id ? 'active' : '';
            return `
              <div class="item-row ${active}">
                <button class="item" data-id="${item.id}" type="button">
                  <span>
                    <span class="item-name">${item.name}</span>
                    <span class="item-path">${item.path || item.file || ''}${
                      item.plannedStepSummary
                        ? ` · <span class="steps-link" data-open-steps="${item.id}">${item.plannedStepSummary}</span>`
                        : ''
                    }</span>
                  </span>
                  <span class="pill ${st}">${statusLabel(st)}</span>
                </button>
                ${
                  item.file
                    ? `<button class="btn tiny primary item-edit-btn" type="button" data-edit-spec="${item.id}" ${
                        state.running ? 'disabled' : ''
                      } title="${escapeHtml(item.file)}">編輯腳本</button>`
                    : ''
                }
              </div>
            `;
          })
          .join('')}
      </div>
    `);
  }
  el.suiteList.innerHTML = parts.join('') || '<p class="batch-empty">此類型暫無測試項。</p>';
}

function matchStepResult(plannedTitle, resultSteps) {
  if (!plannedTitle || !Array.isArray(resultSteps)) return null;
  const exact = resultSteps.find((s) => s.title === plannedTitle);
  if (exact) return exact;
  const leaf = plannedTitle.replace(/^.*›\s*/, '').trim();
  return (
    resultSteps.find((s) => {
      const t = String(s.title || '');
      return t === leaf || t.endsWith(`› ${leaf}`) || t.endsWith(leaf);
    }) || null
  );
}

function formatDuration(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return '';
  const n = Number(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function collectShots(result) {
  const list = [];
  const seen = new Set();
  for (const s of result.steps || []) {
    if (!s?.screenshot || seen.has(s.screenshot)) continue;
    seen.add(s.screenshot);
    list.push({
      src: s.screenshot,
      title: String(s.title || '').replace(/^.*›\s*/, '') || '步驟畫面',
      status: s.status || 'passed',
    });
  }
  return list;
}

function buildDisplaySteps(item, result) {
  const planned = Array.isArray(item.plannedSteps) ? item.plannedSteps : [];
  const executed = Array.isArray(result.steps) ? result.steps : [];
  const executedReal = executed.filter((s) => s && s.status && s.status !== 'idle');

  const toView = (title, index, hit) => ({
    title,
    status: hit?.status || 'idle',
    index: index + 1,
    screenshot: hit?.screenshot || null,
    url: hit?.url || null,
    duration: hit?.duration,
    error: hit?.error || null,
    how: hit?.how || null,
  });

  // 已執行：以實際結果為準（含截圖），避免預計步驟名稱對不上而顯示「未跑」
  if (executedReal.length) {
    return executedReal.map((s, index) =>
      toView(String(s.title || '').replace(/^.*›\s*/, ''), index, s),
    );
  }

  if (planned.length) {
    return planned.map((title, index) => toView(title, index, matchStepResult(title, executed)));
  }

  return executed.map((s, index) =>
    toView(String(s.title || '').replace(/^.*›\s*/, ''), index, s),
  );
}

function stepsHtml(steps) {
  if (!steps.length) {
    return '<li class="detail-step idle">此項目尚無可解析的步驟</li>';
  }
  return steps
    .map((step) => {
      const label = statusLabel(step.status === 'idle' ? 'idle' : step.status);
      const how = step.how
        ? `<small class="step-how">${escapeHtml(step.how)}</small>`
        : step.status === 'idle'
          ? `<small class="step-how">尚未執行</small>`
          : '';
      const url = step.url ? `<small class="step-url">${escapeHtml(step.url)}</small>` : '';
      const dur = step.duration != null ? `<small class="step-dur">耗時 ${escapeHtml(formatDuration(step.duration))}</small>` : '';
      const err = step.error ? `<small class="step-err">${escapeHtml(step.error)}</small>` : '';
      const shot = step.screenshot
        ? `<button type="button" class="shot-thumb" data-shot="${escapeHtml(step.screenshot)}" data-shot-cap="${escapeHtml(`${step.index}. ${step.title}`)}">
             <img src="${escapeHtml(step.screenshot)}" alt="${escapeHtml(step.title)}" />
           </button>`
        : '';
      return `<li class="detail-step ${step.status}">
        <span class="step-idx">${step.index}</span>
        <div class="step-main">
          <div class="step-top">
            <span class="step-title">${escapeHtml(step.title)}</span>
            <span class="pill ${step.status}">${label === 'IDLE' ? '未跑' : label}</span>
          </div>
          ${how}${url}${dur}${err}${shot}
        </div>
      </li>`;
    })
    .join('');
}

function stepsHintText(item, result, steps) {
  const executedCount = Array.isArray(result.steps) ? result.steps.length : 0;
  const st = result.status || 'idle';
  if (!steps.length) return '無步驟資訊';
  if (st === 'idle' || (!executedCount && st !== 'running')) {
    return item.plannedStepSummary || `預計 ${steps.length} 步驟（未執行）`;
  }
  if (result.stepSummary) return result.stepSummary;
  return `步驟 ${steps.length}`;
}

function renderDetailSteps(item, result = {}) {
  if (!el.detailSteps || !el.detailStepsHint) return;
  if (!item) {
    el.detailStepsHint.textContent = '未選擇';
    el.detailSteps.innerHTML = '<li class="detail-step idle">先從左側選取測試項目</li>';
    return;
  }

  const steps = buildDisplaySteps(item, result);
  el.detailStepsHint.textContent = stepsHintText(item, result, steps);
  el.detailSteps.innerHTML = stepsHtml(steps);
}

function renderExecMeta(item, result) {
  if (!el.stepsModalMeta) return;
  const st = result.status || 'idle';
  if (st === 'idle' || !st) {
    el.stepsModalMeta.hidden = true;
    el.stepsModalMeta.innerHTML = '';
    return;
  }
  const dur =
    result.startedAt && result.finishedAt
      ? formatDuration(new Date(result.finishedAt) - new Date(result.startedAt))
      : '';
  const rows = [
    ['結果', statusLabel(st)],
    ['開始', formatTime(result.startedAt)],
    ['結束', formatTime(result.finishedAt)],
    ['耗時', dur || '—'],
    ['執行命令', result.command || 'Playwright 單項執行'],
  ];
  el.stepsModalMeta.hidden = false;
  el.stepsModalMeta.innerHTML = rows
    .map(([k, v]) => `<div><span>${escapeHtml(k)}</span><em>${escapeHtml(String(v || '—'))}</em></div>`)
    .join('');
}

function renderShotGallery(result = {}) {
  if (!el.stepsModalShotsWrap || !el.stepsModalShots) return;
  const shots = collectShots(result);
  if (!shots.length) {
    el.stepsModalShotsWrap.hidden = true;
    el.stepsModalShots.innerHTML = '';
    return;
  }
  el.stepsModalShotsWrap.hidden = false;
  if (el.stepsModalShotsHint) el.stepsModalShotsHint.textContent = `${shots.length} 張，點圖放大`;
  el.stepsModalShots.innerHTML = shots
    .map(
      (shot, i) => `<button type="button" class="shot-card" data-shot="${escapeHtml(shot.src)}" data-shot-cap="${escapeHtml(`${i + 1}. ${shot.title}`)}">
        <img src="${escapeHtml(shot.src)}" alt="${escapeHtml(shot.title)}" />
        <span>${escapeHtml(shot.title)}</span>
      </button>`,
    )
    .join('');
}

function renderStepsModalContent(itemId = state.stepsModalId) {
  if (!el.stepsModal || el.stepsModal.hidden) return;
  const item = findItem(itemId);
  if (!item) {
    el.stepsModalTitle.textContent = '任務步驟';
    el.stepsModalDesc.textContent = '找不到此測試項';
    el.stepsModalPath.textContent = '';
    el.stepsModalHint.textContent = '—';
    el.stepsModalList.innerHTML = '<li class="detail-step idle">尚無步驟</li>';
    renderExecMeta(null, {});
    renderShotGallery({});
    if (el.btnExportPdf) el.btnExportPdf.disabled = true;
    return;
  }

  const result = state.results[item.id] || {};
  const steps = buildDisplaySteps(item, result);
  const done = result.status && result.status !== 'idle' && result.status !== 'running';
  if (el.stepsModalEyebrow) el.stepsModalEyebrow.textContent = done ? '執行結果' : '測試步驟';
  el.stepsModalTitle.textContent = `${item.module ? item.module + ' / ' : ''}${item.name}`;
  el.stepsModalDesc.textContent = item.description || '—';
  el.stepsModalPath.textContent = item.path || item.file || item.id;
  el.stepsModalHint.textContent = stepsHintText(item, result, steps);
  el.stepsModalList.innerHTML = stepsHtml(steps);
  renderExecMeta(item, result);
  renderShotGallery(result);
  if (el.btnRunFromStepsModal) el.btnRunFromStepsModal.disabled = !!state.running;
  if (el.btnEditSpecFromSteps) {
    const canEdit = !!(item.file && !state.running);
    el.btnEditSpecFromSteps.hidden = !item.file;
    el.btnEditSpecFromSteps.disabled = !canEdit;
  }
  if (el.btnExportPdf) {
    const canExport = done && result.status !== 'idle';
    el.btnExportPdf.disabled = !canExport;
    el.btnExportPdf.title = canExport ? '下載此項結果 PDF' : '請先執行後再匯出';
  }
}

function openLightbox(src, cap) {
  if (!el.shotLightbox || !src) return;
  el.shotLightboxImg.src = src;
  el.shotLightboxImg.alt = cap || '步驟截圖';
  el.shotLightboxCap.textContent = cap || '';
  el.shotLightbox.hidden = false;
}

function closeLightbox() {
  if (!el.shotLightbox) return;
  el.shotLightbox.hidden = true;
  if (el.shotLightboxImg) el.shotLightboxImg.src = '';
}

function openStepsModal(id) {
  if (!el.stepsModal || !id) return;
  state.stepsModalId = id;
  el.stepsModal.hidden = false;
  renderStepsModalContent(id);
}

function closeStepsModal() {
  if (!el.stepsModal) return;
  el.stepsModal.hidden = true;
  state.stepsModalId = null;
}

function editableSpecFileOf(item) {
  if (!item?.file) return null;
  const rel = String(item.file).replace(/\\/g, '/');
  if (!rel.startsWith('tests/')) return null;
  return rel;
}

async function openSpecEditor(itemOrId) {
  if (state.running) {
    alert('測試執行中，暫不可編輯腳本');
    return;
  }
  const item = typeof itemOrId === 'string' ? findItem(itemOrId) : itemOrId || findItem(state.selectedId);
  const file = editableSpecFileOf(item);
  if (!item || !file) {
    alert('此項沒有可編輯的腳本檔（冒煙僅有路徑配置；請選 CRUD／E2E／用戶故事）');
    return;
  }
  showLoading('正在載入腳本…');
  try {
    const res = await fetch(`/api/spec?file=${encodeURIComponent(file)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    state.editingSpecFile = data.file;
    if (el.specEditModalTitle) {
      el.specEditModalTitle.textContent = `編輯：${item.name || data.file}`;
    }
    if (el.specEditModalHint) {
      el.specEditModalHint.textContent = item.description || '修改後儲存即寫入本機，下次執行生效';
    }
    if (el.specEditFileLabel) el.specEditFileLabel.textContent = data.file;
    if (el.specEditSource) el.specEditSource.value = data.content || '';
    if (el.specEditNote) {
      if (item.kind === 'smoke') {
        el.specEditNote.textContent = `冒煙各頁共用此腳本 ${data.file}；路徑清單請用「路徑管理」。改動會影響全部冒煙項。`;
      } else {
        const kindHint =
          item.kind === 'story'
            ? `用戶故事：請盡量保留標題中的 ${item.storyId || item.id}`
            : item.kind === 'crud'
              ? 'CRUD 腳本'
              : item.kind === 'e2e'
                ? 'E2E 腳本'
                : '測試腳本';
        el.specEditNote.textContent = `${kindHint} · 寫入 ${data.file}`;
      }
    }
    // 提到最上層，避免被步驟彈窗遮住
    if (el.specEditModal) {
      document.body.appendChild(el.specEditModal);
      el.specEditModal.hidden = false;
      el.specEditSource?.focus();
    }
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

function closeSpecEditor() {
  if (el.specEditModal) el.specEditModal.hidden = true;
  state.editingSpecFile = null;
}

async function reloadSpecEditor() {
  if (!state.editingSpecFile) return;
  showLoading('重新載入腳本…');
  try {
    const res = await fetch(`/api/spec?file=${encodeURIComponent(state.editingSpecFile)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    if (el.specEditSource) el.specEditSource.value = data.content || '';
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

async function saveSpecEditor() {
  if (!state.editingSpecFile) return;
  if (state.running) {
    alert('測試執行中，暫不可儲存');
    return;
  }
  const content = el.specEditSource?.value ?? '';
  if (!String(content).trim()) {
    alert('腳本內容不可為空');
    return;
  }
  if (el.btnSaveSpec) el.btnSaveSpec.disabled = true;
  showLoading('正在儲存腳本…');
  try {
    const res = await fetch('/api/spec', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: state.editingSpecFile, content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    appendLog(`\n—— 已儲存腳本：${data.file} ——`);
    await loadCatalog();
    if (state.selectedId) {
      renderDetail();
      renderStepsModalContent(state.selectedId);
    }
    alert(`已儲存 ${data.file}`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
    if (el.btnSaveSpec) el.btnSaveSpec.disabled = false;
  }
}

function renderDetail() {
  const item = findItem(state.selectedId);
  if (!item || !modeItems().some((x) => x.id === item.id)) {
    el.detailTitle.textContent = '尚未選擇';
    el.detailPath.textContent = '—';
    el.detailDesc.textContent = '先選系統與類型，再從下方列表點選項目。';
    el.detailError.textContent = '—';
    el.resultBadge.textContent = 'IDLE';
    el.resultBadge.className = 'result-status idle';
    renderDetailSteps(null);
    renderStepsModalContent();
    refreshSelectedActions();
    return;
  }

  const result = state.results[item.id] || {};
  const st = result.status || 'idle';
  el.detailTitle.textContent = `${item.module ? item.module + ' / ' : ''}${item.name}`;
  el.detailPath.textContent = item.path || item.file || '—';
  el.detailDesc.textContent = item.description || '—';
  const stepText = result.stepSummary ? `；${result.stepSummary}` : '';
  if (result.error) {
    el.detailError.textContent = `${result.error}${stepText}`;
  } else if (st === 'passed') {
    el.detailError.textContent = `通過${stepText}`;
  } else if (st === 'failed') {
    el.detailError.textContent = `失敗${stepText}`;
  } else if (st === 'skipped') {
    el.detailError.textContent = `跳過${stepText}`;
  } else if (st === 'running') {
    el.detailError.textContent = `執行中${stepText}`;
  } else {
    el.detailError.textContent = item.plannedStepSummary || (item.plannedSteps?.length ? `預計 ${item.plannedSteps.length} 步驟` : '—');
  }
  el.resultBadge.textContent = statusLabel(st);
  el.resultBadge.className = `result-status ${st}`;
  renderDetailSteps(item, result);
  renderStepsModalContent();
  refreshSelectedActions();
}

function selectItem(id, options = {}) {
  state.selectedId = id;
  renderSuiteList();
  renderDetail();
  renderSummary();
  if (options.openSteps !== false) openStepsModal(id);
}

function setMode(mode) {
  if (!MODE_META[mode]) return;
  state.nav = 'workspace';
  state.mode = mode;
  closeStepsModal();
  renderSystemBar();
  renderModeTabs();
  // 離開壓力測試後，依目前 running 狀態重算按鈕（避免「跑本類型全部」卡在 disabled）
  setBusy(!!state.running);
  if (mode === 'stress') {
    clearStressLivePanel({ keepLog: true });
    loadStressConfig();
    loadStressHistory();
    return;
  }
  const first = modeItems()[0];
  state.selectedId = first ? first.id : null;
  renderSuiteList();
  renderDetail();
  renderSummary();
}

function openAiNav() {
  if (state.running) return;
  state.nav = 'aigen';
  closeStepsModal();
  syncAiSystemOptions();
  if (el.aiSystem && state.system) el.aiSystem.value = state.system;
  renderSystemBar();
  renderModeTabs();
  refreshAiStatus();
  renderAiRunStatus();
}

function openXuqiuNav() {
  if (state.running) return;
  state.nav = 'xuqiu';
  closeStepsModal();
  closeSpecEditor();
  renderSystemBar();
  renderModeTabs();
  refreshXuqiuStatus();
  loadXuqiuList();
}

async function setSystem(systemId) {
  if (state.running) return;
  if (!state.systems.some((s) => s.id === systemId)) return;
  state.nav = 'workspace';
  state.system = systemId;
  await loadCatalog();
  const res = await fetch(`/api/current?system=${encodeURIComponent(systemId)}`);
  const cur = await res.json();
  applySnapshot(cur, { render: false, replaceResults: true });
  await loadHistory();
  renderSystemBar();
  setMode(MODE_META[state.mode] ? state.mode : 'smoke');
  if (state.mode === 'stress') {
    clearStressLivePanel({ keepLog: false });
    await loadStressConfig();
    await loadStressHistory();
  }
}

function idsForClientTarget(target) {
  if (target === 'smoke') return state.catalog.smoke.map((x) => x.id);
  if (target === 'crud') return (state.catalog.crud || []).map((x) => x.id);
  if (target === 'e2e') return state.catalog.e2e.map((x) => x.id);
  if (target === 'story') return (state.catalog.story || []).map((x) => x.id);
  if (target === 'all') {
    return [
      ...state.catalog.smoke.map((x) => x.id),
      ...(state.catalog.crud || []).map((x) => x.id),
      ...state.catalog.e2e.map((x) => x.id),
      ...(state.catalog.story || []).map((x) => x.id),
    ];
  }
  if (target.startsWith('module:')) {
    const moduleName = target.slice('module:'.length);
    return state.catalog.smoke.filter((x) => x.module === moduleName).map((x) => x.id);
  }
  if (target.startsWith('crud-module:')) {
    const moduleName = target.slice('crud-module:'.length);
    return (state.catalog.crud || []).filter((x) => x.module === moduleName).map((x) => x.id);
  }
  if (target.startsWith('e2e-module:')) {
    const moduleName = target.slice('e2e-module:'.length);
    return state.catalog.e2e.filter((x) => x.module === moduleName).map((x) => x.id);
  }
  if (target.startsWith('story-module:')) {
    const moduleName = target.slice('story-module:'.length);
    return (state.catalog.story || []).filter((x) => x.module === moduleName).map((x) => x.id);
  }
  return [target];
}

async function loadSystems() {
  const res = await fetch('/api/systems');
  state.systems = await res.json();
}

async function loadMiniappConfig() {
  try {
    const res = await fetch('/api/miniapp-config');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '載入小程序配置失敗');
    state.miniapp = {
      name: data.name || DEFAULT_MINIAPP.name,
      subtitle: data.subtitle || DEFAULT_MINIAPP.subtitle,
      baseURL: data.baseURL || DEFAULT_MINIAPP.baseURL,
    };
    if (el.miniappFileLabel) el.miniappFileLabel.textContent = data.file || 'systems.json';
  } catch {
    state.miniapp = { ...DEFAULT_MINIAPP };
  }
}

async function loadCatalog() {
  const res = await fetch(`/api/catalog?system=${encodeURIComponent(state.system)}`);
  state.catalog = await res.json();
  renderTypeTotals();
}

async function loadState() {
  const res = await fetch('/api/state');
  const data = await res.json();
  if (data.system && state.systems.some((s) => s.id === data.system)) {
    state.system = data.system;
  }
  state.results = data.results || {};
  state.running = !!data.running;
  state.lastRunIds = Array.isArray(data.lastRunIds) ? data.lastRunIds : [];
  state.lastTarget = data.lastTarget || null;
  state.activeRunId = data.runId || null;
  if (Array.isArray(data.log) && data.log.length) {
    el.logView.textContent = data.log.join('\n') + '\n';
    el.logView.scrollTop = el.logView.scrollHeight;
  }
  setBusy(state.running);
}

function runTarget(target) {
  if (state.running) return;
  if (state.es) {
    state.es.close();
    state.es = null;
  }

  state.lastTarget = target;
  state.lastRunIds = idsForClientTarget(target);
  for (const id of state.lastRunIds) {
    state.results[id] = {
      ...(state.results[id] || {}),
      id,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    };
  }

  setBusy(true);
  appendLog(`\n—— [${state.system}] 開始執行：${target} ——`);
  renderSuiteList();
  renderDetail();
  renderSummary();

  const es = new EventSource(
    `/api/run?system=${encodeURIComponent(state.system)}&target=${encodeURIComponent(target)}`,
  );
  state.es = es;

  es.addEventListener('log', (ev) => {
    const data = JSON.parse(ev.data);
    appendLog(data.line);
  });

  es.addEventListener('status', (ev) => {
    const data = JSON.parse(ev.data);
    state.results = data.results || state.results;
    renderSuiteList();
    renderDetail();
    renderSummary();
    if (state.aiLastRunId) renderAiRunStatus();
    // 交給 setBusy 統一改 running／關閉載入圈（勿先改 state.running）
    setBusy(!!data.running);
  });

  es.addEventListener('fail', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      appendLog(`錯誤：${data.message}`);
    } catch {
      // ignore
    }
  });

  es.addEventListener('done', (ev) => {
    const data = JSON.parse(ev.data);
    appendLog(`—— 結束（exit ${data.exitCode}） ——`);
    setBusy(false);
    hideLoading(true);
    es.close();
    state.es = null;
    const ids = state.lastRunIds || [];
    state.activeRunId =
      ids.map((id) => state.results[id]?.runId).find(Boolean) || state.activeRunId;
    if (state.aiLastRunId) renderAiRunStatus();
    if (ids.length === 1) openStepsModal(ids[0]);
    loadHistory();
  });

  es.onerror = () => {
    // 正常結束也會觸發 error；只在仍標記執行中時補收尾
    if (es.readyState === EventSource.CLOSED) {
      if (state.running) {
        appendLog('連線結束（若上方無詳細日誌，請看本次執行結果）');
        setBusy(false);
      }
      hideLoading(true);
      state.es = null;
      return;
    }
    if (state.running) appendLog('日誌連線異常，重試中…');
  };
}

el.historyList?.addEventListener('click', async (ev) => {
  const loadBtn = ev.target.closest('[data-load-run]');
  if (loadBtn) {
    const runId = loadBtn.dataset.loadRun;
    const res = await fetch(`/api/history/${encodeURIComponent(runId)}`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '載入失敗');
      return;
    }
    applySnapshot(data, { replaceResults: false });
    state.exportSelectedIds = [];
    renderHistory();
    return;
  }
  const pdfBtn = ev.target.closest('[data-pdf-run]');
  if (pdfBtn) {
    const runId = pdfBtn.dataset.pdfRun;
    const prev = pdfBtn.textContent;
    pdfBtn.disabled = true;
    pdfBtn.textContent = '匯出中…';
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(runId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取紀錄失敗');
      const ids = (data.ids || Object.keys(data.results || {})).filter((id) => {
        const st = data.results?.[id]?.status;
        return st === 'passed' || st === 'failed' || st === 'skipped';
      });
      if (!ids.length) throw new Error('此紀錄無可匯出結果');
      const out = await fetch(`/api/export-pdf-batch?system=${encodeURIComponent(data.system || state.system)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          runId,
          title: `${targetLabel(data.target)} 歷史報告`,
        }),
      });
      await downloadPdfBlob(out, 'QA-history-report.pdf');
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.textContent = prev || '匯出 PDF';
    }
    return;
  }
  const logBtn = ev.target.closest('[data-log-run]');
  if (logBtn) {
    const runId = logBtn.dataset.logRun;
    const a = document.createElement('a');
    a.href = `/api/history/${encodeURIComponent(runId)}/log`;
    a.download = `${runId}.log.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
});

el.systemBar.addEventListener('click', (ev) => {
  const miniappCfg = ev.target.closest('[data-nav="miniapp-config"]');
  if (miniappCfg) {
    ev.preventDefault();
    openMiniappModal();
    return;
  }
  const aiTab = ev.target.closest('[data-nav="aigen"]');
  if (aiTab) {
    if (state.running) return;
    openAiNav();
    return;
  }
  const xuqiuTab = ev.target.closest('[data-nav="xuqiu"]');
  if (xuqiuTab) {
    if (state.running) return;
    openXuqiuNav();
    return;
  }
  const tab = ev.target.closest('[data-system]');
  if (!tab || state.running) return;
  setSystem(tab.dataset.system);
});

document.querySelector('.mode-bar').addEventListener('click', (ev) => {
  const tab = ev.target.closest('.mode-tab');
  if (!tab || state.running) return;
  setMode(tab.dataset.mode);
});

el.suiteList.addEventListener('click', (ev) => {
  const editBtn = ev.target.closest('[data-edit-spec]');
  if (editBtn) {
    ev.preventDefault();
    ev.stopPropagation();
    const id = editBtn.dataset.editSpec;
    selectItem(id, { openSteps: false });
    openSpecEditor(id);
    return;
  }
  const viewSteps = ev.target.closest('[data-open-steps]');
  if (viewSteps) {
    selectItem(viewSteps.dataset.openSteps, { openSteps: true });
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  const runGroup = ev.target.closest('[data-run-group]');
  if (runGroup) {
    const moduleName = decodeURIComponent(runGroup.dataset.runGroup);
    if (state.mode === 'smoke') runTarget(`module:${moduleName}`);
    else if (state.mode === 'crud') runTarget(`crud-module:${moduleName}`);
    else if (state.mode === 'story') runTarget(`story-module:${moduleName}`);
    else runTarget(`e2e-module:${moduleName}`);
    return;
  }
  const itemBtn = ev.target.closest('[data-id]');
  if (itemBtn) selectItem(itemBtn.dataset.id, { openSteps: true });
});

el.batchList.addEventListener('click', (ev) => {
  if (ev.target.closest('input[data-export-id], .batch-check')) return;
  const row = ev.target.closest('.batch-main, .batch-row');
  if (!row) return;
  const id = row.dataset.id || row.closest('[data-id]')?.dataset.id;
  if (!id) return;
  const item = findItem(id);
  if (item?.kind && item.kind !== state.mode) setMode(item.kind);
  selectItem(id, { openSteps: true });
});

el.batchList.addEventListener('change', (ev) => {
  const input = ev.target.closest('input[data-export-id]');
  if (!input) return;
  const id = input.dataset.exportId;
  const set = new Set(state.exportSelectedIds || []);
  if (input.checked) set.add(id);
  else set.delete(id);
  state.exportSelectedIds = [...set];
  refreshBatchExportUi();
});

function batchIdsByStatus(...statuses) {
  return (state.lastRunIds || []).filter((id) => statuses.includes(statusOf(id)));
}

function selectBatchByStatus(...statuses) {
  state.exportSelectedIds = batchIdsByStatus(...statuses);
  renderBatchBoard();
}

el.chkSelectAllBatch?.addEventListener('change', () => {
  state.exportSelectedIds = el.chkSelectAllBatch.checked
    ? batchIdsByStatus('passed', 'failed', 'skipped')
    : [];
  renderBatchBoard();
});

el.btnSelectPassed?.addEventListener('click', () => selectBatchByStatus('passed'));
el.btnSelectFailed?.addEventListener('click', () => selectBatchByStatus('failed'));
el.btnSelectSkipped?.addEventListener('click', () => selectBatchByStatus('skipped'));
el.btnClearBatchSel?.addEventListener('click', () => {
  state.exportSelectedIds = [];
  renderBatchBoard();
});

el.btnExportSelectedPdf?.addEventListener('click', async () => {
  const ids = state.exportSelectedIds || [];
  if (!ids.length) return;
  const prev = el.btnExportSelectedPdf.textContent;
  el.btnExportSelectedPdf.disabled = true;
  el.btnExportSelectedPdf.textContent = '匯出中…';
  try {
    await exportBatchPdf(ids, `選中 ${ids.length} 項測試報告`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    el.btnExportSelectedPdf.textContent = prev || '匯出選中 PDF';
    refreshBatchExportUi();
  }
});

el.btnExportRunPdf?.addEventListener('click', async () => {
  const ids = (state.lastRunIds || []).filter((id) => {
    const st = statusOf(id);
    return st === 'passed' || st === 'failed' || st === 'skipped';
  });
  if (!ids.length) return;
  const prev = el.btnExportRunPdf.textContent;
  el.btnExportRunPdf.disabled = true;
  el.btnExportRunPdf.textContent = '匯出中…';
  try {
    await exportBatchPdf(ids, `${targetLabel(state.lastTarget)} 測試報告`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    el.btnExportRunPdf.textContent = prev || '一鍵匯出本輪 PDF';
    refreshBatchExportUi();
  }
});

el.btnRunSelected.addEventListener('click', () => {
  if (state.selectedId) runTarget(state.selectedId);
});
el.btnEditSpec?.addEventListener('click', () => openSpecEditor(state.selectedId));
el.btnEditSpecDetail?.addEventListener('click', () => openSpecEditor(state.selectedId));
el.btnEditSpecFromSteps?.addEventListener('click', () => {
  openSpecEditor(state.stepsModalId || state.selectedId);
});
el.btnCloseSpecEditModal?.addEventListener('click', () => closeSpecEditor());
el.btnReloadSpec?.addEventListener('click', () => reloadSpecEditor());
el.btnSaveSpec?.addEventListener('click', () => saveSpecEditor());

el.btnRunType.addEventListener('click', () => {
  if (state.mode === 'stress') return;
  runTarget(state.mode);
});

el.btnAll.addEventListener('click', () => {
  if (state.mode === 'stress') return;
  runTarget('all');
});
el.btnClearLog.addEventListener('click', () => {
  el.logView.textContent = '';
});

function openPathModal() {
  if (state.mode === 'stress') {
    alert('壓力測試場景請編輯 stress/config.json（或執行 npm run stress:capture）');
    return;
  }
  el.pathModal.hidden = false;
  el.pathModalHint.textContent = `目前系統：${currentSystem()?.name || state.system}`;
  state.pathKind =
    state.mode === 'crud' || state.mode === 'e2e' || state.mode === 'story' ? state.mode : 'smoke';
  renderPathKindBar();
  loadPathItems();
}

function closePathModal() {
  el.pathModal.hidden = true;
}

function renderPathKindBar() {
  el.pathKindBar.querySelectorAll('[data-path-kind]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pathKind === state.pathKind);
  });
}

async function loadPathItems() {
  const res = await fetch(
    `/api/fixtures?system=${encodeURIComponent(state.system)}&kind=${encodeURIComponent(state.pathKind)}`,
  );
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '載入失敗');
    return;
  }
  state.pathItems = Array.isArray(data.items) ? structuredClone(data.items) : [];
  state.pathMeta = {
    file: data.file || '',
    checkOptions: data.checkOptions || [],
    specFiles: data.specFiles || [],
  };
  el.pathFileLabel.textContent = data.file || '';
  if (state.pathKind === 'smoke') {
    el.pathNote.textContent =
      '冒煙可直接新增路徑。點「刪除」會立即儲存到 fixture（冒煙無獨立腳本檔）。';
  } else if (state.pathKind === 'crud') {
    el.pathNote.textContent =
      'CRUD 需對應 .spec.ts。點「刪除」會立即儲存；若該腳本無其他引用將一併刪除檔案。';
  } else if (state.pathKind === 'story') {
    el.pathNote.textContent =
      '用戶故事對應 xuqiu 產生的腳本。建議用 node xuqiu/generate-story-tests.js 重新產生；手動刪除會立即儲存。';
  } else {
    el.pathNote.textContent =
      'E2E 需對應 journey 檔。點「刪除」會立即儲存；若該腳本無其他引用將一併刪除檔案。';
  }
  renderPathEditor();
}

function emptyPathItem() {
  if (state.pathKind === 'smoke') {
    return {
      module: '未分類',
      name: '新頁面',
      path: '/',
      checks: state.system === 'pos' ? ['posShell'] : ['pageReady'],
      nav: state.system === 'pos' ? '' : undefined,
    };
  }
  if (state.pathKind === 'crud') {
    const file = state.pathMeta.specFiles[0] || '';
    return {
      id: `crud:new-${Date.now()}`,
      module: '未分類',
      name: '新 CRUD',
      path: '/',
      file,
      description: '',
    };
  }
  if (state.pathKind === 'story') {
    const file = state.pathMeta.specFiles[0] || '';
    return {
      id: `story:US-new-${Date.now()}`,
      storyId: `US-new-${Date.now()}`,
      module: '未分類',
      name: '新用戶故事',
      file,
      description: '',
    };
  }
  const file = state.pathMeta.specFiles[0] || '';
  return {
    id: `e2e:new-${Date.now()}`,
    module: '未分類',
    name: '新 E2E',
    file,
    description: '',
  };
}

function collectPathItemsFromDom() {
  const rows = [...el.pathEditor.querySelectorAll('.path-row')];
  return rows.map((row) => {
    const get = (name) => row.querySelector(`[name="${name}"]`)?.value?.trim() || '';
    if (state.pathKind === 'smoke') {
      const checks = [...row.querySelectorAll('input[type="checkbox"][data-check]:checked')].map(
        (x) => x.dataset.check,
      );
      const item = {
        module: get('module'),
        name: get('name'),
        path: get('path'),
        checks: checks.length ? checks : ['pageReady'],
      };
      const nav = get('nav');
      if (nav) item.nav = nav;
      return item;
    }
    if (state.pathKind === 'crud') {
      return {
        id: get('id'),
        module: get('module'),
        name: get('name'),
        path: get('path'),
        file: get('file'),
        description: get('description'),
      };
    }
    if (state.pathKind === 'story') {
      return {
        id: get('id'),
        storyId: get('storyId') || get('id').replace(/^story:/, ''),
        module: get('module'),
        name: get('name'),
        file: get('file'),
        description: get('description'),
      };
    }
    return {
      id: get('id'),
      module: get('module'),
      name: get('name'),
      file: get('file'),
      description: get('description'),
    };
  });
}

function renderPathEditor() {
  const options = state.pathMeta.checkOptions || [];
  const files = state.pathMeta.specFiles || [];
  el.pathEditor.innerHTML = state.pathItems
    .map((item, index) => {
      if (state.pathKind === 'smoke') {
        const checks = options
          .map((c) => {
            const checked = (item.checks || []).includes(c) ? 'checked' : '';
            return `<label><input type="checkbox" data-check="${c}" ${checked} />${c}</label>`;
          })
          .join('');
        return `
          <div class="path-row" data-index="${index}">
            <div class="path-row-grid">
              <label>模組<input name="module" value="${escapeHtml(item.module || '')}" /></label>
              <label>名稱<input name="name" value="${escapeHtml(item.name || '')}" /></label>
              <label>路徑<input name="path" value="${escapeHtml(item.path || '')}" placeholder="/goods/list" /></label>
              <label>導航（POS 可填）<input name="nav" value="${escapeHtml(item.nav || '')}" placeholder="点单" /></label>
            </div>
            <div>
              <span style="font-size:12px;color:#6a7f92">檢查項</span>
              <div class="checks-box">${checks}</div>
            </div>
            <div class="path-row-actions">
              <button class="btn tiny" type="button" data-remove="${index}">刪除</button>
            </div>
          </div>`;
      }
      const fileOpts = files
        .map((f) => `<option value="${escapeHtml(f)}" ${item.file === f ? 'selected' : ''}>${escapeHtml(f)}</option>`)
        .join('');
      if (state.pathKind === 'crud') {
        return `
          <div class="path-row" data-index="${index}">
            <div class="path-row-grid">
              <label>ID<input name="id" value="${escapeHtml(item.id || '')}" /></label>
              <label>模組<input name="module" value="${escapeHtml(item.module || '')}" /></label>
              <label>名稱<input name="name" value="${escapeHtml(item.name || '')}" /></label>
              <label>路徑<input name="path" value="${escapeHtml(item.path || '')}" /></label>
              <label>測試檔<select name="file">${fileOpts}</select></label>
              <label>說明<input name="description" value="${escapeHtml(item.description || '')}" /></label>
            </div>
            <div class="path-row-actions">
              <button class="btn tiny" type="button" data-remove="${index}">刪除</button>
            </div>
          </div>`;
      }
      if (state.pathKind === 'story') {
        return `
          <div class="path-row" data-index="${index}">
            <div class="path-row-grid">
              <label>ID<input name="id" value="${escapeHtml(item.id || '')}" /></label>
              <label>故事編號<input name="storyId" value="${escapeHtml(item.storyId || '')}" /></label>
              <label>模組<input name="module" value="${escapeHtml(item.module || '')}" /></label>
              <label>名稱<input name="name" value="${escapeHtml(item.name || '')}" /></label>
              <label>測試檔<select name="file">${fileOpts}</select></label>
            </div>
            <label>說明<textarea name="description">${escapeHtml(item.description || '')}</textarea></label>
            <div class="path-row-actions">
              <button class="btn tiny" type="button" data-remove="${index}">刪除</button>
            </div>
          </div>`;
      }
      return `
        <div class="path-row" data-index="${index}">
          <div class="path-row-grid">
            <label>ID<input name="id" value="${escapeHtml(item.id || '')}" /></label>
            <label>模組<input name="module" value="${escapeHtml(item.module || '')}" /></label>
            <label>名稱<input name="name" value="${escapeHtml(item.name || '')}" /></label>
            <label>測試檔<select name="file">${fileOpts}</select></label>
          </div>
          <label>說明<textarea name="description">${escapeHtml(item.description || '')}</textarea></label>
          <div class="path-row-actions">
            <button class="btn tiny" type="button" data-remove="${index}">刪除</button>
          </div>
        </div>`;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function savePathItems(options = {}) {
  const items = collectPathItemsFromDom();
  const res = await fetch(
    `/api/fixtures?system=${encodeURIComponent(state.system)}&kind=${encodeURIComponent(state.pathKind)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '儲存失敗');
    return false;
  }
  if (data.catalog) state.catalog = data.catalog;
  else await loadCatalog();
  setMode(state.mode);
  const deleted = Array.isArray(data.deletedFiles) ? data.deletedFiles : [];
  const delNote = deleted.length ? `；已刪腳本 ${deleted.length} 個：${deleted.join(', ')}` : '';
  appendLog(`已儲存 ${state.pathKind} 路徑 ${data.count} 項 → ${data.file}${delNote}`);
  if (!options.silent) {
    alert(
      deleted.length
        ? `已儲存 ${data.count} 項\n並刪除無引用腳本：\n${deleted.join('\n')}`
        : `已儲存 ${data.count} 項`,
    );
  } else if (deleted.length) {
    alert(`已刪除目錄項並移除腳本：\n${deleted.join('\n')}`);
  }
  await loadPathItems();
  return true;
}

el.btnManagePaths?.addEventListener('click', () => openPathModal());
el.btnClosePathModal?.addEventListener('click', () => closePathModal());
el.btnCloseStepsModal?.addEventListener('click', () => closeStepsModal());
el.stepsModal?.addEventListener('click', (ev) => {
  const shot = ev.target.closest('[data-shot]');
  if (shot) {
    ev.preventDefault();
    ev.stopPropagation();
    openLightbox(shot.dataset.shot, shot.dataset.shotCap || '');
  }
});
el.detailSteps?.addEventListener('click', (ev) => {
  const shot = ev.target.closest('[data-shot]');
  if (!shot) return;
  openLightbox(shot.dataset.shot, shot.dataset.shotCap || '');
});
el.btnCloseLightbox?.addEventListener('click', () => closeLightbox());
el.btnExportPdf?.addEventListener('click', async () => {
  if (!state.stepsModalId || el.btnExportPdf.disabled) return;
  const prev = el.btnExportPdf.textContent;
  el.btnExportPdf.disabled = true;
  el.btnExportPdf.textContent = '匯出中…';
  try {
    const runId =
      state.results[state.stepsModalId]?.runId || state.activeRunId || '';
    const qs = new URLSearchParams({
      system: state.system,
      id: state.stepsModalId,
    });
    if (runId) qs.set('runId', runId);
    const res = await fetch(`/api/export-pdf?${qs.toString()}`);
    await downloadPdfBlob(res, 'QA-report.pdf');
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    el.btnExportPdf.textContent = prev || '匯出 PDF';
    renderStepsModalContent(state.stepsModalId);
  }
});
el.btnRunFromStepsModal?.addEventListener('click', () => {
  if (!state.stepsModalId || state.running) return;
  runTarget(state.stepsModalId);
});
el.pathKindBar?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-path-kind]');
  if (!btn) return;
  state.pathItems = collectPathItemsFromDom();
  state.pathKind = btn.dataset.pathKind;
  renderPathKindBar();
  loadPathItems();
});
el.btnAddPath?.addEventListener('click', () => {
  state.pathItems = collectPathItemsFromDom();
  state.pathItems.push(emptyPathItem());
  renderPathEditor();
});
el.btnReloadPaths?.addEventListener('click', () => loadPathItems());
el.btnSavePaths?.addEventListener('click', () => savePathItems());
el.pathEditor?.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-remove]');
  if (!btn) return;
  const idx = Number(btn.dataset.remove);
  state.pathItems = collectPathItemsFromDom();
  const removed = state.pathItems[idx];
  const label = removed?.name || removed?.path || '此項';
  const fileHint = removed?.file ? `\n對應檔案：${removed.file}` : '';
  if (
    !confirm(
      `確定刪除「${label}」？\n將立即寫入配置；若腳本沒有被其他用例引用，會一併刪除檔案。${fileHint}`,
    )
  ) {
    return;
  }
  state.pathItems.splice(idx, 1);
  renderPathEditor();
  const ok = await savePathItems({ silent: true });
  if (!ok) {
    // 儲存失敗時重新載入，避免畫面與磁碟不一致
    await loadPathItems();
  }
});

function openSystemModal() {
  el.systemModal.hidden = false;
  el.systemModalHint.textContent = `目前系統：${currentSystem()?.name || state.system}`;
  loadSystemConfig();
}

function closeSystemModal() {
  el.systemModal.hidden = true;
}

async function loadSystemConfig() {
  const res = await fetch(`/api/system-config?system=${encodeURIComponent(state.system)}`);
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '載入系統配置失敗');
    return;
  }
  const form = el.systemForm;
  form.name.value = data.name || '';
  form.subtitle.value = data.subtitle || '';
  form.baseURL.value = data.baseURL || '';
  form.loginUser.value = data.loginUser || '';
  form.loginPass.value = data.loginPass || '';
  el.systemFileLabel.textContent = data.file || 'systems.json';
}

async function saveSystemConfig(ev) {
  ev?.preventDefault?.();
  const form = el.systemForm;
  const payload = {
    name: form.name.value.trim(),
    subtitle: form.subtitle.value.trim(),
    baseURL: form.baseURL.value.trim(),
    loginUser: form.loginUser.value.trim(),
    loginPass: form.loginPass.value,
  };
  const res = await fetch(`/api/system-config?system=${encodeURIComponent(state.system)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '儲存失敗');
    return;
  }
  await loadSystems();
  renderSystemBar();
  const note = data.clearedAuth ? '（已清除舊登入狀態）' : '';
  appendLog(`已儲存系統配置 ${state.system} → ${payload.baseURL} ${note}`);
  alert(`系統配置已儲存${note}`);
}

el.btnSystemConfig?.addEventListener('click', () => openSystemModal());
el.btnCloseSystemModal?.addEventListener('click', () => closeSystemModal());
el.btnReloadSystem?.addEventListener('click', () => loadSystemConfig());
el.systemForm?.addEventListener('submit', (ev) => saveSystemConfig(ev));

function fillMiniappForm() {
  const form = el.miniappForm;
  if (!form) return;
  const cfg = state.miniapp || DEFAULT_MINIAPP;
  form.name.value = cfg.name || DEFAULT_MINIAPP.name;
  form.subtitle.value = cfg.subtitle || DEFAULT_MINIAPP.subtitle;
  form.baseURL.value = cfg.baseURL || DEFAULT_MINIAPP.baseURL;
}

function openMiniappModal() {
  if (!el.miniappModal) return;
  el.miniappModal.hidden = false;
  fillMiniappForm();
  loadMiniappConfig().then(() => {
    fillMiniappForm();
    renderSystemBar();
  });
}

function closeMiniappModal() {
  if (el.miniappModal) el.miniappModal.hidden = true;
}

async function saveMiniappConfig(ev) {
  ev?.preventDefault?.();
  const form = el.miniappForm;
  if (!form) return;
  const payload = {
    name: form.name.value.trim(),
    subtitle: form.subtitle.value.trim(),
    baseURL: form.baseURL.value.trim(),
  };
  const res = await fetch('/api/miniapp-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '儲存失敗');
    return;
  }
  state.miniapp = {
    name: data.config?.name || payload.name,
    subtitle: data.config?.subtitle || payload.subtitle,
    baseURL: data.config?.baseURL || payload.baseURL,
  };
  if (el.miniappFileLabel) el.miniappFileLabel.textContent = data.file || 'systems.json';
  renderSystemBar();
  appendLog(`已儲存小程序測試地址 → ${state.miniapp.baseURL}`);
  alert('小程序測試地址已儲存');
  closeMiniappModal();
}

el.btnCloseMiniappModal?.addEventListener('click', () => closeMiniappModal());
el.btnReloadMiniapp?.addEventListener('click', async () => {
  await loadMiniappConfig();
  fillMiniappForm();
  renderSystemBar();
});
el.miniappForm?.addEventListener('submit', (ev) => saveMiniappConfig(ev));

function appendStressLog(line) {
  if (!el.stressLogView) return;
  el.stressLogView.textContent += `${line}\n`;
  el.stressLogView.scrollTop = el.stressLogView.scrollHeight;
}

function refreshStressFormBusy() {
  const busy = !!state.running;
  for (const input of [
    el.stressVus,
    el.stressDuration,
    el.stressRamp,
    el.stressWithUi,
    el.stressUiWorkers,
  ]) {
    if (input) input.disabled = busy;
  }
  el.stressScenarioList?.querySelectorAll('input[type=checkbox]').forEach((c) => {
    c.disabled = busy;
  });
}

function currentStressSystemCfg() {
  return state.stressConfig?.systems?.[state.system] || null;
}

function renderStressScenarios() {
  const cfg = currentStressSystemCfg();
  const scenarios = cfg?.scenarios || [];
  if (el.stressApiBase) {
    el.stressApiBase.textContent = cfg?.apiBase
      ? `apiBase：${cfg.apiBase}`
      : 'apiBase：尚未設定（請執行 npm run stress:capture）';
  }
  if (el.stressScenarioCount) el.stressScenarioCount.textContent = `${scenarios.length} 項`;

  if (!state.stressSelectedIds.length && scenarios.length) {
    state.stressSelectedIds = scenarios.map((s) => s.id);
  }
  state.stressSelectedIds = state.stressSelectedIds.filter((id) =>
    scenarios.some((s) => s.id === id),
  );

  if (!el.stressScenarioList) return;
  if (!scenarios.length) {
    el.stressScenarioList.innerHTML =
      '<p class="batch-empty">此系統尚無壓測場景，請編輯 stress/config.json 或執行 npm run stress:capture</p>';
    return;
  }
  el.stressScenarioList.innerHTML = scenarios
    .map((s) => {
      const checked = state.stressSelectedIds.includes(s.id) ? 'checked' : '';
      return `<label class="stress-scenario">
        <input type="checkbox" data-stress-id="${s.id}" ${checked} ${state.running ? 'disabled' : ''} />
        <span>
          <strong>${s.name || s.id}</strong>
          <em>${s.method || 'GET'} ${s.path}</em>
        </span>
      </label>`;
    })
    .join('');
}

function applyStressDefaultsFromConfig() {
  const d = state.stressConfig?.defaults || {};
  const ui = state.stressConfig?.ui || {};
  if (el.stressVus && d.vus != null) el.stressVus.value = d.vus;
  if (el.stressDuration && d.durationSec != null) el.stressDuration.value = d.durationSec;
  if (el.stressRamp && d.rampUpSec != null) el.stressRamp.value = d.rampUpSec;
  if (el.stressUiWorkers && ui.defaultWorkers != null) el.stressUiWorkers.value = ui.defaultWorkers;
  if (el.stressUiWorkers && ui.maxWorkers != null) el.stressUiWorkers.max = ui.maxWorkers;
}

async function loadStressConfig() {
  try {
    const res = await fetch('/api/stress/config');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '讀取壓測配置失敗');
    state.stressConfig = data;
    state.stressSelectedIds = [];
    applyStressDefaultsFromConfig();
    renderStressScenarios();
  } catch (err) {
    appendStressLog(err.message || String(err));
  }
}

function enrichStressMetrics(m) {
  if (!m || typeof m !== 'object') return m;
  const next = { ...m };
  if (!Array.isArray(next.failByScenario) || !next.failByScenario.length) {
    const by = next.byScenario || {};
    next.failByScenario = Object.entries(by)
      .filter(([, sc]) => Number(sc.fail) > 0)
      .map(([scenarioId, sc]) => ({
        scenarioId,
        fail: sc.fail,
        total: sc.total,
        ok: sc.ok,
        failRate: sc.total ? Number(((sc.fail / sc.total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.fail - a.fail);
  }
  if (!Array.isArray(next.errorGroups)) {
    // 舊結果只有 errors 樣本：聚合成群組
    const map = {};
    for (const e of next.errors || []) {
      const key = `${e.scenarioId}|${e.status}|${e.error || 'unknown'}`;
      if (!map[key]) {
        map[key] = {
          scenarioId: e.scenarioId,
          status: e.status,
          error: e.error || 'unknown',
          count: 0,
          lastMs: e.ms,
        };
      }
      map[key].count += 1;
      map[key].lastMs = e.ms;
    }
    // 若只有樣本，用 failByScenario 補齊「至少 N 次」顯示
    for (const row of next.failByScenario || []) {
      const has = Object.values(map).some((g) => g.scenarioId === row.scenarioId);
      if (!has) {
        map[`agg-${row.scenarioId}`] = {
          scenarioId: row.scenarioId,
          status: '—',
          error: '（舊紀錄未保存完整錯誤類型，僅知失敗次數）',
          count: row.fail,
          lastMs: null,
        };
      } else {
        // 樣本數可能少於真實失敗數：標註
        const groups = Object.values(map).filter((g) => g.scenarioId === row.scenarioId);
        const sampleSum = groups.reduce((s, g) => s + g.count, 0);
        if (sampleSum < row.fail && groups.length === 1) {
          groups[0].count = row.fail;
          groups[0].error = `${groups[0].error}（彙總）`;
        } else if (sampleSum < row.fail) {
          map[`pad-${row.scenarioId}`] = {
            scenarioId: row.scenarioId,
            status: '—',
            error: `其餘未採樣失敗（樣本 ${sampleSum}／實際 ${row.fail}）`,
            count: row.fail - sampleSum,
            lastMs: null,
          };
        }
      }
    }
    next.errorGroups = Object.values(map).sort((a, b) => b.count - a.count);
  }
  return next;
}

function scenarioNameOf(id) {
  const cfg = currentStressSystemCfg();
  return cfg?.scenarios?.find((s) => s.id === id)?.name || id;
}

function buildFailHtml(m) {
  const metrics = enrichStressMetrics(m);
  const fails = metrics.failByScenario || [];
  const groups = metrics.errorGroups || [];
  if (!Number(metrics.fail)) {
    return '<p class="batch-empty">本輪沒有失敗請求。</p>';
  }
  const sceneRows = fails.length
    ? fails
        .map(
          (row) => `<div class="stress-fail-row">
            <div>
              <strong>${scenarioNameOf(row.scenarioId)}</strong>
              <em>${row.scenarioId}</em>
            </div>
            <span class="stress-err">${row.fail} 次失敗</span>
            <span>${row.ok}/${row.total} 成功/總數 · 失敗率 ${row.failRate}%</span>
          </div>`,
        )
        .join('')
    : '<p class="batch-empty">無場景失敗彙總</p>';

  const groupRows = groups.length
    ? groups
        .map(
          (g) => `<div class="stress-fail-row">
            <div>
              <strong>${scenarioNameOf(g.scenarioId)}</strong>
              <em>${g.error}</em>
            </div>
            <span class="stress-err">× ${g.count}</span>
            <span>HTTP ${g.status}${g.lastMs != null ? ` · 最近 ${g.lastMs}ms` : ''}</span>
          </div>`,
        )
        .join('')
    : '<p class="batch-empty">無錯誤類型明細</p>';

  return `
    <div class="stress-fail-section">
      <h4>失敗場景（${fails.length}）</h4>
      ${sceneRows}
    </div>
    <div class="stress-fail-section">
      <h4>錯誤類型彙總（${groups.length}）</h4>
      ${groupRows}
    </div>`;
}

function renderStressFailPanel(m) {
  const metrics = enrichStressMetrics(m);
  if (el.stressFailHint) {
    el.stressFailHint.textContent = metrics.fail
      ? `共 ${metrics.fail} 次失敗 · ${metrics.failByScenario?.length || 0} 個場景`
      : '無失敗';
  }
  if (el.stressFailList) {
    el.stressFailList.innerHTML = buildFailHtml(metrics);
  }
  if (el.mFailHint) {
    el.mFailHint.hidden = !Number(metrics.fail);
    el.mFailHint.textContent = Number(metrics.fail) ? '點擊查看' : '';
  }
  if (el.statFailCard) {
    el.statFailCard.classList.toggle('has-fail', Number(metrics.fail) > 0);
  }
}

function openStressFailModal(m, title) {
  const metrics = enrichStressMetrics(m);
  if (el.stressFailModalTitle) el.stressFailModalTitle.textContent = title || '失敗明細';
  if (el.stressFailModalDesc) {
    el.stressFailModalDesc.textContent = metrics.fail
      ? `共 ${metrics.fail} 次失敗（錯誤率 ${metrics.errorRate ?? '—'}%）`
      : '本輪沒有失敗';
  }
  if (el.stressFailModalBody) el.stressFailModalBody.innerHTML = buildFailHtml(metrics);
  if (el.stressFailModal) el.stressFailModal.hidden = false;
  // 同時展開頁內面板
  if (el.stressFailPanel) el.stressFailPanel.hidden = !Number(metrics.fail);
  renderStressFailPanel(metrics);
}

function closeStressFailModal() {
  if (el.stressFailModal) el.stressFailModal.hidden = true;
}

function renderStressMetrics(m) {
  if (!m) return;
  const metrics = enrichStressMetrics(m);
  state.stressMetrics = metrics;
  if (el.mRps) el.mRps.textContent = String(metrics.rps ?? '—');
  if (el.mTotal) el.mTotal.textContent = String(metrics.total ?? '—');
  if (el.mOk) el.mOk.textContent = String(metrics.ok ?? '—');
  if (el.mFail) el.mFail.textContent = String(metrics.fail ?? '—');
  if (el.mErrRate) el.mErrRate.textContent = metrics.errorRate != null ? `${metrics.errorRate}%` : '—';
  if (el.mP50) el.mP50.textContent = metrics.p50 != null ? `${metrics.p50}ms` : '—';
  if (el.mP95) el.mP95.textContent = metrics.p95 != null ? `${metrics.p95}ms` : '—';
  if (el.mP99) el.mP99.textContent = metrics.p99 != null ? `${metrics.p99}ms` : '—';

  const by = metrics.byScenario || {};
  const rows = Object.entries(by).sort((a, b) => Number(b[1].fail || 0) - Number(a[1].fail || 0));
  if (el.stressDetailHint) {
    el.stressDetailHint.textContent = rows.length ? `${rows.length} 個場景` : '執行中…';
  }
  if (el.stressDetailList) {
    if (!rows.length) {
      el.stressDetailList.innerHTML = '<p class="batch-empty">尚無明細</p>';
    } else {
      el.stressDetailList.innerHTML = `
        <div class="stress-table-head">
          <span>場景</span><span>成功/總數</span><span>失敗</span><span>p50</span><span>p95</span><span>p99</span>
        </div>
        ${rows
          .map(([id, sc]) => {
            const failCls = sc.fail ? 'is-warn' : '';
            const failBtn = sc.fail
              ? `<button type="button" class="linkish stress-fail-link" data-fail-scenario="${id}">${sc.fail}</button>`
              : '0';
            return `<div class="stress-table-row ${failCls}">
              <div class="stress-table-name">
                <strong>${scenarioNameOf(id)}</strong>
                <em>${id}</em>
              </div>
              <span>${sc.ok}/${sc.total}</span>
              <span>${failBtn}</span>
              <span>${sc.p50}ms</span>
              <span>${sc.p95}ms</span>
              <span>${sc.p99}ms</span>
            </div>`;
          })
          .join('')}`;
    }
  }

  renderStressFailPanel(metrics);
  if (el.stressFailPanel) {
    // 有失敗時預設顯示面板，方便直接看
    el.stressFailPanel.hidden = !Number(metrics.fail);
  }
}

function formatStressWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).replace('T', ' ').slice(0, 19);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function systemLabel(id) {
  const s = state.systems.find((x) => x.id === id);
  return s?.name || id || '—';
}

function clearStressLivePanel({ keepLog = false } = {}) {
  state.stressMetrics = null;
  renderStressMetrics({
    rps: 0,
    total: 0,
    ok: 0,
    fail: 0,
    errorRate: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    byScenario: {},
  });
  if (el.stressFailPanel) el.stressFailPanel.hidden = true;
  if (el.stressDetailHint) el.stressDetailHint.textContent = '切換系統後顯示本系統壓測結果';
  if (!keepLog && el.stressLogView) el.stressLogView.textContent = '';
}

async function loadStressHistory() {
  try {
    const res = await fetch(`/api/stress/history?system=${encodeURIComponent(state.system)}`);
    const data = await res.json();
    const items = data.items || [];
    if (!el.stressHistoryList) return;
    if (!items.length) {
      el.stressHistoryList.innerHTML = `<p class="batch-empty">尚無「${systemLabel(state.system)}」壓測紀錄。</p>`;
      return;
    }
    el.stressHistoryList.innerHTML = `
      <div class="stress-hist-head">
        <span>時間</span><span>系統</span><span>VU</span><span>請求</span><span>RPS</span><span>p95</span><span>錯誤率</span><span>狀態</span>
      </div>
      ${items
        .slice(0, 30)
        .map((it) => {
          const when = formatStressWhen(it.finishedAt || it.startedAt);
          const bad = Number(it.fail) > 0 || Number(it.errorRate) > 0;
          const status = it.stopped ? '已停止' : bad ? '有失敗' : '完成';
          const statusCls = it.stopped ? 'skipped' : bad ? 'failed' : 'passed';
          const top = (it.topFails || [])
            .slice(0, 2)
            .map((f) => `${f.scenarioId}:${f.fail}`)
            .join(', ');
          return `<button type="button" class="stress-hist-row ${bad ? 'is-warn' : ''}" data-stress-run="${it.runId || ''}" title="${top ? `主要失敗：${top}` : it.runId || ''}">
            <span class="stress-hist-time">${when}</span>
            <span>${systemLabel(it.system)}</span>
            <span>${it.vus ?? '—'}</span>
            <span>${it.total ?? '—'} <small>(${it.ok ?? 0}/${it.fail ?? 0})</small></span>
            <span>${it.rps ?? '—'}</span>
            <span>${it.p95 != null ? `${it.p95}ms` : '—'}</span>
            <span class="${Number(it.errorRate) > 0 ? 'stress-err' : ''}">${it.errorRate != null ? `${it.errorRate}%` : '—'}</span>
            <span class="pill ${statusCls}">${status}</span>
          </button>`;
        })
        .join('')}`;
  } catch (err) {
    if (el.stressHistoryList) {
      el.stressHistoryList.innerHTML = `<p class="batch-empty">${err.message || err}</p>`;
    }
  }
}

async function openStressRunFailures(runId) {
  if (!runId) return;
  try {
    const res = await fetch(`/api/stress/run/${encodeURIComponent(runId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '讀取失敗明細失敗');
    const metrics = data.failures
      ? {
          ...(data.summary?.metrics || {}),
          fail: data.failures.fail ?? data.summary?.metrics?.fail,
          failByScenario: data.failures.failByScenario,
          errorGroups: data.failures.errorGroups,
          errors: data.failures.errors,
          byScenario: data.summary?.metrics?.byScenario,
        }
      : data.summary?.metrics || {};
    renderStressMetrics({
      ...(data.summary?.metrics || {}),
      ...metrics,
    });
    openStressFailModal(metrics, `失敗明細 · ${runId}`);
  } catch (err) {
    alert(err.message || String(err));
  }
}

async function stopAnyRun() {
  try {
    const res = await fetch('/api/stop', { method: 'POST' });
    const data = await res.json();
    appendLog(data.message || (data.stopped ? '已送出停止請求' : '無法停止'));
    appendStressLog(data.message || (data.stopped ? '已送出停止請求' : '無法停止'));
  } catch (err) {
    alert(err.message || String(err));
  }
}

function startStressRun() {
  if (state.running) return;
  const vus = Number(el.stressVus?.value || 100);
  const duration = Number(el.stressDuration?.value || 60);
  const ramp = Number(el.stressRamp?.value || 10);
  const withUi = !!el.stressWithUi?.checked;
  const uiWorkers = Number(el.stressUiWorkers?.value || 5);
  const scenarios = state.stressSelectedIds || [];
  if (!scenarios.length) {
    alert('請至少選擇一個壓測場景');
    return;
  }

  if (state.es) {
    try {
      state.es.close();
    } catch {
      // ignore
    }
    state.es = null;
  }
  if (state.stressEs) {
    try {
      state.stressEs.close();
    } catch {
      // ignore
    }
  }

  if (el.stressLogView) el.stressLogView.textContent = '';
  renderStressMetrics({
    rps: 0,
    total: 0,
    ok: 0,
    fail: 0,
    errorRate: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    byScenario: {},
  });

  const qs = new URLSearchParams({
    system: state.system,
    vus: String(vus),
    duration: String(duration),
    ramp: String(ramp),
    scenarios: scenarios.join(','),
    withUi: withUi ? '1' : '0',
    uiWorkers: String(uiWorkers),
  });

  setBusy(true);
  appendStressLog(`開始壓測 VU=${vus} duration=${duration}s ramp=${ramp}s scenarios=${scenarios.length}`);

  const es = new EventSource(`/api/stress/run?${qs.toString()}`);
  state.stressEs = es;
  state.es = es;

  es.addEventListener('log', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      appendStressLog(data.line || '');
    } catch {
      appendStressLog(ev.data);
    }
  });
  es.addEventListener('stress-metrics', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      renderStressMetrics(data);
    } catch {
      // ignore
    }
  });
  es.addEventListener('stress-done', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.metrics) renderStressMetrics(data.metrics);
      appendStressLog('壓測完成');
    } catch {
      // ignore
    }
  });
  es.addEventListener('fail', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      appendStressLog(`失敗：${data.message}`);
    } catch {
      appendStressLog(ev.data);
    }
  });
  es.addEventListener('done', () => {
    setBusy(false);
    hideLoading(true);
    es.close();
    state.stressEs = null;
    state.es = null;
    loadStressHistory();
  });
  es.onerror = () => {
    if (state.running) {
      appendStressLog('連線結束');
      setBusy(false);
    } else {
      setBusy(false);
    }
    hideLoading(true);
    try {
      es.close();
    } catch {
      // ignore
    }
    state.stressEs = null;
    if (state.es === es) state.es = null;
    loadStressHistory();
  };
}

el.btnStressStart?.addEventListener('click', () => startStressRun());
el.btnStressStop?.addEventListener('click', () => stopAnyRun());
el.btnStopRun?.addEventListener('click', () => stopAnyRun());
el.btnClearStressLog?.addEventListener('click', () => {
  if (el.stressLogView) el.stressLogView.textContent = '';
});
el.stressScenarioList?.addEventListener('change', (ev) => {
  const input = ev.target.closest('input[data-stress-id]');
  if (!input) return;
  const id = input.dataset.stressId;
  const set = new Set(state.stressSelectedIds || []);
  if (input.checked) set.add(id);
  else set.delete(id);
  state.stressSelectedIds = [...set];
});

el.statFailCard?.addEventListener('click', () => {
  if (!state.stressMetrics || !Number(state.stressMetrics.fail)) return;
  openStressFailModal(state.stressMetrics, '本輪失敗明細');
});

el.btnCloseStressFailModal?.addEventListener('click', () => closeStressFailModal());

el.stressDetailList?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-fail-scenario]');
  if (!btn || !state.stressMetrics) return;
  const sid = btn.dataset.failScenario;
  const m = enrichStressMetrics(state.stressMetrics);
  const filtered = {
    ...m,
    failByScenario: (m.failByScenario || []).filter((x) => x.scenarioId === sid),
    errorGroups: (m.errorGroups || []).filter((x) => x.scenarioId === sid),
    errors: (m.errors || []).filter((x) => x.scenarioId === sid),
    fail: m.byScenario?.[sid]?.fail || 0,
    errorRate: m.byScenario?.[sid]
      ? Number((((m.byScenario[sid].fail || 0) / (m.byScenario[sid].total || 1)) * 100).toFixed(2))
      : m.errorRate,
  };
  openStressFailModal(filtered, `失敗明細 · ${scenarioNameOf(sid)}`);
});

el.stressHistoryList?.addEventListener('click', (ev) => {
  const row = ev.target.closest('[data-stress-run]');
  if (!row) return;
  openStressRunFailures(row.dataset.stressRun);
});

async function refreshAiStatus() {
  if (!el.aiStatusBanner) return;
  try {
    const res = await fetch('/api/ai/status');
    const data = await res.json();
    const ok = !!data.configured;
    el.aiStatusBanner.className = ok ? 'stress-warn aigen-ok' : 'stress-warn';
    if (ok) {
      el.aiStatusBanner.innerHTML = `已配置 <strong>${escapeHtml(data.providerName || data.provider)}</strong> · ${escapeHtml(
        data.model,
      )}（${escapeHtml(data.baseURL)}）— ${escapeHtml(data.hint)}。可點「AI 配置」修改。`;
    } else {
      el.aiStatusBanner.innerHTML = `${escapeHtml(data.hint)}。<button type="button" class="linkish" id="aiStatusOpenCfg">立即配置</button>`;
      document.getElementById('aiStatusOpenCfg')?.addEventListener('click', () => openAiConfigModal());
    }
  } catch (err) {
    el.aiStatusBanner.className = 'stress-warn';
    el.aiStatusBanner.textContent = `無法取得 AI 狀態：${err.message || err}`;
  }
}

function applyProviderPreset(providerId, { force = false } = {}) {
  const p = (state.aiProviders || []).find((x) => x.id === providerId);
  if (!p) return;
  if (force || !el.aiCfgBaseURL.value) el.aiCfgBaseURL.value = p.baseURL || '';
  if (force || !el.aiCfgModel.value) el.aiCfgModel.value = p.model || '';
  if (el.aiCfgJsonMode) el.aiCfgJsonMode.checked = !!p.jsonMode;
  if (el.aiCfgModelList) {
    el.aiCfgModelList.innerHTML = (p.models || [])
      .map((m) => `<option value="${escapeHtml(m)}"></option>`)
      .join('');
  }
  if (el.aiConfigModalHint) {
    el.aiConfigModalHint.textContent = p.hint
      ? `${p.name} · ${p.hint}`
      : '選擇廠商並填寫 Key，儲存至 qa-data/ai-config.json';
  }
}

function fillAiConfigForm(payload) {
  const providers = payload.providers || [];
  state.aiProviders = providers;
  const cfg = payload.config || {};
  if (el.aiCfgProvider) {
    el.aiCfgProvider.innerHTML = providers
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
      .join('');
    el.aiCfgProvider.value = cfg.provider || 'deepseek';
  }
  if (el.aiCfgBaseURL) el.aiCfgBaseURL.value = cfg.baseURL || '';
  if (el.aiCfgModel) el.aiCfgModel.value = cfg.model || '';
  if (el.aiCfgApiKey) el.aiCfgApiKey.value = '';
  if (el.aiCfgTemperature) el.aiCfgTemperature.value = String(cfg.temperature ?? 0.2);
  if (el.aiCfgJsonMode) el.aiCfgJsonMode.checked = cfg.jsonMode !== false;
  if (el.aiCfgKeyHint) {
    el.aiCfgKeyHint.textContent = cfg.hasKey
      ? `已保存 Key：${cfg.apiKeyMasked || '••••'}（留空不變更）`
      : '尚未設定 Key';
  }
  if (el.aiCfgFileLabel) {
    el.aiCfgFileLabel.textContent = payload.status?.configFile || 'qa-data/ai-config.json';
  }
  applyProviderPreset(el.aiCfgProvider?.value || cfg.provider, { force: false });
  // 以已存值為準覆蓋 preset 預設
  if (el.aiCfgBaseURL && cfg.baseURL) el.aiCfgBaseURL.value = cfg.baseURL;
  if (el.aiCfgModel && cfg.model) el.aiCfgModel.value = cfg.model;
  if (el.aiCfgJsonMode && cfg.jsonMode !== undefined) el.aiCfgJsonMode.checked = !!cfg.jsonMode;
}

async function loadAiConfigForm() {
  const res = await fetch('/api/ai/config');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  fillAiConfigForm(data);
}

async function openAiConfigModal() {
  if (!el.aiConfigModal) return;
  el.aiConfigModal.hidden = false;
  try {
    await loadAiConfigForm();
  } catch (err) {
    alert(err.message || String(err));
  }
}

function closeAiConfigModal() {
  if (el.aiConfigModal) el.aiConfigModal.hidden = true;
}

async function saveAiConfigForm(ev) {
  ev?.preventDefault?.();
  const payload = {
    provider: el.aiCfgProvider?.value || 'custom',
    baseURL: el.aiCfgBaseURL?.value || '',
    model: el.aiCfgModel?.value || '',
    apiKey: el.aiCfgApiKey?.value || '',
    temperature: Number(el.aiCfgTemperature?.value || 0.2),
    jsonMode: !!el.aiCfgJsonMode?.checked,
  };
  try {
    const res = await fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    fillAiConfigForm(data);
    await refreshAiStatus();
    appendLog(`\n—— [AI] 已儲存配置：${data.status?.providerName || payload.provider} / ${payload.model} ——`);
    alert('AI 配置已儲存');
    closeAiConfigModal();
  } catch (err) {
    alert(err.message || String(err));
  }
}

function renderAiPreview(draft) {
  state.aiDraft = draft;
  if (!el.aiPreviewWrap) return;
  el.aiPreviewWrap.hidden = false;
  const modeLabel = draft.mode === 'ai' ? `AI（${draft.model || 'model'}）` : '本地模板';
  el.aiPreviewMeta.textContent = `${modeLabel} · ${draft.kind} · ${draft.system}`;
  const rows = [
    ['ID', draft.id],
    ['模組', draft.module],
    ['名稱', draft.name],
    ['說明', draft.description],
    ['檔案', draft.relFile || '（冒煙僅寫 fixture）'],
    ['Fixture', draft.fixtureRel],
  ];
  if (draft.kind === 'smoke' && draft.smokeEntry) {
    rows.push(['路徑', draft.smokeEntry.path]);
    rows.push(['檢查', (draft.smokeEntry.checks || []).join(', ')]);
  }
  if (draft.notice) rows.push(['提示', draft.notice]);
  if (draft.warning) rows.push(['警告', draft.warning]);
  el.aiPreviewFields.innerHTML = rows
    .map(
      ([k, v]) =>
        `<div class="aigen-field"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v ?? '—'))}</strong></div>`,
    )
    .join('');
  el.aiSpecSource.value = draft.specSource || '';
  el.aiSpecSource.disabled = draft.kind === 'smoke';
  el.aiSaveHint.textContent =
    draft.kind === 'smoke'
      ? '冒煙類型將寫入 modules fixture（路徑目錄），不產生 .spec.ts。可「寫入並立即執行」。'
      : `確認後寫入 ${draft.relFile}，並更新 ${draft.fixtureRel}。也可直接「寫入並立即執行」查看結果。`;
  if (el.aiRunResult) el.aiRunResult.hidden = true;
  if (el.btnAiViewResult) el.btnAiViewResult.hidden = true;
  state.aiLastRunId = null;
  renderAiRunStatus();
}

function resolveAiRunId(draft, saveData) {
  if (!draft) return null;
  if (draft.kind === 'smoke' && draft.smokeEntry?.path) return `smoke:${draft.smokeEntry.path}`;
  return saveData?.id || draft.id || null;
}

function renderAiRunStatus() {
  if (!el.aiRunStatus) return;
  const id = state.aiLastRunId;
  if (!id) {
    el.aiRunStatus.innerHTML = '—';
    if (el.btnAiViewResult) el.btnAiViewResult.hidden = true;
    return;
  }
  const st = statusOf(id);
  const item = findItem(id);
  const err = state.results[id]?.error;
  el.aiRunStatus.innerHTML = `
    <span class="pill ${st}">${statusLabel(st)}</span>
    <strong>${escapeHtml(item?.name || id)}</strong>
    <span class="path-file">${escapeHtml(item?.path || item?.file || id)}</span>
    ${err ? `<em class="stress-err">${escapeHtml(err)}</em>` : ''}
  `;
  if (el.aiRunResult) el.aiRunResult.hidden = false;
  if (el.btnAiViewResult) {
    el.btnAiViewResult.hidden = !(st === 'passed' || st === 'failed' || st === 'skipped');
  }
}

async function saveAiDraft(options = {}) {
  if (!state.aiDraft) {
    alert('請先生成草稿');
    return null;
  }
  const draft = {
    ...state.aiDraft,
    specSource: el.aiSpecSource?.value ?? state.aiDraft.specSource,
  };
  if (draft.kind !== 'smoke') {
    draft.specSource = String(draft.specSource || '').trim();
    if (draft.specSource.length < 40) {
      alert('腳本內容過短，請完善後再儲存');
      return null;
    }
  }
  if (el.btnAiSave) el.btnAiSave.disabled = true;
  if (el.btnAiRun) el.btnAiRun.disabled = true;
  if (!options.keepLoading) showLoading('正在寫入測試腳本…');
  try {
    const res = await fetch('/api/ai/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft,
        overwrite: !!el.aiOverwrite?.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const runId = resolveAiRunId(draft, data);
    state.aiDraft = { ...draft, id: runId || draft.id };
    el.aiSaveHint.textContent = data.writtenFile
      ? `已寫入 ${data.writtenFile}，並更新 ${data.fixtureRel}`
      : `已更新 fixture ${data.fixtureRel}`;
    appendLog(`\n—— [AI] 已寫入系統：${data.name || draft.name} ——`);
    // 目錄以目標系統為準
    if (draft.system && draft.system !== state.system) {
      state.system = draft.system;
    }
    await loadCatalog();
    if (!options.silent) {
      const kind = draft.kind;
      const targetSystem = draft.system;
      alert(
        `已儲存。可切換到「${targetSystem === 'pos' ? 'POS 收銀' : '後台管理'}」的「${
          kind === 'smoke' ? '冒煙' : kind === 'crud' ? 'CRUD' : 'E2E'
        }」執行，或點「寫入並立即執行」。`,
      );
    }
    return { ok: true, draft: state.aiDraft, data, runId };
  } catch (err) {
    alert(err.message || String(err));
    return null;
  } finally {
    if (!options.keepLoading) hideLoading();
    if (el.btnAiSave) el.btnAiSave.disabled = false;
    if (el.btnAiRun) el.btnAiRun.disabled = false;
  }
}

/** 寫入後切到對應類型並立即執行，結束後彈出步驟結果（與冒煙／CRUD 相同） */
async function runAiDraftNow() {
  if (state.running) {
    alert('已有測試正在執行，請稍候');
    return;
  }
  if (!state.aiDraft) {
    alert('請先生成草稿');
    return;
  }
  showLoading('正在寫入並準備執行…');
  const saved = await saveAiDraft({ silent: true, keepLoading: true });
  if (!saved?.ok || !saved.runId) {
    hideLoading(true);
    return;
  }

  const draft = saved.draft;
  const runId = saved.runId;
  const kind = draft.kind === 'smoke' || draft.kind === 'crud' || draft.kind === 'e2e' ? draft.kind : 'e2e';

  try {
    if (draft.system && state.systems.some((s) => s.id === draft.system)) {
      state.system = draft.system;
    }
    await loadCatalog();
    const exists = findItem(runId) || allItems().find((x) => x.id === runId);
    if (!exists) {
      hideLoading(true);
      alert(`已寫入，但目錄中找不到可執行項：${runId}`);
      return;
    }

    state.aiLastRunId = runId;
    state.nav = 'workspace';
    state.mode = kind;
    state.selectedId = runId;
    closeStepsModal();
    renderSystemBar();
    renderModeTabs();
    setBusy(!!state.running);
    renderSuiteList();
    renderDetail();
    renderSummary();
    renderAiRunStatus();

    // 真正開跑（會再顯示「正在執行測試」）
    hideLoading(true);
    runTarget(runId);
  } catch (err) {
    hideLoading(true);
    alert(err.message || String(err));
  }
}

async function generateAiDraft() {
  const requirement = stripPlaywrightGenInstruction(String(el.aiRequirement?.value || '').trim());
  if (!requirement) {
    alert('請先填寫測試需求');
    return;
  }
  if (el.aiRequirement) el.aiRequirement.value = requirement;
  if (el.btnAiGenerate) el.btnAiGenerate.disabled = true;
  showLoading('AI 正在生成草稿…');
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: el.aiSystem?.value || state.system,
        kind: el.aiKind?.value || 'e2e',
        requirement,
        module: el.aiModule?.value || '',
        name: el.aiName?.value || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    renderAiPreview(data.draft);
    appendLog(`\n—— [AI] 已生成草稿：${data.draft.name} (${data.draft.mode}) ——`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
    if (el.btnAiGenerate) el.btnAiGenerate.disabled = false;
  }
}

el.btnAiGenerate?.addEventListener('click', () => generateAiDraft());
el.btnAiSave?.addEventListener('click', () => saveAiDraft());
el.btnAiRun?.addEventListener('click', () => runAiDraftNow());
el.btnAiViewResult?.addEventListener('click', () => {
  if (state.aiLastRunId) openStepsModal(state.aiLastRunId);
});
el.btnAiReloadStatus?.addEventListener('click', () => refreshAiStatus());
el.btnAiConfig?.addEventListener('click', () => openAiConfigModal());
el.btnCloseAiConfigModal?.addEventListener('click', () => closeAiConfigModal());
el.btnReloadAiConfig?.addEventListener('click', () => loadAiConfigForm().catch((e) => alert(e.message || e)));
el.aiConfigForm?.addEventListener('submit', (ev) => saveAiConfigForm(ev));
el.aiCfgProvider?.addEventListener('change', () => {
  applyProviderPreset(el.aiCfgProvider.value, { force: true });
});
el.aiKind?.addEventListener('change', () => {
  if (state.aiDraft && el.aiSpecSource) {
    el.aiSpecSource.disabled = el.aiKind.value === 'smoke';
  }
});

async function refreshXuqiuStatus() {
  if (!el.xuqiuStatusBanner) return;
  try {
    const res = await fetch('/api/xuqiu/status');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    el.xuqiuStatusBanner.className = 'stress-warn xuqiu-ok';
    el.xuqiuStatusBanner.textContent = `資料庫 ${data.dbFile} · 用戶故事 ${data.stories} · 功能任務 ${data.tasks}`;
  } catch (err) {
    el.xuqiuStatusBanner.className = 'stress-warn';
    el.xuqiuStatusBanner.textContent = `需求庫載入失敗：${err.message || err}`;
  }
}

function renderXuqiuTabs() {
  el.xuqiuTabBar?.querySelectorAll('[data-xuqiu-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.xuqiuTab === state.xuqiuTab);
  });
  if (el.xuqiuListTitle) {
    el.xuqiuListTitle.textContent = state.xuqiuTab === 'tasks' ? '功能任務' : '用戶故事';
  }
  if (el.btnXuqiuCreate) {
    el.btnXuqiuCreate.textContent = state.xuqiuTab === 'tasks' ? '新增任務' : '新增故事';
  }
  if (el.btnXuqiuGenTest) {
    el.btnXuqiuGenTest.hidden = state.xuqiuTab !== 'stories';
    el.btnXuqiuGenTest.disabled = state.xuqiuTab !== 'stories';
  }
}

async function loadXuqiuList() {
  renderXuqiuTabs();
  const q = el.xuqiuSearch?.value?.trim() || '';
  showLoading('載入需求庫…');
  try {
    const path =
      state.xuqiuTab === 'tasks'
        ? `/api/xuqiu/tasks?limit=300&q=${encodeURIComponent(q)}`
        : `/api/xuqiu/stories?limit=300&q=${encodeURIComponent(q)}`;
    const res = await fetch(path);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    state.xuqiuItems = data.items || [];
    if (el.xuqiuListCount) el.xuqiuListCount.textContent = String(data.total || 0);
    renderXuqiuList();
    if (state.xuqiuSelectedId) {
      const still = state.xuqiuItems.some((x) => x.id === state.xuqiuSelectedId);
      if (still) await selectXuqiuItem(state.xuqiuSelectedId);
      else {
        state.xuqiuSelectedId = null;
        renderXuqiuBlankForm();
      }
    } else {
      renderXuqiuBlankForm();
    }
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

function renderXuqiuList() {
  if (!el.xuqiuList) return;
  if (!state.xuqiuItems.length) {
    el.xuqiuList.innerHTML = '<p class="batch-empty">尚無資料。可點「重新匯入 CSV」或「新增」。</p>';
    return;
  }
  if (state.xuqiuTab === 'tasks') {
    el.xuqiuList.innerHTML = state.xuqiuItems
      .map((item) => {
        const active = state.xuqiuSelectedId === item.id ? 'active' : '';
        return `<button class="xuqiu-item ${active}" type="button" data-xuqiu-id="${item.id}">
          <strong>${escapeHtml(item.work_item_code || item.feature_key || `#${item.id}`)} · ${escapeHtml(
            item.title,
          )}</strong>
          <span>${escapeHtml(item.state || '')} · ${escapeHtml(item.assigned_to || '未指派')}</span>
        </button>`;
      })
      .join('');
    return;
  }
  el.xuqiuList.innerHTML = state.xuqiuItems
    .map((item) => {
      const active = state.xuqiuSelectedId === item.id ? 'active' : '';
      return `<button class="xuqiu-item ${active}" type="button" data-xuqiu-id="${item.id}">
        <strong>${escapeHtml(item.seq || '')} ${escapeHtml(item.story_id)}</strong>
        <span>${escapeHtml(item.description || '')} · 關聯任務 ${item.task_count ?? 0}</span>
      </button>`;
    })
    .join('');
}

function renderXuqiuBlankForm(isNew = false) {
  if (!el.xuqiuForm) return;
  state.xuqiuSelectedId = isNew ? null : state.xuqiuSelectedId;
  state.xuqiuRelatedCache = null;
  if (el.xuqiuEditorTitle) el.xuqiuEditorTitle.textContent = isNew ? '新增' : '編輯';
  if (el.btnXuqiuSave) el.btnXuqiuSave.disabled = false;
  if (el.btnXuqiuDelete) el.btnXuqiuDelete.disabled = !state.xuqiuSelectedId;
  if (el.btnXuqiuGenTest) {
    el.btnXuqiuGenTest.disabled = state.xuqiuTab !== 'stories';
    el.btnXuqiuGenTest.hidden = state.xuqiuTab !== 'stories';
  }
  setXuqiuRelatedButtons(false);
  if (state.xuqiuTab === 'tasks') {
    el.xuqiuForm.innerHTML = `
      <label>標題（建議含編號）<input name="title" value="" placeholder="5.1.1.1 (UL-001) 微信授权登录" /></label>
      <label>feature_key<input name="feature_key" value="" placeholder="5.1.1.1" /></label>
      <label>工作項代碼<input name="work_item_code" value="" placeholder="UL-001" /></label>
      <label>說明<textarea name="description" rows="3"></textarea></label>
      <label>類型<input name="work_item_type" value="Task" /></label>
      <label>Area Path<input name="area_path" value="Peterson" /></label>
      <label>Iteration<input name="iteration_path" value="" /></label>
      <label>指派<input name="assigned_to" value="" /></label>
      <label>狀態<input name="state" value="New" /></label>
    `;
    renderXuqiuRelatedEmpty(isNew ? '新增後可查看關聯' : '選擇左側項目後，下方會顯示關聯資料');
  } else {
    el.xuqiuForm.innerHTML = `
      <label>序號<input name="seq" value="" placeholder="001" /></label>
      <label>用戶故事編號<input name="story_id" value="" placeholder="US-5.1.1.1" /></label>
      <label>feature_key<input name="feature_key" value="" placeholder="自動由 US- 推導，可覆寫" /></label>
      <label>描述<textarea name="description" rows="4"></textarea></label>
    `;
    renderXuqiuStoryTaskEditor([], {
      hint: isNew
        ? '可在此直接新增功能任務，儲存故事時一併寫入'
        : '可編輯關聯功能任務，儲存時一併更新',
    });
  }
}

function setXuqiuRelatedButtons(enabled) {
  if (el.btnXuqiuShowRelated2) el.btnXuqiuShowRelated2.disabled = !enabled;
}

function setXuqiuStoryTaskEditorMode(active) {
  if (el.btnXuqiuAddTaskRow) el.btnXuqiuAddTaskRow.hidden = !active;
  if (el.btnXuqiuShowRelated2) el.btnXuqiuShowRelated2.hidden = !!active;
}

function renderXuqiuRelatedEmpty(msg) {
  state.xuqiuRelatedCache = null;
  setXuqiuStoryTaskEditorMode(false);
  if (el.xuqiuRelatedTitle) el.xuqiuRelatedTitle.textContent = '關聯資料';
  if (el.xuqiuRelatedHint) el.xuqiuRelatedHint.textContent = msg || '尚未選擇';
  if (el.xuqiuRelatedList) {
    el.xuqiuRelatedList.innerHTML = `<p class="batch-empty">${escapeHtml(msg || '尚未選擇項目')}</p>`;
  }
  setXuqiuRelatedButtons(false);
}

function buildXuqiuTaskDraftHtml(task = {}) {
  const id = task.id ? String(task.id) : '';
  return `
    <article class="xuqiu-task-draft" data-task-id="${escapeHtml(id)}">
      <div class="xuqiu-task-draft-head">
        <strong>${id ? `任務 #${escapeHtml(id)}` : '新任務'}</strong>
        <button class="btn tiny ghost danger" type="button" data-remove-task>移除</button>
      </div>
      <label>標題（必填）<input data-field="title" value="${escapeHtml(task.title || '')}" placeholder="5.1.1.1 (UL-001) 功能說明" /></label>
      <div class="xuqiu-task-draft-grid">
        <label>工作項代碼<input data-field="work_item_code" value="${escapeHtml(task.work_item_code || '')}" placeholder="UL-001" /></label>
        <label>狀態<input data-field="state" value="${escapeHtml(task.state || 'New')}" placeholder="New" /></label>
        <label>指派<input data-field="assigned_to" value="${escapeHtml(task.assigned_to || '')}" placeholder="負責人" /></label>
      </div>
      <label>說明<textarea data-field="description" rows="2">${escapeHtml(task.description || '')}</textarea></label>
    </article>`;
}

function renderXuqiuStoryTaskEditor(tasks, { hint } = {}) {
  const items = Array.isArray(tasks) ? tasks : [];
  setXuqiuStoryTaskEditorMode(true);
  if (el.xuqiuRelatedTitle) el.xuqiuRelatedTitle.textContent = `關聯功能任務（${items.length}）`;
  if (el.xuqiuRelatedHint) {
    el.xuqiuRelatedHint.textContent = hint || '儲存用戶故事時會一併新增／更新這些任務';
  }
  if (el.xuqiuRelatedList) {
    el.xuqiuRelatedList.innerHTML = items.length
      ? items.map((t) => buildXuqiuTaskDraftHtml(t)).join('')
      : `<p class="batch-empty">尚未加入功能任務，可點右上角「＋ 新增任務」</p>`;
  }
  state.xuqiuRelatedCache = {
    subject: 'story-task-editor',
    label: '關聯功能任務',
    relatedKind: 'tasks',
    items,
    featureKey: '',
  };
  setXuqiuRelatedButtons(false);
}

function addXuqiuTaskDraftRow(task = {}) {
  if (!el.xuqiuRelatedList) return;
  const empty = el.xuqiuRelatedList.querySelector('.batch-empty');
  if (empty) empty.remove();
  el.xuqiuRelatedList.insertAdjacentHTML('beforeend', buildXuqiuTaskDraftHtml(task));
  const count = el.xuqiuRelatedList.querySelectorAll('.xuqiu-task-draft').length;
  if (el.xuqiuRelatedTitle) el.xuqiuRelatedTitle.textContent = `關聯功能任務（${count}）`;
}

function readXuqiuStoryTaskDrafts() {
  if (!el.xuqiuRelatedList) return [];
  return [...el.xuqiuRelatedList.querySelectorAll('.xuqiu-task-draft')]
    .map((row) => {
      const get = (field) => row.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
      const id = Number(row.dataset.taskId || 0);
      const title = get('title');
      if (!title) return null;
      return {
        ...(id > 0 ? { id } : {}),
        title,
        work_item_code: get('work_item_code'),
        description: get('description'),
        assigned_to: get('assigned_to'),
        state: get('state') || 'New',
        work_item_type: 'Task',
      };
    })
    .filter(Boolean);
}

function buildXuqiuRelatedHtml(kind, items) {
  if (!items.length) {
    return `<p class="batch-empty">${kind === 'tasks' ? '尚無關聯功能任務' : '尚無關聯用戶故事'}</p>`;
  }
  if (kind === 'tasks') {
    return items
      .map(
        (t) => `
      <article class="xuqiu-related-card">
        <header>
          <strong>${escapeHtml(t.work_item_code || t.feature_key || `#${t.id}`)}</strong>
          <span class="pill idle">${escapeHtml(t.state || '—')}</span>
        </header>
        <p class="xuqiu-related-title">${escapeHtml(t.title || '')}</p>
        <p class="xuqiu-related-desc">${escapeHtml(t.description || '（無說明）')}</p>
        <p class="xuqiu-related-meta">feature_key：${escapeHtml(t.feature_key || '—')} · 指派：${escapeHtml(
          t.assigned_to || '未指派',
        )} · ${escapeHtml(t.iteration_path || '')}</p>
      </article>`,
      )
      .join('');
  }
  return items
    .map(
      (s) => `
    <article class="xuqiu-related-card">
      <header>
        <strong>${escapeHtml(s.seq || '')} ${escapeHtml(s.story_id || '')}</strong>
        <span class="path-file">${escapeHtml(s.feature_key || '')}</span>
      </header>
      <p class="xuqiu-related-desc">${escapeHtml(s.description || '（無描述）')}</p>
    </article>`,
    )
    .join('');
}

function applyXuqiuRelated(data) {
  const isTaskTab = state.xuqiuTab === 'tasks';
  if (!isTaskTab) {
    renderXuqiuStoryTaskEditor(data.tasks || [], {
      hint: `${data.story_id || ''} · feature_key=${data.feature_key || '—'}（儲存時一併更新）`,
    });
    return;
  }

  const items = data.stories || [];
  const relatedKind = 'stories';
  const subject = `${data.work_item_code || data.feature_key || ''} ${data.title || ''}`.trim();
  const label = '關聯用戶故事';

  setXuqiuStoryTaskEditorMode(false);
  state.xuqiuRelatedCache = {
    subject,
    label,
    relatedKind,
    items,
    featureKey: data.feature_key || '',
  };

  if (el.xuqiuRelatedTitle) el.xuqiuRelatedTitle.textContent = `${label}（${items.length}）`;
  if (el.xuqiuRelatedHint) {
    el.xuqiuRelatedHint.textContent = subject
      ? `${subject} · feature_key=${data.feature_key || '—'}`
      : `feature_key=${data.feature_key || '—'}`;
  }
  if (el.xuqiuRelatedList) el.xuqiuRelatedList.innerHTML = buildXuqiuRelatedHtml(relatedKind, items);
  setXuqiuRelatedButtons(true);
}

function openXuqiuRelatedModal() {
  const cache = state.xuqiuRelatedCache;
  if (!cache || !el.xuqiuRelatedModal) {
    alert('請先選擇一條用戶故事或功能任務');
    return;
  }
  if (el.xuqiuRelatedModalTitle) {
    el.xuqiuRelatedModalTitle.textContent = `${cache.label}（${cache.items.length}）`;
  }
  if (el.xuqiuRelatedModalHint) {
    el.xuqiuRelatedModalHint.textContent = `${cache.subject || '—'} · feature_key=${cache.featureKey || '—'}`;
  }
  if (el.xuqiuRelatedModalBody) {
    el.xuqiuRelatedModalBody.innerHTML = buildXuqiuRelatedHtml(cache.relatedKind, cache.items);
  }
  document.body.appendChild(el.xuqiuRelatedModal);
  el.xuqiuRelatedModal.hidden = false;
}

function closeXuqiuRelatedModal() {
  if (el.xuqiuRelatedModal) el.xuqiuRelatedModal.hidden = true;
}

function stripPlaywrightGenInstruction(text) {
  return String(text || '')
    .replace(/(?:\r?\n\s*)*請依上述內容，用 Playwright 產出一份可執行的自動化測試腳本。\s*$/u, '')
    .trim();
}

function inferXuqiuTestSystem(storyId) {
  const id = String(storyId || '').toUpperCase();
  if (id.startsWith('US-6') || id.startsWith('6.')) return 'pos';
  return 'admin';
}

function cleanXuqiuTaskLabel(title) {
  return String(title || '')
    .replace(/^\d+(?:\.\d+)*\s*/, '')
    .replace(/\(([A-Z]{1,5}-\d+)\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildXuqiuStoryRequirement() {
  const form = readXuqiuForm();
  const desc = String(form.description || '').trim();
  const tasks = Array.isArray(form.tasks) ? form.tasks : readXuqiuStoryTaskDrafts();
  const lines = [];
  if (desc) lines.push(desc);
  const taskLines = [];
  for (const t of tasks) {
    const title = cleanXuqiuTaskLabel(t.title);
    const body = String(t.description || '').trim();
    if (title && body) taskLines.push(`- ${title}：${body}`);
    else if (title) taskLines.push(`- ${title}`);
    else if (body) taskLines.push(`- ${body}`);
  }
  if (taskLines.length) {
    if (lines.length) lines.push('');
    lines.push('相關功能：');
    lines.push(...taskLines);
  }
  return lines.join('\n').trim();
}

function renderXuqiuGenRunStatus() {
  if (!el.xuqiuGenRunStatus) return;
  const id = state.xuqiuTestLastRunId;
  if (!id) {
    el.xuqiuGenRunStatus.innerHTML = '—';
    if (el.btnXuqiuGenViewResult) el.btnXuqiuGenViewResult.hidden = true;
    return;
  }
  const st = statusOf(id);
  const item = findItem(id);
  const err = state.results[id]?.error;
  el.xuqiuGenRunStatus.innerHTML = `
    <span class="pill ${st}">${statusLabel(st)}</span>
    <strong>${escapeHtml(item?.name || id)}</strong>
    <span class="path-file">${escapeHtml(item?.path || item?.file || id)}</span>
    ${err ? `<em class="stress-err">${escapeHtml(err)}</em>` : ''}
  `;
  if (el.xuqiuGenRunResult) el.xuqiuGenRunResult.hidden = false;
  if (el.btnXuqiuGenViewResult) {
    el.btnXuqiuGenViewResult.hidden = !(st === 'passed' || st === 'failed' || st === 'skipped');
  }
}

function applyXuqiuTestDraft(draft) {
  state.xuqiuTestDraft = draft;
  if (el.xuqiuGenSpecSource) el.xuqiuGenSpecSource.value = draft.specSource || '';
  if (el.btnXuqiuSaveGenTest) el.btnXuqiuSaveGenTest.disabled = false;
  if (el.btnXuqiuRunGenTest) el.btnXuqiuRunGenTest.disabled = false;
  const modeLabel = draft.mode === 'ai' ? `AI（${draft.model || 'model'}）` : '本地模板';
  if (el.xuqiuGenMeta) {
    el.xuqiuGenMeta.textContent = `${modeLabel} · ${draft.system} · ${draft.relFile || ''} · ${draft.id || ''}`;
  }
  if (el.xuqiuGenSaveHint) {
    el.xuqiuGenSaveHint.textContent = draft.notice
      ? draft.notice
      : `確認後寫入 ${draft.relFile}，並更新 ${draft.fixtureRel}`;
  }
  if (el.xuqiuGenRunResult) el.xuqiuGenRunResult.hidden = true;
  state.xuqiuTestLastRunId = null;
  renderXuqiuGenRunStatus();
}

async function openXuqiuGenTestModal() {
  if (state.xuqiuTab !== 'stories') {
    alert('請先在「用戶故事」分頁操作');
    return;
  }
  const form = readXuqiuForm();
  const storyId = String(form.story_id || '').trim();
  if (!storyId) {
    alert('請先填寫用戶故事編號（如 US-5.1.1.1）');
    return;
  }
  if (!el.xuqiuGenTestModal) return;

  if (el.xuqiuGenTestModalTitle) {
    el.xuqiuGenTestModalTitle.textContent = `生成測試 · ${storyId}`;
  }
  if (el.xuqiuGenSystem) el.xuqiuGenSystem.value = inferXuqiuTestSystem(storyId);
  if (el.xuqiuGenModule) el.xuqiuGenModule.value = '';
  if (el.xuqiuGenRequirement) {
    el.xuqiuGenRequirement.value = stripPlaywrightGenInstruction(buildXuqiuStoryRequirement());
  }
  if (el.xuqiuGenSpecSource) el.xuqiuGenSpecSource.value = '';
  if (el.xuqiuGenMeta) el.xuqiuGenMeta.textContent = '尚未生成 — 左側填好條件後點「生成腳本」';
  if (el.xuqiuGenSaveHint) el.xuqiuGenSaveHint.textContent = '';
  if (el.btnXuqiuSaveGenTest) el.btnXuqiuSaveGenTest.disabled = true;
  if (el.btnXuqiuRunGenTest) el.btnXuqiuRunGenTest.disabled = true;
  state.xuqiuTestDraft = null;
  state.xuqiuTestLastRunId = null;
  if (el.xuqiuGenRunResult) el.xuqiuGenRunResult.hidden = true;

  // 若已有腳本，先載入方便編輯／覆寫
  try {
    const systemId = el.xuqiuGenSystem.value;
    const prevSystem = state.system;
    if (systemId !== state.system) {
      state.system = systemId;
      await loadCatalog();
    }
    const existing = (state.catalog.story || []).find(
      (s) => s.storyId === storyId || s.id === `story:${storyId}`,
    );
    if (existing?.file) {
      const res = await fetch(`/api/spec?file=${encodeURIComponent(existing.file)}`);
      const data = await res.json();
      if (res.ok && data.content) {
        state.xuqiuTestDraft = {
          kind: 'story',
          system: systemId,
          storyId,
          id: existing.id || `story:${storyId}`,
          module: existing.module || '用戶故事',
          name: existing.name || storyId,
          description: existing.description || form.description || '',
          fileName: String(existing.file).split('/').pop(),
          relFile: existing.file,
          fixtureRel:
            systemId === 'pos'
              ? 'tests/pos/fixtures/story-suites.json'
              : 'tests/fixtures/story-suites.json',
          specSource: data.content,
          mode: 'existing',
        };
        applyXuqiuTestDraft(state.xuqiuTestDraft);
        if (el.xuqiuGenMeta) {
          el.xuqiuGenMeta.textContent = `已載入現有腳本 ${existing.file}（可再生成或直接改）`;
        }
      }
    }
    if (prevSystem !== state.system && !state.xuqiuTestDraft) {
      state.system = prevSystem;
      await loadCatalog();
    }
  } catch {
    // ignore preload errors
  }

  document.body.appendChild(el.xuqiuGenTestModal);
  el.xuqiuGenTestModal.hidden = false;
}

function closeXuqiuGenTestModal() {
  if (el.xuqiuGenTestModal) el.xuqiuGenTestModal.hidden = true;
}

async function generateXuqiuStoryTest() {
  const form = readXuqiuForm();
  const storyId = String(form.story_id || '').trim();
  if (!storyId) {
    alert('請先填寫用戶故事編號');
    return;
  }
  const requirement = stripPlaywrightGenInstruction(String(el.xuqiuGenRequirement?.value || '').trim());
  if (!requirement) {
    alert('請填寫測試需求');
    return;
  }
  if (el.xuqiuGenRequirement) el.xuqiuGenRequirement.value = requirement;
  if (el.btnXuqiuDoGenTest) el.btnXuqiuDoGenTest.disabled = true;
  showLoading('AI 正在生成用戶故事測試…');
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: el.xuqiuGenSystem?.value || inferXuqiuTestSystem(storyId),
        kind: 'story',
        storyId,
        requirement,
        module: el.xuqiuGenModule?.value || '',
        name: `${storyId} ${String(form.description || '').slice(0, 40)}`.trim(),
        relatedTasks: form.tasks || readXuqiuStoryTaskDrafts(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    applyXuqiuTestDraft(data.draft);
    appendLog(`\n—— [需求庫] 已生成測試草稿：${data.draft.name} (${data.draft.mode}) ——`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
    if (el.btnXuqiuDoGenTest) el.btnXuqiuDoGenTest.disabled = false;
  }
}

async function saveXuqiuStoryTest(options = {}) {
  if (!state.xuqiuTestDraft) {
    alert('請先生成腳本');
    return null;
  }
  const draft = {
    ...state.xuqiuTestDraft,
    kind: 'story',
    specSource: el.xuqiuGenSpecSource?.value ?? state.xuqiuTestDraft.specSource,
  };
  draft.specSource = String(draft.specSource || '').trim();
  if (draft.specSource.length < 40) {
    alert('腳本內容過短，請完善後再儲存');
    return null;
  }
  if (el.btnXuqiuSaveGenTest) el.btnXuqiuSaveGenTest.disabled = true;
  if (el.btnXuqiuRunGenTest) el.btnXuqiuRunGenTest.disabled = true;
  if (!options.keepLoading) showLoading('正在寫入用戶故事測試…');
  try {
    const res = await fetch('/api/ai/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft,
        overwrite: !!el.xuqiuGenOverwrite?.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const runId = data.id || draft.id;
    state.xuqiuTestDraft = { ...draft, id: runId };
    if (el.xuqiuGenSaveHint) {
      el.xuqiuGenSaveHint.textContent = data.writtenFile
        ? `已寫入 ${data.writtenFile}，並更新 ${data.fixtureRel}`
        : `已更新 fixture ${data.fixtureRel}`;
    }
    if (draft.system && draft.system !== state.system) state.system = draft.system;
    await loadCatalog();
    appendLog(`\n—— [需求庫] 已寫入用戶故事測試：${data.name || draft.name} ——`);
    if (!options.silent) alert(`已儲存：${data.writtenFile || runId}`);
    return { ok: true, draft: state.xuqiuTestDraft, data, runId };
  } catch (err) {
    alert(err.message || String(err));
    return null;
  } finally {
    if (!options.keepLoading) hideLoading();
    if (el.btnXuqiuSaveGenTest) el.btnXuqiuSaveGenTest.disabled = false;
    if (el.btnXuqiuRunGenTest) el.btnXuqiuRunGenTest.disabled = false;
  }
}

async function runXuqiuStoryTestNow() {
  if (state.running) {
    alert('已有測試正在執行，請稍候');
    return;
  }
  if (!state.xuqiuTestDraft) {
    alert('請先生成腳本');
    return;
  }
  showLoading('正在寫入並準備執行…');
  const saved = await saveXuqiuStoryTest({ silent: true, keepLoading: true });
  if (!saved?.ok || !saved.runId) {
    hideLoading(true);
    return;
  }
  const draft = saved.draft;
  const runId = saved.runId;
  try {
    if (draft.system && state.systems.some((s) => s.id === draft.system)) {
      state.system = draft.system;
    }
    await loadCatalog();
    const exists = findItem(runId) || allItems().find((x) => x.id === runId);
    if (!exists) {
      hideLoading(true);
      alert(`已寫入，但目錄中找不到可執行項：${runId}`);
      return;
    }
    state.xuqiuTestLastRunId = runId;
    state.nav = 'workspace';
    state.mode = 'story';
    state.selectedId = runId;
    closeXuqiuGenTestModal();
    closeStepsModal();
    renderSystemBar();
    renderModeTabs();
    setBusy(!!state.running);
    renderSuiteList();
    renderDetail();
    renderSummary();
    renderXuqiuGenRunStatus();
    hideLoading(true);
    runTarget(runId);
  } catch (err) {
    hideLoading(true);
    alert(err.message || String(err));
  }
}

async function selectXuqiuItem(id) {
  state.xuqiuSelectedId = Number(id);
  renderXuqiuList();
  showLoading('載入詳情…');
  try {
    const path =
      state.xuqiuTab === 'tasks' ? `/api/xuqiu/tasks/${id}` : `/api/xuqiu/stories/${id}`;
    const res = await fetch(path);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    if (el.xuqiuEditorTitle) el.xuqiuEditorTitle.textContent = '編輯';
    if (el.btnXuqiuSave) el.btnXuqiuSave.disabled = false;
    if (el.btnXuqiuDelete) el.btnXuqiuDelete.disabled = false;
    if (el.btnXuqiuGenTest) {
      el.btnXuqiuGenTest.disabled = state.xuqiuTab !== 'stories';
      el.btnXuqiuGenTest.hidden = state.xuqiuTab !== 'stories';
    }
    if (state.xuqiuTab === 'tasks') {
      el.xuqiuForm.innerHTML = `
        <label>標題<input name="title" value="${escapeHtml(data.title || '')}" /></label>
        <label>feature_key<input name="feature_key" value="${escapeHtml(data.feature_key || '')}" /></label>
        <label>工作項代碼<input name="work_item_code" value="${escapeHtml(data.work_item_code || '')}" /></label>
        <label>說明<textarea name="description" rows="3">${escapeHtml(data.description || '')}</textarea></label>
        <label>類型<input name="work_item_type" value="${escapeHtml(data.work_item_type || '')}" /></label>
        <label>Area Path<input name="area_path" value="${escapeHtml(data.area_path || '')}" /></label>
        <label>Iteration<input name="iteration_path" value="${escapeHtml(data.iteration_path || '')}" /></label>
        <label>指派<input name="assigned_to" value="${escapeHtml(data.assigned_to || '')}" /></label>
        <label>狀態<input name="state" value="${escapeHtml(data.state || '')}" /></label>
      `;
    } else {
      el.xuqiuForm.innerHTML = `
        <label>序號<input name="seq" value="${escapeHtml(data.seq || '')}" /></label>
        <label>用戶故事編號<input name="story_id" value="${escapeHtml(data.story_id || '')}" /></label>
        <label>feature_key<input name="feature_key" value="${escapeHtml(data.feature_key || '')}" /></label>
        <label>描述<textarea name="description" rows="4">${escapeHtml(data.description || '')}</textarea></label>
      `;
    }
    applyXuqiuRelated(data);
    el.xuqiuRelated?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

function readXuqiuForm() {
  const get = (name) => el.xuqiuForm?.querySelector(`[name="${name}"]`)?.value ?? '';
  if (state.xuqiuTab === 'tasks') {
    return {
      title: get('title'),
      feature_key: get('feature_key'),
      work_item_code: get('work_item_code'),
      description: get('description'),
      work_item_type: get('work_item_type'),
      area_path: get('area_path'),
      iteration_path: get('iteration_path'),
      assigned_to: get('assigned_to'),
      state: get('state'),
    };
  }
  return {
    seq: get('seq'),
    story_id: get('story_id'),
    feature_key: get('feature_key'),
    description: get('description'),
    tasks: readXuqiuStoryTaskDrafts(),
  };
}

async function saveXuqiuItem() {
  const body = readXuqiuForm();
  showLoading('儲存中…');
  try {
    const isNew = !state.xuqiuSelectedId;
    const base = state.xuqiuTab === 'tasks' ? '/api/xuqiu/tasks' : '/api/xuqiu/stories';
    const res = await fetch(isNew ? base : `${base}/${state.xuqiuSelectedId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    state.xuqiuSelectedId = data.id;
    await refreshXuqiuStatus();
    await loadXuqiuList();
    await selectXuqiuItem(data.id);
    appendLog(`\n—— [需求庫] 已${isNew ? '新增' : '更新'} ${state.xuqiuTab} #${data.id} ——`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

async function deleteXuqiuItem() {
  if (!state.xuqiuSelectedId) return;
  if (!confirm(`確定刪除目前${state.xuqiuTab === 'tasks' ? '任務' : '故事'}？`)) return;
  showLoading('刪除中…');
  try {
    const base = state.xuqiuTab === 'tasks' ? '/api/xuqiu/tasks' : '/api/xuqiu/stories';
    const res = await fetch(`${base}/${state.xuqiuSelectedId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    state.xuqiuSelectedId = null;
    await refreshXuqiuStatus();
    await loadXuqiuList();
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

async function importXuqiuCsv() {
  if (!confirm('將以 CSV 覆寫匯入（同 story_id 會更新；任務表會先清空再匯入）。繼續？')) return;
  showLoading('匯入 CSV…');
  try {
    const res = await fetch('/api/xuqiu/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replace: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    state.xuqiuSelectedId = null;
    await refreshXuqiuStatus();
    await loadXuqiuList();
    alert(`已匯入故事 ${data.importedStories}、任務 ${data.importedTasks}`);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    hideLoading();
  }
}

el.xuqiuTabBar?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-xuqiu-tab]');
  if (!btn) return;
  state.xuqiuTab = btn.dataset.xuqiuTab;
  state.xuqiuSelectedId = null;
  loadXuqiuList();
});
el.xuqiuList?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-xuqiu-id]');
  if (!btn) return;
  selectXuqiuItem(btn.dataset.xuqiuId);
});
el.btnXuqiuSearch?.addEventListener('click', () => loadXuqiuList());
el.xuqiuSearch?.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    loadXuqiuList();
  }
});
el.btnXuqiuImport?.addEventListener('click', () => importXuqiuCsv());
el.btnXuqiuCreate?.addEventListener('click', () => {
  state.xuqiuSelectedId = null;
  renderXuqiuList();
  renderXuqiuBlankForm(true);
});
el.btnXuqiuSave?.addEventListener('click', () => saveXuqiuItem());
el.btnXuqiuDelete?.addEventListener('click', () => deleteXuqiuItem());
el.btnXuqiuGenTest?.addEventListener('click', () => openXuqiuGenTestModal());
el.btnCloseXuqiuGenTestModal?.addEventListener('click', () => closeXuqiuGenTestModal());
el.btnXuqiuDoGenTest?.addEventListener('click', () => generateXuqiuStoryTest());
el.btnXuqiuSaveGenTest?.addEventListener('click', () => saveXuqiuStoryTest());
el.btnXuqiuRunGenTest?.addEventListener('click', () => runXuqiuStoryTestNow());
el.btnXuqiuGenViewResult?.addEventListener('click', () => {
  if (state.xuqiuTestLastRunId) openStepsModal(state.xuqiuTestLastRunId);
});
el.btnXuqiuAddTaskRow?.addEventListener('click', () => addXuqiuTaskDraftRow());
el.xuqiuRelatedList?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-remove-task]');
  if (!btn) return;
  const row = btn.closest('.xuqiu-task-draft');
  row?.remove();
  const count = el.xuqiuRelatedList.querySelectorAll('.xuqiu-task-draft').length;
  if (el.xuqiuRelatedTitle) el.xuqiuRelatedTitle.textContent = `關聯功能任務（${count}）`;
  if (!count) {
    el.xuqiuRelatedList.innerHTML =
      '<p class="batch-empty">尚未加入功能任務，可點右上角「＋ 新增任務」</p>';
  }
});
el.btnXuqiuShowRelated2?.addEventListener('click', () => openXuqiuRelatedModal());
el.btnCloseXuqiuRelatedModal?.addEventListener('click', () => closeXuqiuRelatedModal());

(async function init() {
  await loadSystems();
  await loadMiniappConfig();
  await loadState();
  await loadCatalog();
  // 刷新時優先用磁碟上的 current 快照，避免只依賴記憶體
  try {
    const res = await fetch(`/api/current?system=${encodeURIComponent(state.system)}`);
    const cur = await res.json();
    if (cur && cur.results && Object.keys(cur.results).length) {
      applySnapshot(cur, { render: false, replaceResults: true });
    }
  } catch {
    // ignore
  }
  renderSystemBar();
  setMode(state.mode === 'stress' ? 'stress' : state.mode || 'smoke');
  await loadHistory();
  if (state.mode === 'stress') await loadStressHistory();
})();
