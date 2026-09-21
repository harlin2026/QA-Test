/**
 * @author harlin
 * 需求庫（xuqiu CSV → SQLite）與 CRUD。
 * 關聯鍵：feature_key（如 5.1.1.1）連接 US-5.1.1.1 與任務標題前綴。
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { ROOT, PATHS, ensureQaDataDirs } = require('./paths');

const DB_FILE = path.join(PATHS.qaData, 'xuqiu.db');
const CSV_STORIES = path.join(ROOT, 'xuqiu', 'Peterson_PRD_1.4_UserStories.csv');
const CSV_TASKS = path.join(ROOT, 'xuqiu', 'Peterson_PRD_1.4_Feature_Backlog_MobileFrontEnd.csv');

let db;

function getDb() {
  if (db) return db;
  ensureQaDataDirs();
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seq TEXT NOT NULL DEFAULT '',
      story_id TEXT NOT NULL UNIQUE,
      feature_key TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feature_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      feature_key TEXT NOT NULL DEFAULT '',
      work_item_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      work_item_type TEXT NOT NULL DEFAULT 'Task',
      area_path TEXT NOT NULL DEFAULT '',
      iteration_path TEXT NOT NULL DEFAULT '',
      assigned_to TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'New',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stories_feature ON user_stories(feature_key);
    CREATE INDEX IF NOT EXISTS idx_tasks_feature ON feature_tasks(feature_key);
    CREATE INDEX IF NOT EXISTS idx_tasks_code ON feature_tasks(work_item_code);
  `);
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

/** 簡易 CSV（支援雙引號欄位） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || (ch === '\r' && src[i + 1] === '\n')) {
      row.push(cell);
      cell = '';
      if (row.some((x) => String(x).trim() !== '')) rows.push(row);
      row = [];
      i += ch === '\r' ? 2 : 1;
      continue;
    }
    if (ch === '\r') {
      row.push(cell);
      cell = '';
      if (row.some((x) => String(x).trim() !== '')) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell);
  if (row.some((x) => String(x).trim() !== '')) rows.push(row);
  return rows;
}

function featureKeyFromStoryId(storyId) {
  return String(storyId || '')
    .trim()
    .replace(/^US-/i, '');
}

function parseTaskTitle(title) {
  const raw = String(title || '').trim();
  const m = raw.match(/^(\d+(?:\.\d+)*)\s*(?:\(([A-Z]{1,5}-\d+)\))?\s*(.*)$/);
  if (!m) {
    return { feature_key: '', work_item_code: '', short_title: raw };
  }
  return {
    feature_key: m[1] || '',
    work_item_code: m[2] || '',
    short_title: (m[3] || '').trim() || raw,
  };
}

function stats() {
  const d = getDb();
  const stories = d.prepare('SELECT COUNT(*) AS c FROM user_stories').get().c;
  const tasks = d.prepare('SELECT COUNT(*) AS c FROM feature_tasks').get().c;
  return {
    dbFile: path.relative(ROOT, DB_FILE).replace(/\\/g, '/'),
    stories,
    tasks,
    csvStoriesExists: fs.existsSync(CSV_STORIES),
    csvTasksExists: fs.existsSync(CSV_TASKS),
  };
}

function importFromCsv({ replace = false } = {}) {
  if (!fs.existsSync(CSV_STORIES) || !fs.existsSync(CSV_TASKS)) {
    throw new Error('找不到 xuqiu CSV：請確認 UserStories 與 Feature_Backlog 兩個檔案存在');
  }
  const d = getDb();
  const storyRows = parseCsv(fs.readFileSync(CSV_STORIES, 'utf8'));
  const taskRows = parseCsv(fs.readFileSync(CSV_TASKS, 'utf8'));
  if (storyRows.length < 2 || taskRows.length < 2) throw new Error('CSV 內容為空或格式異常');

  const stamp = nowIso();
  const tx = d.prepare('BEGIN IMMEDIATE');
  const commit = d.prepare('COMMIT');
  const rollback = d.prepare('ROLLBACK');

  try {
    tx.run();
    if (replace) {
      d.exec('DELETE FROM feature_tasks; DELETE FROM user_stories;');
    }

    const insertStory = d.prepare(`
      INSERT INTO user_stories (seq, story_id, feature_key, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(story_id) DO UPDATE SET
        seq=excluded.seq,
        feature_key=excluded.feature_key,
        description=excluded.description,
        updated_at=excluded.updated_at
    `);

    let storyCount = 0;
    for (const row of storyRows.slice(1)) {
      const [seq, storyId, description] = row;
      if (!storyId || !/^US-/i.test(String(storyId).trim())) continue;
      const sid = String(storyId).trim();
      insertStory.run(
        String(seq || '').trim(),
        sid,
        featureKeyFromStoryId(sid),
        String(description || '').trim(),
        stamp,
        stamp,
      );
      storyCount += 1;
    }

    // 任務無唯一鍵：replace 時已清空；非 replace 則跳過完全相同 title
    const existsTitle = d.prepare('SELECT id FROM feature_tasks WHERE title = ? LIMIT 1');
    const insertTask = d.prepare(`
      INSERT INTO feature_tasks (
        title, feature_key, work_item_code, description, work_item_type,
        area_path, iteration_path, assigned_to, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let taskCount = 0;
    for (const row of taskRows.slice(1)) {
      const [title, description, workItemType, areaPath, iterationPath, assignedTo, state] = row;
      if (!title || !String(title).trim()) continue;
      const t = String(title).trim();
      if (!replace && existsTitle.get(t)) continue;
      const parsed = parseTaskTitle(t);
      insertTask.run(
        t,
        parsed.feature_key,
        parsed.work_item_code,
        String(description || '').trim(),
        String(workItemType || 'Task').trim(),
        String(areaPath || '').trim(),
        String(iterationPath || '').trim(),
        String(assignedTo || '').trim(),
        String(state || 'New').trim(),
        stamp,
        stamp,
      );
      taskCount += 1;
    }

    commit.run();
    return { ok: true, importedStories: storyCount, importedTasks: taskCount, ...stats() };
  } catch (err) {
    try {
      rollback.run();
    } catch {
      // ignore
    }
    throw err;
  }
}

function ensureImported() {
  const s = stats();
  if (s.stories === 0 && s.tasks === 0 && s.csvStoriesExists && s.csvTasksExists) {
    return importFromCsv({ replace: true });
  }
  return s;
}

function listStories({ q = '', limit = 200, offset = 0 } = {}) {
  ensureImported();
  const d = getDb();
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  const like = `%${String(q || '').trim()}%`;
  const hasQ = String(q || '').trim().length > 0;
  const rows = hasQ
    ? d
        .prepare(
          `SELECT s.*,
            (SELECT COUNT(*) FROM feature_tasks t
              WHERE t.feature_key = s.feature_key
                 OR t.feature_key LIKE s.feature_key || '.%'
            ) AS task_count
           FROM user_stories s
           WHERE s.story_id LIKE ? OR s.description LIKE ? OR s.feature_key LIKE ? OR s.seq LIKE ?
           ORDER BY s.seq ASC, s.id ASC
           LIMIT ? OFFSET ?`,
        )
        .all(like, like, like, like, lim, off)
    : d
        .prepare(
          `SELECT s.*,
            (SELECT COUNT(*) FROM feature_tasks t
              WHERE t.feature_key = s.feature_key
                 OR t.feature_key LIKE s.feature_key || '.%'
            ) AS task_count
           FROM user_stories s
           ORDER BY s.seq ASC, s.id ASC
           LIMIT ? OFFSET ?`,
        )
        .all(lim, off);
  const total = hasQ
    ? d
        .prepare(
          `SELECT COUNT(*) AS c FROM user_stories
           WHERE story_id LIKE ? OR description LIKE ? OR feature_key LIKE ? OR seq LIKE ?`,
        )
        .get(like, like, like, like).c
    : d.prepare('SELECT COUNT(*) AS c FROM user_stories').get().c;
  return { total, items: rows };
}

function listTasks({ q = '', featureKey = '', limit = 200, offset = 0 } = {}) {
  ensureImported();
  const d = getDb();
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  const like = `%${String(q || '').trim()}%`;
  const fk = String(featureKey || '').trim();
  const hasQ = String(q || '').trim().length > 0;

  let sql = 'SELECT * FROM feature_tasks WHERE 1=1';
  const params = [];
  if (fk) {
    sql += ' AND (feature_key = ? OR feature_key LIKE ?)';
    params.push(fk, `${fk}.%`);
  }
  if (hasQ) {
    sql +=
      ' AND (title LIKE ? OR description LIKE ? OR work_item_code LIKE ? OR feature_key LIKE ? OR assigned_to LIKE ? OR state LIKE ?)';
    params.push(like, like, like, like, like, like);
  }
  sql += ' ORDER BY feature_key ASC, id ASC LIMIT ? OFFSET ?';
  params.push(lim, off);
  const items = d.prepare(sql).all(...params);

  let countSql = 'SELECT COUNT(*) AS c FROM feature_tasks WHERE 1=1';
  const countParams = [];
  if (fk) {
    countSql += ' AND (feature_key = ? OR feature_key LIKE ?)';
    countParams.push(fk, `${fk}.%`);
  }
  if (hasQ) {
    countSql +=
      ' AND (title LIKE ? OR description LIKE ? OR work_item_code LIKE ? OR feature_key LIKE ? OR assigned_to LIKE ? OR state LIKE ?)';
    countParams.push(like, like, like, like, like, like);
  }
  const total = d.prepare(countSql).get(...countParams).c;
  return { total, items };
}

function getStory(id) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM user_stories WHERE id = ?').get(Number(id));
  if (!row) return null;
  const tasks = listTasks({ featureKey: row.feature_key, limit: 500 }).items;
  return { ...row, tasks };
}

function getTask(id) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM feature_tasks WHERE id = ?').get(Number(id));
  if (!row) return null;
  const stories = d
    .prepare(
      `SELECT * FROM user_stories
       WHERE feature_key = ?
          OR ? LIKE feature_key || '.%'
          OR feature_key LIKE ? || '.%'
       ORDER BY seq ASC`,
    )
    .all(row.feature_key, row.feature_key, row.feature_key);
  return { ...row, stories };
}

function createStory(body) {
  const storyId = String(body.story_id || body.storyId || '').trim();
  if (!storyId) throw new Error('story_id 必填');
  const stamp = nowIso();
  const featureKey = String(
    body.feature_key || body.featureKey || featureKeyFromStoryId(storyId),
  ).trim();
  const d = getDb();
  const info = d
    .prepare(
      `INSERT INTO user_stories (seq, story_id, feature_key, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      String(body.seq || '').trim(),
      storyId,
      featureKey,
      String(body.description || '').trim(),
      stamp,
      stamp,
    );
  const storyRowId = Number(info.lastInsertRowid);
  syncStoryTasks(storyRowId, featureKey, body.tasks, { replace: true });
  return getStory(storyRowId);
}

function updateStory(id, body) {
  const cur = getDb().prepare('SELECT * FROM user_stories WHERE id = ?').get(Number(id));
  if (!cur) throw new Error('找不到用戶故事');
  const storyId = String(body.story_id ?? body.storyId ?? cur.story_id).trim();
  if (!storyId) throw new Error('story_id 必填');
  const featureKey = String(
    body.feature_key ?? body.featureKey ?? featureKeyFromStoryId(storyId),
  ).trim();
  getDb()
    .prepare(
      `UPDATE user_stories SET seq=?, story_id=?, feature_key=?, description=?, updated_at=? WHERE id=?`,
    )
    .run(
      String(body.seq ?? cur.seq).trim(),
      storyId,
      featureKey,
      String(body.description ?? cur.description).trim(),
      nowIso(),
      Number(id),
    );
  if (Object.prototype.hasOwnProperty.call(body, 'tasks')) {
    syncStoryTasks(Number(id), featureKey, body.tasks, { replace: true });
  }
  return getStory(id);
}

/** 依用戶故事的 feature_key 同步關聯任務（有 id 更新、無 id 新增；replace 時刪除表單未包含的既有任務） */
function syncStoryTasks(storyId, featureKey, tasksInput, { replace = false } = {}) {
  const fk = String(featureKey || '').trim();
  if (!fk) return;
  const drafts = Array.isArray(tasksInput) ? tasksInput : [];
  const keepIds = new Set();

  for (const t of drafts) {
    if (!t || typeof t !== 'object') continue;
    const title = String(t.title || '').trim();
    if (!title) continue;
    const payload = {
      title,
      feature_key: fk,
      work_item_code: t.work_item_code || t.workItemCode || '',
      description: t.description || '',
      work_item_type: t.work_item_type || t.workItemType || 'Task',
      area_path: t.area_path || t.areaPath || '',
      iteration_path: t.iteration_path || t.iterationPath || '',
      assigned_to: t.assigned_to || t.assignedTo || '',
      state: t.state || 'New',
    };
    const tid = Number(t.id || 0);
    if (tid > 0) {
      updateTask(tid, payload);
      keepIds.add(tid);
    } else {
      const created = createTask(payload);
      keepIds.add(Number(created.id));
    }
  }

  if (!replace) return;
  const existing = getDb()
    .prepare('SELECT id FROM feature_tasks WHERE feature_key = ?')
    .all(fk);
  for (const row of existing) {
    if (!keepIds.has(Number(row.id))) {
      deleteTask(row.id);
    }
  }
}

