/**
 * @author harlin
 * AI 依自然語言需求生成 Playwright 測試腳本，並寫入 fixture。
 *
 * 優先讀取 qa-data/ai-config.json（Dashboard UI 可配置）；
 * 若無則回退環境變數 AI_API_KEY / AI_BASE_URL / AI_MODEL。
 */

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, PATHS, ensureQaDataDirs } = require('./paths');

const AI_CONFIG_FILE = path.join(PATHS.qaData, 'ai-config.json');

/** OpenAI 相容 Chat Completions 常見廠商預設 */
const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI（GPT）',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    jsonMode: true,
    hint: 'platform.openai.com',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    jsonMode: true,
    hint: 'platform.deepseek.com',
  },
  {
    id: 'qwen',
    name: '通義千問（Qwen）',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'],
    jsonMode: true,
    hint: 'DashScope 相容模式',
  },
  {
    id: 'moonshot',
    name: 'Moonshot（Kimi）',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-latest'],
    jsonMode: true,
    hint: 'platform.moonshot.cn',
  },
  {
    id: 'zhipu',
    name: '智譜 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus', 'glm-4'],
    jsonMode: true,
    hint: 'open.bigmodel.cn',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct', 'THUDM/glm-4-9b-chat'],
    jsonMode: true,
    hint: 'cloud.siliconflow.cn',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    models: [
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1',
      'openai/gpt-4o-mini',
      'qwen/qwen-2.5-72b-instruct',
      'google/gemini-2.0-flash-001',
    ],
    jsonMode: true,
    hint: '只填到 /api/v1，不要帶 /chat/completions',
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    baseURL: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'deepseek-r1'],
    jsonMode: false,
    hint: '本機 Ollama，Key 可填 ollama',
  },
  {
    id: 'custom',
    name: '自訂（OpenAI 相容）',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    models: [],
    jsonMode: true,
    hint: 'Base URL 填到 /v1 為止，勿含 /chat/completions',
  },
];

/** 正規化：去掉尾斜線，並去掉誤填的 /chat/completions */
function normalizeBaseURL(input) {
  let u = String(input || '').trim().replace(/\/+$/, '');
  u = u.replace(/\/chat\/completions$/i, '');
  u = u.replace(/\/+$/, '');
  return u;
}

function defaultAiFileConfig() {
  const p = AI_PROVIDERS.find((x) => x.id === 'deepseek') || AI_PROVIDERS[0];
  return {
    provider: p.id,
    baseURL: p.baseURL,
    model: p.model,
    apiKey: '',
    temperature: 0.2,
    jsonMode: !!p.jsonMode,
  };
}

