import express from 'express'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, today, now } from './db.js'
import { loadContent } from './content/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTRACT_IMAGES = path.resolve(__dirname, '..', '..', 'extract', 'boyang', 'images')

function log(userId, action, detail = null) {
  if (!userId) return   // 未登录浏览不计入学习日志
  db.prepare('INSERT INTO study_log(day,user_id,action,detail,created_at) VALUES(?,?,?,?,?)')
    .run(today(), userId, action, detail, now())
}

// ---------------------------------------------------------------- 课程种子 (server/content/lessons/<slug>/ 为准, 每次启动同步)
loadContent(db)

// ---------------------------------------------------------------- API
const app = express()
app.use(express.json())
// 柏杨版地图图片(直接挂载解包目录, 不复制)
app.use('/boyang-img', express.static(EXTRACT_IMAGES))

// ---------------------------------------------------------------- 认证: 注册/登录/会话 (cookie tj_session)
const COOKIE = 'tj_session'
const SESSION_DAYS = 30
app.use(cookieParser())

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
  db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)')
    .run(token, userId, now(), expires.toISOString())
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', expires })
}

// 每个请求解析当前用户: q.user = { id, name } | null
app.use((q, _s, next) => {
  const token = q.cookies?.[COOKIE]
  q.user = token
    ? db.prepare(`SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?`).get(token, now()) || null
    : null
  next()
})

const requireUser = (q, s, next) => (q.user ? next() : s.status(401).json({ error: 'unauthorized' }))

app.post('/api/auth/register', async (q, s) => {
  const name = String(q.body?.name || '').trim()
  const password = String(q.body?.password || '')
  if (!name || name.length > 30) return s.status(400).json({ error: '用户名需 1-30 个字符' })
  if (password.length < 6) return s.status(400).json({ error: '密码至少 6 位' })
  if (db.prepare('SELECT id FROM users WHERE name=?').get(name))
    return s.status(409).json({ error: '用户名已被占用' })
  const hash = await bcrypt.hash(password, 10)
  const info = db.prepare('INSERT INTO users(name,password_hash,created_at) VALUES(?,?,?)').run(name, hash, now())
  startSession(s, info.lastInsertRowid)
  s.json({ id: info.lastInsertRowid, name })
})

app.post('/api/auth/login', async (q, s) => {
  const name = String(q.body?.name || '').trim()
  const u = db.prepare('SELECT * FROM users WHERE name=?').get(name)
  if (!u || !(await bcrypt.compare(String(q.body?.password || ''), u.password_hash)))
    return s.status(401).json({ error: '用户名或密码错误' })
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now())
  startSession(s, u.id)
  s.json({ id: u.id, name: u.name })
})

app.post('/api/auth/logout', (q, s) => {
  const token = q.cookies?.[COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token)
  s.clearCookie(COOKIE)
  s.json({ ok: true })
})

app.get('/api/auth/me', (q, s) => s.json({ user: q.user }))

const J = (s) => JSON.parse(s)

app.get('/api/health', (_q, s) => s.json({ ok: true }))

// --- 卷列表(按纪分组) + 阅读状态
app.get('/api/volumes', (q, s) => {
  const rows = db.prepare(`
    SELECT v.id, v.num, v.title, v.era, v.era_group, v.range_text,
           COALESCE(r.status,'') AS status
    FROM volumes v LEFT JOIN reading_state r ON r.volume_id = v.id AND r.user_id = ?
    ORDER BY v.num`).all(q.user?.id ?? -1)
  s.json(rows)
})

app.get('/api/volumes/:num', (q, s) => {
  const vol = db.prepare('SELECT * FROM volumes WHERE num=?').get(q.params.num)
  if (!vol) return s.status(404).json({ error: 'not found' })
  const paras = db.prepare(`
    SELECT seq, kind, segments, plain, tj_year FROM paragraphs
    WHERE volume_id=? ORDER BY seq`).all(vol.id)
  if (q.user) {
    db.prepare(`INSERT INTO reading_state(user_id,volume_id,status,last_opened,updated_at)
      VALUES(?,?,COALESCE((SELECT status FROM reading_state WHERE user_id=? AND volume_id=?),'open'),?,?)
      ON CONFLICT(user_id,volume_id) DO UPDATE SET last_opened=excluded.last_opened, updated_at=excluded.updated_at`)
      .run(q.user.id, vol.id, q.user.id, vol.id, today(), now())
  }
  log(q.user?.id, 'open_volume', String(vol.num))
  s.json({ volume: vol, paragraphs: paras.map((p) => ({ ...p, segments: J(p.segments) })) })
})

