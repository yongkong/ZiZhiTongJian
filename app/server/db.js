import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 连接 + schema + 老库迁移的唯一入口: index.js(服务) 与 content/cli.js(校验) 共用。
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'tongjian.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

export const today = () => new Date().toISOString().slice(0, 10)
export const now = () => new Date().toISOString()

// ---------------------------------------------------------------- 学习状态表 (内容表全局共享, 状态表按 user_id 隔离)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reading_state (
  user_id INTEGER NOT NULL,
  volume_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | done
  last_opened TEXT,
  updated_at TEXT,
  PRIMARY KEY (user_id, volume_id)
);
CREATE TABLE IF NOT EXISTS lessons (
  slug TEXT PRIMARY KEY, seq INTEGER, title TEXT, subtitle TEXT,
  focus TEXT, content TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lesson_state (
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  best_score INTEGER,
  completed_at TEXT,
  PRIMARY KEY (user_id, slug)
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY, lesson_slug TEXT NOT NULL,
  front TEXT NOT NULL, back TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS card_state (
  user_id INTEGER NOT NULL,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  ease REAL DEFAULT 2.5, interval_days REAL DEFAULT 0,
  reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  due TEXT NOT NULL, last_grade INTEGER, updated_at TEXT,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS study_log (
  day TEXT NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY, section_id INTEGER NOT NULL,
  pattern TEXT NOT NULL, note TEXT, kind TEXT NOT NULL DEFAULT 'boy'
);
CREATE INDEX IF NOT EXISTS idx_highlights_sec ON highlights(section_id);
`)

// 老库升级: highlights 无 kind 列时补上
try { db.prepare('SELECT kind FROM highlights LIMIT 1').get() } catch {
  db.exec("ALTER TABLE highlights ADD COLUMN kind TEXT NOT NULL DEFAULT 'boy'")
}

// 老库升级: 单用户状态表并入默认账号 local, 原有学习进度不丢失
{
  const hasUid = (t) => db.prepare(`PRAGMA table_info(${t})`).all().some((c) => c.name === 'user_id')
  if (!hasUid('reading_state')) {
    const uid = db.prepare('INSERT INTO users(name,password_hash,created_at) VALUES(?,?,?)')
      .run('local', bcrypt.hashSync('local1234', 10), now()).lastInsertRowid
    console.log('检测到旧版单用户数据: 已迁移到默认账号 local (密码 local1234), 登录后可继续原进度')
    db.transaction(() => {
      db.exec(`
      CREATE TABLE reading_state_new (user_id INTEGER NOT NULL, volume_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'open', last_opened TEXT, updated_at TEXT,
        PRIMARY KEY (user_id, volume_id));
      INSERT INTO reading_state_new SELECT ${uid}, volume_id, status, last_opened, updated_at FROM reading_state;
      DROP TABLE reading_state;
      ALTER TABLE reading_state_new RENAME TO reading_state;
      CREATE TABLE lesson_state_new (user_id INTEGER NOT NULL, slug TEXT NOT NULL,
        status TEXT DEFAULT 'in_progress', best_score INTEGER, completed_at TEXT,
        PRIMARY KEY (user_id, slug));
      INSERT INTO lesson_state_new SELECT ${uid}, slug, status, best_score, completed_at FROM lesson_state;
      DROP TABLE lesson_state;
      ALTER TABLE lesson_state_new RENAME TO lesson_state;
      CREATE TABLE card_state_new (user_id INTEGER NOT NULL, card_id INTEGER NOT NULL REFERENCES cards(id),
        ease REAL DEFAULT 2.5, interval_days REAL DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
        due TEXT NOT NULL, last_grade INTEGER, updated_at TEXT,
        PRIMARY KEY (user_id, card_id));
      INSERT INTO card_state_new SELECT ${uid}, card_id, ease, interval_days, reps, lapses, due, last_grade, updated_at FROM card_state;
      DROP TABLE card_state;
      ALTER TABLE card_state_new RENAME TO card_state;
      CREATE TABLE study_log_new (day TEXT NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL,
        detail TEXT, created_at TEXT NOT NULL);
      INSERT INTO study_log_new SELECT day, ${uid}, action, detail, created_at FROM study_log;
      DROP TABLE study_log;
      ALTER TABLE study_log_new RENAME TO study_log;
      `)
    })()
  }
}
db.exec(`
CREATE INDEX IF NOT EXISTS idx_study_user_day ON study_log(user_id, day);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)