function deleteStory(id) {
  const info = getDb().prepare('DELETE FROM user_stories WHERE id = ?').run(Number(id));
  if (!info.changes) throw new Error('找不到用戶故事');
  return { ok: true, id: Number(id) };
}

function createTask(body) {
  const title = String(body.title || '').trim();
  if (!title) throw new Error('title 必填');
  const parsed = parseTaskTitle(title);
  const stamp = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO feature_tasks (
        title, feature_key, work_item_code, description, work_item_type,
        area_path, iteration_path, assigned_to, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      String(body.feature_key || body.featureKey || parsed.feature_key).trim(),
      String(body.work_item_code || body.workItemCode || parsed.work_item_code).trim(),
      String(body.description || '').trim(),
      String(body.work_item_type || body.workItemType || 'Task').trim(),
      String(body.area_path || body.areaPath || '').trim(),
      String(body.iteration_path || body.iterationPath || '').trim(),
      String(body.assigned_to || body.assignedTo || '').trim(),
      String(body.state || 'New').trim(),
      stamp,
      stamp,
    );
  return getTask(info.lastInsertRowid);
}

function updateTask(id, body) {
  const cur = getDb().prepare('SELECT * FROM feature_tasks WHERE id = ?').get(Number(id));
  if (!cur) throw new Error('找不到功能任務');
  const title = String(body.title ?? cur.title).trim();
  if (!title) throw new Error('title 必填');
  const parsed = parseTaskTitle(title);
  getDb()
    .prepare(
      `UPDATE feature_tasks SET
        title=?, feature_key=?, work_item_code=?, description=?, work_item_type=?,
        area_path=?, iteration_path=?, assigned_to=?, state=?, updated_at=?
       WHERE id=?`,
    )
    .run(
      title,
      String(body.feature_key ?? body.featureKey ?? parsed.feature_key ?? cur.feature_key).trim(),
      String(body.work_item_code ?? body.workItemCode ?? parsed.work_item_code ?? cur.work_item_code).trim(),
      String(body.description ?? cur.description).trim(),
      String(body.work_item_type ?? body.workItemType ?? cur.work_item_type).trim(),
      String(body.area_path ?? body.areaPath ?? cur.area_path).trim(),
      String(body.iteration_path ?? body.iterationPath ?? cur.iteration_path).trim(),
      String(body.assigned_to ?? body.assignedTo ?? cur.assigned_to).trim(),
      String(body.state ?? cur.state).trim(),
      nowIso(),
      Number(id),
    );
  return getTask(id);
}

function deleteTask(id) {
  const info = getDb().prepare('DELETE FROM feature_tasks WHERE id = ?').run(Number(id));
  if (!info.changes) throw new Error('找不到功能任務');
  return { ok: true, id: Number(id) };
}

module.exports = {
  DB_FILE,
  CSV_STORIES,
  CSV_TASKS,
  stats,
  importFromCsv,
  ensureImported,
  listStories,
  listTasks,
  getStory,
  getTask,
  createStory,
  updateStory,
  deleteStory,
  createTask,
  updateTask,
  deleteTask,
};