app.post('/api/reading/:num', requireUser, (q, s) => {
  const { status } = q.body || {}
  if (!['open', 'done'].includes(status)) return s.status(400).json({ error: 'bad status' })
  const vol = db.prepare('SELECT id FROM volumes WHERE num=?').get(q.params.num)
  if (!vol) return s.status(404).json({ error: 'not found' })
  db.prepare(`INSERT INTO reading_state(user_id,volume_id,status,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(user_id,volume_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`)
    .run(q.user.id, vol.id, status, now())
  log(q.user.id, 'volume_' + status, String(q.params.num))
  s.json({ ok: true })
})

// --- 柏杨版
app.get('/api/boyang/books', (_q, s) => {
  s.json(db.prepare('SELECT id,title,box FROM boyang_books WHERE id>0 ORDER BY id').all())
})
app.get('/api/boyang/books/:id', (q, s) => {
  const book = db.prepare('SELECT * FROM boyang_books WHERE id=?').get(q.params.id)
  if (!book) return s.status(404).json({ error: 'not found' })
  const sections = db.prepare(
    'SELECT id,kind,title,seq,y0,y1 FROM boyang_sections WHERE book_id=? ORDER BY seq').all(book.id)
  s.json({ book, sections })
})
app.get('/api/boyang/sections/:id', (q, s) => {
  const sec = db.prepare('SELECT * FROM boyang_sections WHERE id=?').get(q.params.id)
  if (!sec) return s.status(404).json({ error: 'not found' })
  const paras = db.prepare(
    'SELECT seq,kind,text,by_year,file FROM boyang_paragraphs WHERE section_id=? ORDER BY seq').all(sec.id)
  const highlights = db.prepare(
    'SELECT pattern,note FROM highlights WHERE section_id=?').all(sec.id)
  s.json({ section: sec, paragraphs: paras, highlights })
})
// 按年份找柏杨章节(阅读器「看白话」跳转用)
app.get('/api/boyang/by-year/:year', (q, s) => {
  const y = Number(q.params.year)
  const rows = db.prepare(`
    SELECT s.id, s.title, b.title AS book_title FROM boyang_sections s
    JOIN boyang_books b ON b.id = s.book_id
    WHERE s.y0 <= ? AND ? <= s.y1 ORDER BY s.id LIMIT 3`).all(y, y)
  s.json(rows)
})

// --- 课程
app.get('/api/lessons', (q, s) => {
  const rows = db.prepare(`
    SELECT l.slug, l.seq, l.title, l.subtitle, l.focus,
           COALESCE(st.status,'new') AS status, st.best_score
    FROM lessons l LEFT JOIN lesson_state st ON st.slug = l.slug AND st.user_id = ?
    ORDER BY l.seq`).all(q.user?.id ?? -1)
  s.json(rows)
})
app.get('/api/lessons/:slug', (q, s) => {
  const l = db.prepare('SELECT * FROM lessons WHERE slug=?').get(q.params.slug)
  if (!l) return s.status(404).json({ error: 'not found' })
  const st = db.prepare('SELECT * FROM lesson_state WHERE slug=? AND user_id=?').get(l.slug, q.user?.id ?? -1)
  s.json({ ...l, content: J(l.content), state: st || null })
})
// 文白对照段落包(课程页用)
app.post('/api/passage', (q, s) => {
  const { volume, seqs, section } = q.body || {}
  const orig = db.prepare(`
    SELECT seq, kind, segments, plain FROM paragraphs
    WHERE volume_id=? AND seq IN (${(seqs || []).map(() => '?').join(',') || "''"})
    ORDER BY seq`).all(volume, ...(seqs || []))
  const boy = db.prepare(`
    SELECT seq, kind, text FROM boyang_paragraphs
    WHERE section_id=? AND seq IN (${(q.body.bseqs || []).map(() => '?').join(',') || "''"})
    ORDER BY seq`).all(section, ...(q.body.bseqs || []))
  const highlights = db.prepare(
    "SELECT pattern,note FROM highlights WHERE section_id=? AND kind='boy'").all(section)
  const origHighlights = db.prepare(
    "SELECT pattern,note FROM highlights WHERE section_id=? AND kind='orig'").all(section)
  s.json({
    orig: orig.map((p) => ({ ...p, segments: J(p.segments) })),
    boy,
    highlights,
    origHighlights,
  })
})
app.post('/api/lessons/:slug/complete', requireUser, (q, s) => {
  const { score } = q.body || {}
  const l = db.prepare('SELECT slug FROM lessons WHERE slug=?').get(q.params.slug)
  if (!l) return s.status(404).json({ error: 'not found' })
  db.prepare(`INSERT INTO lesson_state(user_id,slug,status,best_score,completed_at) VALUES(?,?,?,?,?)
    ON CONFLICT(user_id,slug) DO UPDATE SET status='done', best_score=MAX(best_score,excluded.best_score), completed_at=excluded.completed_at`)
    .run(q.user.id, l.slug, 'done', score ?? 0, now())
  log(q.user.id, 'lesson_done', `${l.slug}:${score ?? 0}`)
  s.json({ ok: true })
})