function readAiFileConfig() {
  try {
    ensureQaDataDirs();
    if (!fs.existsSync(AI_CONFIG_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(AI_CONFIG_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

function maskApiKey(key) {
  const s = String(key || '');
  if (!s) return '';
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 3)}••••${s.slice(-4)}`;
}

function normalizeSavedConfig(input, prev) {
  const prevCfg = prev || defaultAiFileConfig();
  const providerId = String(input.provider || prevCfg.provider || 'custom').trim();
  const preset = AI_PROVIDERS.find((p) => p.id === providerId);

  let apiKey = String(input.apiKey ?? '').trim();
  // 空白或遮罩字串 → 保留原 key
  if (!apiKey || apiKey.includes('•') || apiKey === '(unchanged)') {
    apiKey = prevCfg.apiKey || '';
  }

  let baseURL = normalizeBaseURL(input.baseURL || prevCfg.baseURL || '');
  let model = String(input.model || prevCfg.model || '').trim();
  if (!baseURL && preset) baseURL = preset.baseURL;
  if (!model && preset) model = preset.model;
  if (!baseURL) throw new Error('請填寫 API Base URL');
  if (!model) throw new Error('請填寫模型名稱');
  if (/\/chat\/completions/i.test(baseURL)) {
    throw new Error('Base URL 請只填到 /v1，不要包含 /chat/completions');
  }

  const temperature = Number(input.temperature);
  const jsonMode =
    input.jsonMode === undefined
      ? preset
        ? !!preset.jsonMode
        : !!prevCfg.jsonMode
      : !!input.jsonMode;

  return {
    provider: providerId,
    baseURL,
    model,
    apiKey,
    temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : 0.2,
    jsonMode,
    updatedAt: new Date().toISOString(),
  };
}

function saveAiFileConfig(input) {
  ensureQaDataDirs();
  const prev = readAiFileConfig() || defaultAiFileConfig();
  const next = normalizeSavedConfig(input, prev);
  fs.writeFileSync(AI_CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

function aiConfig() {
  const file = readAiFileConfig();
  const defaults = defaultAiFileConfig();
  const envKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
  const envBase = process.env.AI_BASE_URL || '';
  const envModel = process.env.AI_MODEL || '';

  const provider = file?.provider || defaults.provider;
  const apiKey = (file?.apiKey && String(file.apiKey).trim()) || envKey;
  const baseURL = normalizeBaseURL(file?.baseURL || envBase || defaults.baseURL);
  const model = String(file?.model || envModel || defaults.model).trim();
  const temperature = Number.isFinite(Number(file?.temperature)) ? Number(file.temperature) : defaults.temperature;
  const jsonMode = file?.jsonMode !== undefined ? !!file.jsonMode : !!defaults.jsonMode;
  const source = file?.apiKey ? 'file' : envKey ? 'env' : 'none';

  return {
    configured: Boolean(apiKey),
    provider,
    apiKey,
    baseURL,
    model,
    temperature,
    jsonMode,
    source,
    configFile: path.relative(ROOT, AI_CONFIG_FILE).replace(/\\/g, '/'),
  };
}

function publicAiStatus() {
  const cfg = aiConfig();
  const preset = AI_PROVIDERS.find((p) => p.id === cfg.provider);
  return {
    configured: cfg.configured,
    provider: cfg.provider,
    providerName: preset?.name || cfg.provider,
    baseURL: cfg.baseURL,
    model: cfg.model,
    temperature: cfg.temperature,
    jsonMode: cfg.jsonMode,
    hasKey: cfg.configured,
    apiKeyMasked: cfg.configured ? maskApiKey(cfg.apiKey) : '',
    source: cfg.source,
    configFile: cfg.configFile,
    hint: cfg.configured
      ? `已就緒（${cfg.source === 'file' ? 'UI 配置檔' : '環境變數'}）`
      : '尚未設定 API Key：可點「AI 配置」寫入，或暫時用本地模板草稿',
  };
}

function publicAiConfigPayload() {
  const file = readAiFileConfig() || defaultAiFileConfig();
  const status = publicAiStatus();
  return {
    config: {
      provider: file.provider || status.provider,
      baseURL: file.baseURL || status.baseURL,
      model: file.model || status.model,
      temperature: file.temperature ?? 0.2,
      jsonMode: file.jsonMode !== undefined ? !!file.jsonMode : true,
      hasKey: status.hasKey,
      apiKeyMasked: status.apiKeyMasked,
      // 表單用空字串；儲存時空白表示不改
      apiKey: '',
    },
    providers: AI_PROVIDERS,
    status,
  };
}

function slugify(input) {
  return String(input || 'case')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'case';
}

function asciiSlug(input) {
  const s = String(input || 'case')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || `case-${Date.now().toString(36)}`;
}

function helperHints(systemId, kind) {
  const fixtureHint =
    kind === 'smoke'
      ? 'modules'
      : kind === 'crud'
        ? 'crud-modules'
        : kind === 'story'
          ? 'story-suites'
          : 'e2e-suites';
  if (systemId === 'pos') {
    return `
可用 POS helper（tests/pos/helpers/pos.ts），請優先 import 使用：
- openPosPage, clickPosNav, openPosRoute, expectPosShell
- clearCartIfAny, addFirstAvailableProduct, selectDiningMode
- tryOpenCheckout, completeCheckoutPayment, tryHangOrder, tryOpenHangList
- ensureMemberByPhone, loginMemberOnPos, tryApplyCoupon
- clickKitchenStatusTab, clickFirstKitchenAction
- openFirstKitchenOrderDetail, openRefundEntry, selectRefundType, selectRefundItems, confirmRefund
- fillByPlaceholder, clickTextButton, uniquePhone
${kind === 'story' ? '- tests/pos/helpers/story.ts：expectPosStorySignals' : ''}

POS 路徑慣例：/pages/pos/index、/pages/kitchen/index、/pages/orders/index、/pages/members/index 等。
測試檔放在：tests/pos/${kind}/
fixture：tests/pos/fixtures/${fixtureHint}.json
`.trim();
  }
  return `
可用後台 helper：
- tests/helpers/e2e.ts：openAppPage, openWithStore, expectListUsable, STORE, trySearchFirstInput, filterVipByPhone, findVipRowByPhone, openVipDetailByPhone, clickFirstVipView, searchVipAndOpenDetail
- tests/helpers/page-checks.ts：expectAuthenticated, expectAppShell, expectPageReady, expectTableOrEmpty
- tests/helpers/store.ts：selectStore, clickFilter
- tests/helpers/crud.ts（若適用）

【後台常見路徑（必須用這些，不要發明）】
- 會員列表 /vip/list 、會員詳情 /vip/detail/:id（禁止 /member/list）
- 商品 /goods/list 、訂單 /orders/list
- 庫存查詢 /inventory/query 、盤點 /inventory/check
- 門店 /store/list 、數據總覽 /

【選擇器】後台是 Ant Design：.ant-table、getByRole('button')、getByPlaceholder；禁止使用 uni-input / uni-button / uni-table（那是 POS）。
【文案必須用簡體中文】與線上 UI 一致。會員列表正確寫法：
  await openAppPage(page, '/vip/list');
  const ok = await openVipDetailByPhone(page, '13939882731'); // 篩選失敗會用表格文案兜底
  // 或：const ok = await searchVipAndOpenDetail(page, phone);
  test.skip(!ok, '無會員');
禁止只呼叫 filterVipByPhone 後就假設一定有列（篩選 API 可能回 0 筆）。
禁止繁體「請輸入」；禁止按鈕名寫死「搜索」（應為「筛选」）。
【import】必須 from '../fixtures/base-test'，禁止 from '@playwright/test'。

測試檔放在：tests/${kind}/
fixture：tests/fixtures/${fixtureHint}.json
`.trim();
}

function buildSystemPrompt(systemId, kind) {
  const kindList = 'smoke|crud|e2e|story';
  const adminImport =
    kind === 'story'
      ? "admin（檔案在 tests/story/）：from '../fixtures/base-test'，helper 用 '../helpers/...'"
      : `admin（檔案在 tests/${kind}/）：from '../fixtures/base-test'，helper 用 '../helpers/...'`;
  const posImport =
    kind === 'story'
      ? "pos（檔案在 tests/pos/story/）：from '../../fixtures/base-test'，helper 用 '../helpers/pos'"
      : `pos（檔案在 tests/pos/${kind}/）：from '../../fixtures/base-test'，helper 用 '../helpers/pos'`;

  return `
你是 Peterson QA Lab 的測試工程師，要為「${systemId}」系統產出「${kind}」自動化測試。
必須輸出【單一 JSON 物件】，不要 markdown 圍欄，不要解釋文字。

JSON schema：
{
  "kind": "${kindList}",
  "system": "admin|pos",
  "module": "模組中文名",
  "name": "用例短名（用戶故事建議含 storyId）",
  "description": "一句話說明",
  "id": "可選，如 story:US-5.1.1.1 或 e2e:pos-xxx",
  "storyId": "用戶故事編號，僅 kind=story 必填，如 US-5.1.1.1",
  "fileName": "僅檔名，如 us-5-1-1-1.story.spec.ts",
  "specSource": "完整 TypeScript 測試原始碼字串（smoke 可為空字串）",
  "smokeEntry": { "module": "", "name": "", "path": "/...", "checks": ["pageReady"], "nav": "可選" }
}

規則：
1. kind 必須是 ${kind}；system 必須是 ${systemId}。
2. 若 kind=smoke：主要填 smokeEntry（path 以 / 開頭）；specSource 可空。不要發明不存在的 check，優先 pageReady / tableOrEmpty / search / posShell / productGrid / orderList / memberSearch / dashboard。
3. 若 kind=crud、e2e 或 story：必須給完整可執行的 Playwright specSource，使用 @author harlin。
   【極重要】import 路徑依系統不同，不可搞混：
   - ${adminImport}
   - ${posImport}
4. 若 kind=story：必須填 storyId；test() 標題必須包含該 storyId；fileName 建議 us-x-x-x.story.spec.ts；id 用 story:{storyId}。
5. admin 優先使用 openAppPage / openWithStore / expectListUsable / openVipDetailByPhone / searchVipAndOpenDetail / STORE；不要手寫 page.goto('/') 登入；會員場景禁止只呼叫 filterVipByPhone。
6. 強制優先呼叫現有 helper，禁止 fragile 的絕對座標點擊。
7. 涉及真實支付／退款時在註解標明「測試門店」。
8. fileName 只用英文小寫、數字、連字號，結尾 .spec.ts。
9. test.describe.configure({ mode: 'serial' }) 用於多步驟閉環。
10. 選擇器：admin 用 Ant Design + 簡體文案／正則；pos 才用 uni-button / getByText。

${helperHints(systemId, kind)}
`.trim();
}

function fewShotForRequirement(systemId, requirement) {
  const req = String(requirement || '');
  if (systemId === 'admin' && /会员|會員|手机|手機|vip/i.test(req)) {
    return `
【正確範例（請仿照，勿改成繁體）】
import { test, expect } from '../fixtures/base-test';
import { openAppPage, openVipDetailByPhone, searchVipAndOpenDetail } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';

test.describe.configure({ mode: 'serial' });
test.describe('E2E｜會員', () => {
  test('搜尋並查看詳情', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    const phone = process.env.E2E_MEMBER_PHONE || '13939882731';
    let ok = await openVipDetailByPhone(page, phone);
    if (!ok) ok = await searchVipAndOpenDetail(page, phone);
    test.skip(!ok, '無會員');
    await expectPageReady(page);
  });
});
`.trim();
  }
  return '';
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('模型回傳为空');
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error('模型回傳不是有效 JSON');
  }
}

async function callChatModel({ systemPrompt, userPrompt }) {
  const cfg = aiConfig();
  if (!cfg.configured) {
    throw new Error('尚未設定 API Key，請先在「AI 配置」中填寫');
  }
  const baseURL = normalizeBaseURL(cfg.baseURL);
  const url = `${baseURL}/chat/completions`;

  async function once(useJsonMode) {
    const body = {
      model: cfg.model,
      temperature: cfg.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };
    if (useJsonMode) body.response_format = { type: 'json_object' };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    };
    // OpenRouter 建議帶上（可選）
    if (/openrouter\.ai/i.test(baseURL)) {
      headers['HTTP-Referer'] = 'http://127.0.0.1:3456';
      headers['X-Title'] = 'Peterson QA Lab';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || res.statusText || `HTTP ${res.status}`;
      const err = new Error(`AI 呼叫失敗：${msg}（${url} · model=${cfg.model}）`);
      err.status = res.status;
      err.raw = msg;
      throw err;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 未回傳內容');
    return content;
  }

  try {
    return await once(!!cfg.jsonMode);
  } catch (err) {
    const msg = String(err.raw || err.message || '');
    if (cfg.jsonMode && /response_format|json_object|json mode/i.test(msg)) {
      return once(false);
    }
    throw err;
  }
}

function storyFileNameFromId(storyId) {
  const bare = String(storyId || '')
    .trim()
    .replace(/^US-/i, '')
    .toLowerCase()
    .replace(/[^0-9a-z.]+/g, '-')
    .replace(/\./g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!bare) throw new Error('storyId 無效，無法產生檔名');
  return `us-${bare}.story.spec.ts`;
}

function resolveDirs(systemId, kind) {
  if (!['admin', 'pos'].includes(systemId)) throw new Error('system 僅支援 admin / pos');
  if (!['smoke', 'crud', 'e2e', 'story'].includes(kind)) {
    throw new Error('kind 僅支援 smoke / crud / e2e / story');
  }

  if (systemId === 'pos') {
    return {
      specDir: path.join(ROOT, 'tests', 'pos', kind === 'smoke' ? 'smoke' : kind),
      fixtureRel:
        kind === 'smoke'
          ? 'tests/pos/fixtures/modules.json'
          : kind === 'crud'
            ? 'tests/pos/fixtures/crud-modules.json'
            : kind === 'story'
              ? 'tests/pos/fixtures/story-suites.json'
              : 'tests/pos/fixtures/e2e-suites.json',
      importBase: kind === 'smoke' ? null : '../../fixtures/base-test',
    };
  }
  return {
    specDir: path.join(ROOT, 'tests', kind),
    fixtureRel:
      kind === 'smoke'
        ? 'tests/fixtures/modules.json'
        : kind === 'crud'
          ? 'tests/fixtures/crud-modules.json'
          : kind === 'story'
            ? 'tests/fixtures/story-suites.json'
            : 'tests/fixtures/e2e-suites.json',
    importBase: kind === 'smoke' ? null : '../fixtures/base-test',
  };
}

/**
 * 依目標目錄強制校正 import／常見錯誤文案／路由。
 */
function fixSpecImportPaths(specSource, systemId, relFile = '') {
  let src = String(specSource || '');
  if (!src) return src;

  const rel = String(relFile || '').replace(/\\/g, '/');
  const isPos =
    systemId === 'pos' ||
    rel.startsWith('tests/pos/') ||
    /\/pos\/(smoke|crud|e2e)\//.test(rel);

  const baseImport = isPos
    ? "import { test, expect } from '../../fixtures/base-test';"
    : "import { test, expect } from '../fixtures/base-test';";

  src = src.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]@playwright\/test['"]\s*;?/g,
    baseImport,
  );
  if (!/fixtures\/base-test/.test(src)) {
    src = `${baseImport}\n${src}`;
  }

  if (isPos) {
    src = src.replace(/from\s+(['"])\.\.\/fixtures\//g, 'from $1../../fixtures/');
    src = src.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/fixtures\//g, 'from $1../../fixtures/');
  } else {
    src = src.replace(/from\s+(['"])\.\.\/\.\.\/fixtures\//g, 'from $1../fixtures/');
    src = src.replace(/from\s+(['"])\.\.\/\.\.\/helpers\//g, 'from $1../helpers/');
    src = src.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/fixtures\//g, 'from $1../fixtures/');
    src = src.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/helpers\//g, 'from $1../helpers/');
    src = src.replace(/(['"`])\/member\/list\1/g, "$1/vip/list$1");
    src = src.replace(/(['"`])\/members\/list\1/g, "$1/vip/list$1");
    src = src.replace(/(['"`])\/member\/detail/g, '$1/vip/detail');

    // 繁體 → 簡體（後台 UI）
    const tradMap = [
      ['請輸入手機號', '请输入手机号'],
      ['請輸入手机号', '请输入手机号'],
      ['請輸入暱稱', '请输入昵称'],
      ['請輸入昵稱', '请输入昵称'],
      ['請輸入openid', '请输入openid'],
      ['手機號', '手机号'],
      ['會員詳情', '会员详情'],
      ['會員', '会员'],
      ['篩選', '筛选'],
      ['查看詳情', '查看详情'],
    ];
    for (const [a, b] of tradMap) src = src.split(a).join(b);

    // 按鈕「搜索」在會員列表應為「筛选」
    src = src.replace(
      /getByRole\(\s*(['"])button\1\s*,\s*\{\s*name:\s*(['"])搜索\2\s*\}\s*\)/g,
      "getByRole('button', { name: /筛\\s*选/ })",
    );
    src = src.replace(
      /getByRole\(\s*(['"])button\1\s*,\s*\{\s*name:\s*\/搜索\/\s*\}\s*\)/g,
      "getByRole('button', { name: /筛\\s*选/ })",
    );

    src = repairAdminVipHelpers(src);
  }
  return src;
}

/** 確保 from '../helpers/e2e' 的 import 含指定符號 */
function ensureE2eHelperImports(src, needed) {
  let out = src;
  const m = out.match(/import\s*\{([^}]*)\}\s*from\s*(['"])(\.\.\/helpers\/e2e)\2\s*;?/);
  if (m) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const n of needed) {
      if (!names.includes(n)) names.push(n);
    }
    // 去掉已不建議單獨依賴的 filterVipByPhone（保留亦可，但優先 openVip*）
    out = out.replace(
      m[0],
      `import { ${names.join(', ')} } from ${m[2]}${m[3]}${m[2]};`,
    );
    return out;
  }
  const insert = `import { ${needed.join(', ')} } from '../helpers/e2e';\n`;
  if (/from ['"]\.\.\/fixtures\/base-test['"]/.test(out)) {
    return out.replace(/(from ['"]\.\.\/fixtures\/base-test['"]\s*;?\s*\n)/, `$1${insert}`);
  }
  return insert + out;
}

/**
 * 生成後強制把「脆弱的 filterVipByPhone / 手寫篩選」改成 openVipDetailByPhone。
 * 這樣即使用戶／模型仍寫舊寫法，預覽與寫入都會是正確腳本。
 */
function repairAdminVipHelpers(specSource) {
  let src = String(specSource || '');
  if (!src) return src;

  const touchesVip =
    /\/vip\/list/.test(src) ||
    /filterVipByPhone|openVipDetailByPhone|searchVipAndOpenDetail|请输入手机号/.test(src);
  if (!touchesVip) return src;

  // 手寫 placeholder 填手機 + 點筛选 → 標記稍後統一改寫（先抽出 phone 表達式很難，改為常見字面量）
  src = src.replace(
    /await\s+page\.getByPlaceholder\([^)]*手机号[^)]*\)[^;]*\.fill\(([^)]+)\)\s*;\s*\n\s*await\s+page\.getByRole\(\s*['"]button['"]\s*,\s*\{\s*name:\s*[^}]+\}\s*\)[^;]*\.click\(\)\s*;/g,
    'await filterVipByPhone(page, $1);',
  );

  // filterVipByPhone → openVipDetailByPhone + 兜底
  if (/filterVipByPhone\s*\(/.test(src) && !/openVipDetailByPhone\s*\(/.test(src)) {
    src = src.replace(
      /await\s+filterVipByPhone\s*\(\s*page\s*,\s*([^)]+?)\s*\)\s*;/g,
      [
        'let __vipOk = await openVipDetailByPhone(page, $1);',
        'if (!__vipOk) __vipOk = await searchVipAndOpenDetail(page, $1);',
        "test.skip(!__vipOk, '找不到會員');",
      ].join('\n    '),
    );
    // 已打開詳情則勿再 clickFirstVipView
    src = src.replace(/\n\s*await\s+clickFirstVipView\s*\(\s*page\s*\)\s*;/g, '\n');
  }

  // 若已有 openVipDetailByPhone 但仍殘留多餘的 clickFirstVipView 緊接其後，去掉
  src = src.replace(
    /(await\s+openVipDetailByPhone\s*\([^;]+;\s*(?:\n\s*if\s*\([^)]+\)[^\n]*;\s*)?(?:\n\s*test\.skip\([^)]+\);\s*)?)\n\s*await\s+clickFirstVipView\s*\(\s*page\s*\)\s*;/g,
    '$1',
  );

  src = ensureE2eHelperImports(src, [
    'openAppPage',
    'openVipDetailByPhone',
    'searchVipAndOpenDetail',
  ]);

  return src;
}

/** 需求像「會員+手機/搜尋/詳情」時，直接產出標準範本（比模型更穩） */
function isAdminVipSearchRequirement(requirement) {
  const req = String(requirement || '');
  return /会员|會員|vip/i.test(req) && /手机|手機|搜索|搜尋|筛选|篩選|详情|詳情/.test(req);
}

function extractPhoneFromText(text) {
  const m = String(text || '').match(/1[3-9]\d{9}/);
  return m ? m[0] : '';
}

function buildAdminVipSearchSpec({ name, requirement }) {
  const phone = extractPhoneFromText(requirement) || '13939882731';
  const title = name || '會員搜索與詳情';
  return `/**
 * @author harlin
 * AI 生成：${title}
 */

import { test, expect } from '../fixtures/base-test';
import { openAppPage, openVipDetailByPhone, searchVipAndOpenDetail } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';

test.describe.configure({ mode: 'serial' });

test.describe('E2E｜${title}', () => {
  test('${title}', async ({ page }) => {
    await openAppPage(page, '/vip/list');
    const phone = process.env.E2E_MEMBER_PHONE || '${phone}';
    // 篩選 API 不穩時 openVipDetailByPhone 會改用表格文案定位
    let ok = await openVipDetailByPhone(page, phone);
    if (!ok) ok = await searchVipAndOpenDetail(page, phone);
    test.skip(!ok, \`找不到會員 \${phone}\`);
    await expectPageReady(page);
    await expect(page).toHaveURL(/\\/vip\\/detail/);
    await expect(page.getByText(/会员|手机|积分|余额|详情|优惠|消费/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
`;
}

function normalizeDraft(raw, { systemId, kind, requirement, storyId: storyIdHint }) {
  const draft = { ...raw };
  draft.kind = kind;
  draft.system = systemId;
  draft.module = String(draft.module || 'AI生成').trim() || 'AI生成';
  draft.name = String(draft.name || '未命名用例').trim() || '未命名用例';
  draft.description = String(draft.description || requirement.slice(0, 120)).trim();

  let fileName = String(draft.fileName || '').trim();
  fileName = path.basename(fileName).replace(/\\/g, '/');

  if (kind === 'story') {
    const storyId = String(draft.storyId || storyIdHint || '').trim();
    if (!storyId) throw new Error('用戶故事測試需要 storyId（如 US-5.1.1.1）');
    draft.storyId = storyId;
    draft.id = `story:${storyId}`;
    if (!fileName || fileName.includes('..') || !/\.story\.spec\.ts$/i.test(fileName)) {
      fileName = storyFileNameFromId(storyId);
    }
    if (!draft.name.includes(storyId)) {
      draft.name = `${storyId} ${draft.name}`.trim();
    }
  } else if (!fileName || fileName.includes('..')) {
    const base = asciiSlug(draft.name);
    fileName =
      kind === 'e2e'
        ? `${base}-journey.spec.ts`
        : kind === 'crud'
          ? `${base}.crud.spec.ts`
          : `${base}.spec.ts`;
  }
  if (!fileName.endsWith('.spec.ts')) fileName = `${fileName.replace(/\.ts$/, '')}.spec.ts`;
  if (!/^[a-z0-9][a-z0-9._-]*\.spec\.ts$/i.test(fileName)) {
    throw new Error(`非法檔名：${fileName}`);
  }
  draft.fileName = fileName;

  const { specDir, fixtureRel } = resolveDirs(systemId, kind);
  const relFile = path
    .relative(ROOT, path.join(specDir, fileName))
    .replace(/\\/g, '/');
  draft.relFile = relFile;
  draft.fixtureRel = fixtureRel;

  if (!draft.id) {
    const prefix = kind === 'smoke' ? 'smoke' : kind === 'crud' ? 'crud' : kind === 'story' ? 'story' : 'e2e';
    const sys = systemId === 'pos' ? 'pos-' : '';
    draft.id = `${prefix}:${sys}${asciiSlug(draft.name)}`;
  }

  if (kind === 'smoke') {
    const se = draft.smokeEntry || {};
    const entry = {
      module: String(se.module || draft.module).trim(),
      name: String(se.name || draft.name).trim(),
      path: String(se.path || '/').trim(),
      checks: Array.isArray(se.checks) && se.checks.length ? se.checks : ['pageReady'],
    };
    if (se.nav) entry.nav = String(se.nav);
    if (!entry.path.startsWith('/')) throw new Error('smoke path 需以 / 開頭');
    draft.smokeEntry = entry;
    draft.specSource = '';
  } else {
    let src = String(draft.specSource || '').trim();
    if (!src || src.length < 40) throw new Error('缺少可用的 specSource');

    // 會員搜尋類需求：直接套穩定範本，避免模型仍輸出 filterVipByPhone
    if (systemId === 'admin' && kind !== 'smoke' && isAdminVipSearchRequirement(requirement)) {
      src = buildAdminVipSearchSpec({ name: draft.name, requirement });
      draft.notice = (draft.notice ? `${draft.notice}；` : '') + '已套用會員搜尋標準寫法（openVipDetailByPhone）';
    }

    src = fixSpecImportPaths(src, systemId, draft.relFile);
    if (!/from ['"].*fixtures\/base-test['"]/.test(src) && !/from ['"].*base-test['"]/.test(src)) {
      draft.warning = '建議 import fixtures/base-test';
    }
    draft.specSource = src;
  }

  return draft;
}

function localFallbackDraft({ systemId, kind, requirement, moduleName, caseName, storyId }) {
  const name = caseName || (storyId ? `${storyId} 用戶故事` : 'AI草稿用例');
  const module = moduleName || (kind === 'story' ? '用戶故事' : 'AI生成');
  const fileBase = asciiSlug(name);
  if (kind === 'smoke') {
    return normalizeDraft(
      {
        module,
        name,
        description: requirement.slice(0, 160),
        smokeEntry: {
          module,
          name,
          path: systemId === 'pos' ? '/pages/pos/index' : '/',
          checks: systemId === 'pos' ? ['posShell'] : ['pageReady'],
          nav: systemId === 'pos' ? '点单' : undefined,
        },
        specSource: '',
      },
      { systemId, kind, requirement, storyId },
    );
  }

  const isPos = systemId === 'pos';
  const importPath = isPos ? '../../fixtures/base-test' : '../fixtures/base-test';

  if (kind === 'story') {
    const sid = String(storyId || 'US-0.0.0.0').trim();
    const safeReq = requirement.replace(/\n/g, ' ').slice(0, 200);
    const shortName = name.replace(sid, '').trim() || '自動化驗證';
    const specSource = isPos
      ? `/**
 * @author harlin
 * 用戶故事 ${sid}
 * ${safeReq}
 */
import { test } from '${importPath}';
import { openPosPage } from '../helpers/pos';
import { expectPosStorySignals } from '../helpers/story';

test.describe('${module}', () => {
  test('${sid} ${shortName}', async ({ page }) => {
    await openPosPage(page, '/pages/pos/index', '点单');
    await expectPosStorySignals(page, /点单|商品|分类/);
    // TODO: 依需求補齊步驟 — ${safeReq}
  });
});
`
      : `/**
 * @author harlin
 * 用戶故事 ${sid}
 * ${safeReq}
 */
import { test } from '${importPath}';
import { openAppPage } from '../helpers/e2e';
import { expectPageReady } from '../helpers/page-checks';

test.describe('${module}', () => {
  test('${sid} ${shortName}', async ({ page }) => {
    await openAppPage(page, '/');
    await expectPageReady(page);
    // TODO: 依需求補齊步驟 — ${safeReq}
  });
});
`;
    return normalizeDraft(
      {
        module,
        name,
        description: requirement.slice(0, 160),
        storyId: sid,
        fileName: storyFileNameFromId(sid),
        specSource,
      },
      { systemId, kind, requirement, storyId: sid },
    );
  }

  const helperImport = isPos
    ? `import { openPosPage, addFirstAvailableProduct, clearCartIfAny } from '../helpers/pos';`
    : `import { openAppPage } from '../helpers/e2e';`;
  const body =
    kind === 'e2e'
      ? isPos
        ? `
test.describe.configure({ mode: 'serial' });
test.describe('E2E ${name}', () => {
  test('1. 依需求開啟並操作', async ({ page }) => {
    // 需求：${requirement.replace(/\n/g, ' ').slice(0, 200)}
    await openPosPage(page, '/pages/pos/index', '点单');
    await clearCartIfAny(page);
    await addFirstAvailableProduct(page).catch(() => {});
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });
});
`.trim()
        : `
test.describe.configure({ mode: 'serial' });
test.describe('E2E ${name}', () => {
  test('1. 依需求開啟並操作', async ({ page }) => {
    // 需求：${requirement.replace(/\n/g, ' ').slice(0, 200)}
    await openAppPage(page, '/');
    await expect(page).not.toHaveURL(/\\/login/);
  });
});
`.trim()
      : isPos
        ? `
test.describe('CRUD ${name}', () => {
  test('依需求驗證入口', async ({ page }) => {
    // 需求：${requirement.replace(/\n/g, ' ').slice(0, 200)}
    await openPosPage(page, '/pages/pos/index', '点单');
    await expect(page.locator('.nav-label', { hasText: '点单' }).first()).toBeVisible();
  });
});
`.trim()
        : `
test.describe('CRUD ${name}', () => {
  test('依需求驗證入口', async ({ page }) => {
    // 需求：${requirement.replace(/\n/g, ' ').slice(0, 200)}
    await openAppPage(page, '/');
    await expect(page).not.toHaveURL(/\\/login/);
  });
});
`.trim();

  const specSource = `/**
 * @author harlin
 * AI 草稿（無 API Key 時的本地模板，請再完善步驟）
 */

import { test, expect } from '${importPath}';
${helperImport}

${body}
`;

  return normalizeDraft(
    {
      module,
      name,
      description: requirement.slice(0, 160),
      fileName: kind === 'e2e' ? `${fileBase}-journey.spec.ts` : `${fileBase}.crud.spec.ts`,
      specSource,
    },
    { systemId, kind, requirement },
  );
}

async function generateTestDraft(input) {
  const systemId = String(input.system || 'pos');
  const kind = String(input.kind || 'e2e');
  const requirement = String(input.requirement || '').trim();
  const storyId = String(input.storyId || '').trim();
  if (!requirement) throw new Error('請填寫測試需求');
  if (requirement.length > 8000) throw new Error('需求過長（最多 8000 字）');
  if (kind === 'story' && !storyId) throw new Error('用戶故事測試需要 storyId');

  const relatedTasks = Array.isArray(input.relatedTasks) ? input.relatedTasks : [];
  const taskBlock = relatedTasks.length
    ? [
        '關聯功能任務：',
        ...relatedTasks.slice(0, 20).map((t, i) => {
          const title = t.title || t.work_item_code || `#${i + 1}`;
          const desc = t.description ? ` — ${String(t.description).slice(0, 120)}` : '';
          return `${i + 1}. ${title}${desc}`;
        }),
      ].join('\n')
    : '';

  const cfg = aiConfig();
  if (!cfg.configured) {
    const draft = localFallbackDraft({
      systemId,
      kind,
      requirement,
      moduleName: input.module,
      caseName: input.name,
      storyId,
    });
    draft.mode = 'template';
    draft.notice = '未設定 API Key，已生成可編輯的本地模板草稿（非大模型）';
    return draft;
  }

  const systemPrompt = buildSystemPrompt(systemId, kind);
  const shot = fewShotForRequirement(systemId, requirement);
  const userPrompt = [
    `系統：${systemId}`,
    `類型：${kind}`,
    storyId ? `storyId：${storyId}` : '',
    input.module ? `建議模組名：${input.module}` : '',
    input.name ? `建議用例名：${input.name}` : '',
    '測試需求如下：',
    requirement,
    taskBlock,
    shot ? `\n${shot}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const content = await callChatModel({ systemPrompt, userPrompt });
  const parsed = extractJson(content);
  if (storyId && !parsed.storyId) parsed.storyId = storyId;
  const draft = normalizeDraft(parsed, { systemId, kind, requirement, storyId });
  draft.mode = 'ai';
  draft.model = cfg.model;
  draft.provider = cfg.provider;
  return draft;
}

function assertSafeWrite(absFile) {
  const resolved = path.resolve(absFile);
  const testsRoot = path.resolve(ROOT, 'tests');
  if (!resolved.startsWith(testsRoot + path.sep)) {
    throw new Error('僅允許寫入 tests/ 目錄');
  }
}

function saveGeneratedDraft(draft, { overwrite = false } = {}) {
  if (!draft || !draft.kind || !draft.system) throw new Error('草稿無效');
  const systemId = draft.system;
  const kind = draft.kind;
  const { specDir, fixtureRel } = resolveDirs(systemId, kind);
  const fixtureAbs = path.join(ROOT, fixtureRel);
  const fixture = JSON.parse(fs.readFileSync(fixtureAbs, 'utf8'));
  if (!Array.isArray(fixture)) throw new Error('fixture 格式錯誤');

  let writtenFile = null;
  if (kind === 'smoke') {
    const entry = draft.smokeEntry;
    if (!entry?.path) throw new Error('缺少 smokeEntry');
    const dup = fixture.find((x) => x.path === entry.path && x.name === entry.name);
    if (dup && !overwrite) throw new Error(`冒煙項已存在：${entry.name} (${entry.path})，可勾選覆寫`);
    if (dup) {
      Object.assign(dup, entry);
    } else {
      fixture.push(entry);
    }
  } else {
    const abs = path.join(specDir, draft.fileName);
    assertSafeWrite(abs);
    if (fs.existsSync(abs) && !overwrite) {
      throw new Error(`檔案已存在：${draft.relFile}，可勾選覆寫`);
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const source = fixSpecImportPaths(draft.specSource, systemId, draft.relFile);
    // 寫入前再驗一次：admin 檔案不得殘留 ../../fixtures
    const relNorm = String(draft.relFile || '').replace(/\\/g, '/');
    if (!relNorm.startsWith('tests/pos/') && /from\s+['"]\.\.\/\.\.\/fixtures\//.test(source)) {
      throw new Error('import 路徑校正失敗：admin 腳本仍使用 ../../fixtures，請重試生成');
    }
    fs.writeFileSync(abs, source.endsWith('\n') ? source : `${source}\n`, 'utf8');
    writtenFile = draft.relFile;
    draft.specSource = source;

    const entry = {
      id: draft.id,
      module: draft.module,
      name: draft.name,
      file: draft.relFile,
      description: draft.description,
    };
    if (kind === 'story') {
      entry.storyId = String(draft.storyId || draft.id.replace(/^story:/, '')).trim();
      entry.id = `story:${entry.storyId}`;
    }
    if (kind === 'crud' && draft.smokeEntry?.path) entry.path = draft.smokeEntry.path;
    const idx = fixture.findIndex(
      (x) =>
        x.id === entry.id ||
        x.file === entry.file ||
        (kind === 'story' && entry.storyId && x.storyId === entry.storyId),
    );
    if (idx >= 0) {
      if (!overwrite) throw new Error(`目錄項已存在：${entry.id}，可勾選覆寫`);
      fixture[idx] = { ...fixture[idx], ...entry };
    } else {
      fixture.push(entry);
    }
  }

  fs.writeFileSync(fixtureAbs, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  const outId =
    kind === 'smoke' && draft.smokeEntry?.path
      ? `smoke:${draft.smokeEntry.path}`
      : draft.id;
  return {
    ok: true,
    writtenFile,
    fixtureRel,
    id: outId,
    kind,
    system: systemId,
    name: draft.name,
  };
}

module.exports = {
  AI_PROVIDERS,
  AI_CONFIG_FILE,
  aiConfig,
  publicAiStatus,
  publicAiConfigPayload,
  saveAiFileConfig,
  generateTestDraft,
  saveGeneratedDraft,
  fixSpecImportPaths,
  slugify,
};