// --- 复习 (简化 SM-2) — 队列对游客开放(练习模式), 作答排期仍需登录
app.get('/api/review/queue', (q, s) => {
  const rows = db.prepare(`
    SELECT c.id, c.front, c.back, cs.due, cs.reps, cs.interval_days
    FROM cards c LEFT JOIN card_state cs ON cs.card_id = c.id AND cs.user_id = ?
    WHERE COALESCE(cs.due,'0') <= ?
    ORDER BY COALESCE(cs.reps,0), c.id LIMIT 20`).all(q.user?.id ?? -1, today())
  s.json(rows)
})
app.post('/api/review/answer', requireUser, (q, s) => {
  const { cardId, grade } = q.body || {}   // grade: 0 again / 1 good / 2 easy
  let cs = db.prepare('SELECT * FROM card_state WHERE user_id=? AND card_id=?').get(q.user.id, cardId)
  if (!cs) {   // 新卡首次作答: 建立该用户的卡片状态
    db.prepare('INSERT INTO card_state(user_id,card_id,due) VALUES(?,?,?)').run(q.user.id, cardId, today())
    cs = db.prepare('SELECT * FROM card_state WHERE user_id=? AND card_id=?').get(q.user.id, cardId)
  }
  let { ease, interval_days, reps, lapses } = cs
  if (grade === 0) {
    ease = Math.max(1.3, ease - 0.2)
    interval_days = 0
    reps = 0
    lapses += 1
  } else {
    if (grade === 2) ease = Math.min(3.2, ease + 0.1)
    if (reps === 0) interval_days = grade === 2 ? 3 : 1
    else if (reps === 1) interval_days = grade === 2 ? 8 : 3
    else interval_days = Math.round(interval_days * ease * (grade === 2 ? 1.4 : 1))
    reps += 1
  }
  const due = new Date(Date.now() + interval_days * 86400000).toISOString().slice(0, 10)
  db.prepare(`UPDATE card_state SET ease=?,interval_days=?,reps=?,lapses=?,due=?,last_grade=?,updated_at=?
    WHERE user_id=? AND card_id=?`)
    .run(ease, interval_days, reps, lapses, due, grade, now(), q.user.id, cardId)
  log(q.user.id, 'review', String(cardId))
  s.json({ ok: true, next_due: due, interval_days })
})

// --- 统计 (游客返回全 0 进度, 登录后为个人数据)
app.get('/api/stats', (q, s) => {
  const uid = q.user?.id ?? -1
  const vols = db.prepare('SELECT COUNT(*) n FROM volumes').get().n
  const done = db.prepare("SELECT COUNT(*) n FROM reading_state WHERE user_id=? AND status='done'").get(uid).n
  const lessonsDone = db.prepare("SELECT COUNT(*) n FROM lesson_state WHERE user_id=? AND status='done'").get(uid).n
  const lessonsAll = db.prepare('SELECT COUNT(*) n FROM lessons').get().n
  const due = db.prepare("SELECT COUNT(*) n FROM cards c JOIN card_state cs ON cs.card_id=c.id AND cs.user_id=? WHERE cs.due <= ?").get(uid, today()).n
  // streak: 连续有 study_log 的天数
  const days = new Set(db.prepare('SELECT DISTINCT day FROM study_log WHERE user_id=?').all(uid).map((r) => r.day))
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) { streak += 1; d.setDate(d.getDate() - 1) } else break
  }
  const nextLesson = db.prepare(`
    SELECT l.slug FROM lessons l LEFT JOIN lesson_state st ON st.slug=l.slug AND st.user_id=?
    WHERE st.status IS NULL OR st.status != 'done' ORDER BY l.seq LIMIT 1`).get(uid)
  s.json({ vols, done, lessonsDone, lessonsAll, due, streak, nextLesson: nextLesson?.slug ?? 'sanjiafenjin' })
})

// 生产模式: 服务构建产物
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_q, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = 3001
app.listen(PORT, () => console.log(`tongjian server on http://localhost:${PORT}`))
