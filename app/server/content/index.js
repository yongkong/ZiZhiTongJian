// 内容管线 (深模块, 见 CONTEXT.md): 读盘 → 校验 → 解析锚 → 播种。
// 窄接口: loadContent(db) 服务启动时用, 失败 fail fast; check(db) 校验报告 (CLI: npm run content:check)。
// 课程目录: server/content/lessons/<slug>/{lesson.json, highlights.json} — 文件是事实源, DB 只存解析结果。

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveOrig, resolveBoy, resolveHighlightSection } from './resolve.js'
import { validateLesson, validateHighlightEntry } from './validate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LESSONS_DIR = path.join(__dirname, 'lessons')

// ---------- 读盘
function readSources() {
  const out = { lessons: [], errors: [] }
  let dirs = []
  try {
    dirs = fs.readdirSync(LESSONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort()
  } catch {
    out.errors.push({ where: '目录', message: `课程目录不存在或不可读: ${LESSONS_DIR}` })
    return out
  }
  if (dirs.length === 0) out.errors.push({ where: '目录', message: 'server/content/lessons/ 下没有任何课程目录' })
  for (const dir of dirs) {
    const dirPath = path.join(LESSONS_DIR, dir)
    // 空目录 = 占位待写, 跳过; 有任何文件则严格校验 (缺 lesson.json 是错误)
    if (fs.readdirSync(dirPath).length === 0) continue
    let lesson = null
    let highlights = []
    for (const file of ['lesson.json', 'highlights.json']) {
      const p = path.join(dirPath, file)
      if (!fs.existsSync(p)) {
        if (file === 'lesson.json') out.errors.push({ where: dir, message: '缺少 lesson.json' })
        continue
      }
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'))
        if (file === 'lesson.json') lesson = data
        else highlights = data
      } catch (err) {
        out.errors.push({ where: `${dir}/${file}`, message: `JSON 解析失败: ${err.message}` })
      }
    }
    if (lesson) out.lessons.push({ slug: dir, lesson, highlights: Array.isArray(highlights) ? highlights : [] })
  }
  return out
}

// ---------- 语料读取 (一次 check 内缓存; 位置 ID 只在此处出现)
function corpusGetters(db) {
  const vols = new Map()
  const books = new Map()
  const secs = new Map()
  return {
    getVol(v) {
      if (!vols.has(v)) vols.set(v,
        db.prepare('SELECT seq, plain AS text FROM paragraphs WHERE volume_id=? ORDER BY seq').all(v))
      return vols.get(v)
    },
    getBook(b) {
      if (!books.has(b)) books.set(b,
        db.prepare(`SELECT s.id AS section, p.seq, p.text FROM boyang_paragraphs p
          JOIN boyang_sections s ON s.id = p.section_id WHERE s.book_id=? ORDER BY s.id, p.seq`).all(b))
      return books.get(b)
    },
    getSec(sid) {
      if (!secs.has(sid)) secs.set(sid,
        db.prepare('SELECT seq, text FROM boyang_paragraphs WHERE section_id=? ORDER BY seq').all(sid))
      return secs.get(sid)
    },
  }
}

// ---------- 校验 + 解析 (不写库)
export function check(db) {
  const { lessons, errors } = readSources()
  const { getVol, getBook, getSec } = corpusGetters(db)
  const seenSeq = new Map()
  const resolved = []
  for (const { slug, lesson, highlights } of lessons) {
    for (const e of validateLesson(slug, lesson)) errors.push({ where: `${slug} › lesson.json`, message: e })
    if (Number.isInteger(lesson.seq)) {
      if (seenSeq.has(lesson.seq)) errors.push({ where: `${slug} › lesson.json`, message: `seq ${lesson.seq} 与 ${seenSeq.get(lesson.seq)} 重复` })
      else seenSeq.set(lesson.seq, slug)
    }
    // 解析锚 (有校验错也继续, 汇总更多错误)
    const content = structuredClone(lesson.content)
    if (Array.isArray(content?.blocks)) {
      for (const [bi, b] of content.blocks.entries()) {
        if (b?.type !== 'passage') continue
        const where = `${slug} › 块${bi + 1}「${b.title || ''}」`
        try { b.orig = resolveOrig(b.orig, getVol) } catch (err) { errors.push({ where, message: `orig: ${err.message}` }) }
        try { b.boy = resolveBoy(b.boy, getBook) } catch (err) { errors.push({ where, message: `boy: ${err.message}` }) }
      }
    }
    // 指向各章节的 passage (供 orig 高亮落地校验)
    const passageSecs = new Map()
    for (const b of content?.blocks ?? []) {
      if (b?.type === 'passage' && Number.isInteger(b.boy?.section) && Number.isInteger(b.orig?.volume))
        passageSecs.set(b.boy.section, b.orig.volume)
    }
    const rh = []
    highlights.forEach((h, hi) => {
      const where = `${slug} › highlights[${hi}]`
      const herrs = validateHighlightEntry(h)
      if (herrs.length) {
        for (const m of herrs) errors.push({ where, message: m })
        return
      }
      try {
        const section_id = resolveHighlightSection(h.book, h.anchor, getBook)
        const pattern = h.pattern ?? h.anchor
        // pattern 落地校验: 前端靠逐字 indexOf 涂色, 语料中不存在的 pattern 是静默死数据
        if (h.kind === 'boy') {
          if (!getSec(section_id).some((p) => p.text.includes(pattern)))
            throw new Error(`pattern 未在第 ${section_id} 章节段落中出现: 「${pattern}」(请按语料原文逐字誊写)`)
        } else {
          const vol = passageSecs.get(section_id)
          if (vol === undefined)
            throw new Error(`orig 高亮指向章节 ${section_id}, 但本课没有 boy 解析到该章节的 passage`)
          if (!getVol(vol).some((p) => p.text.includes(pattern)))
            throw new Error(`pattern 未在卷 ${vol} 原文段落中出现: 「${pattern}」(请按语料原文逐字誊写)`)
        }
        rh.push({ section_id, pattern, note: h.note ?? '', kind: h.kind })
      } catch (err) {
        errors.push({ where, message: err.message })
      }
    })
    resolved.push({ slug, lesson: { ...lesson, content }, highlights: rh })
  }
  return { lessons: resolved, errors }
}

// ---------- 播种
// 卡片按 (lesson_slug, front) 三向同步: front 不变即同一张卡, 复习进度 (card_state) 保留
function syncCards(db, slug, quiz) {
  const desired = quiz.map((q) => ({ front: q.q, back: q.options[q.answer] + '——' + q.explain }))
  const existing = db.prepare('SELECT id, front, back FROM cards WHERE lesson_slug=?').all(slug)
  const want = new Map(desired.map((d) => [d.front, d.back]))
  const have = new Set(existing.map((c) => c.front))
  const stat = { add: 0, del: 0, upd: 0 }
  for (const c of existing) {
    if (!want.has(c.front)) {
      db.prepare('DELETE FROM card_state WHERE card_id=?').run(c.id)
      db.prepare('DELETE FROM cards WHERE id=?').run(c.id)
      stat.del += 1
    } else if (want.get(c.front) !== c.back) {
      db.prepare('UPDATE cards SET back=? WHERE id=?').run(want.get(c.front), c.id)
      stat.upd += 1
    }
  }
  const ins = db.prepare('INSERT INTO cards(lesson_slug,front,back) VALUES(?,?,?)')
  for (const d of desired) if (!have.has(d.front)) { ins.run(slug, d.front, d.back); stat.add += 1 }
  return stat
}

export function loadContent(db) {
  const { lessons, errors } = check(db)
  if (errors.length) {
    console.error(`\n✗ 内容校验失败 ${errors.length} 处:`)
    for (const e of errors) console.error(`  - [${e.where}] ${e.message}`)
    console.error('修复课程文件后重试; npm run content:check 可不启服务器查看全量报告。\n')
    process.exit(1)
  }
  const stat = { add: 0, del: 0, upd: 0 }
  let nHl = 0
  db.transaction(() => {
    const up = db.prepare(`INSERT INTO lessons(slug,seq,title,subtitle,focus,content) VALUES(?,?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET seq=excluded.seq, title=excluded.title,
        subtitle=excluded.subtitle, focus=excluded.focus, content=excluded.content`)
    const seen = new Set()
    for (const { slug, lesson, highlights } of lessons) {
      up.run(slug, lesson.seq, lesson.title, lesson.subtitle, lesson.focus, JSON.stringify(lesson.content))
      const s = syncCards(db, slug, lesson.content.quiz ?? [])
      stat.add += s.add; stat.del += s.del; stat.upd += s.upd
      seen.add(slug)
    }
    // 高亮是纯种子数据 (无运行时写入), 全量重建
    db.prepare('DELETE FROM highlights').run()
    const insH = db.prepare('INSERT INTO highlights(section_id,pattern,note,kind) VALUES(?,?,?,?)')
    for (const { highlights } of lessons)
      for (const h of highlights) { insH.run(h.section_id, h.pattern, h.note, h.kind); nHl += 1 }
    // 清理磁盘上已删除的课程
    for (const r of db.prepare('SELECT slug FROM lessons').all()) {
      if (seen.has(r.slug)) continue
      for (const c of db.prepare('SELECT id FROM cards WHERE lesson_slug=?').all(r.slug))
        db.prepare('DELETE FROM card_state WHERE card_id=?').run(c.id)
      db.prepare('DELETE FROM cards WHERE lesson_slug=?').run(r.slug)
      db.prepare('DELETE FROM lessons WHERE slug=?').run(r.slug)
      db.prepare('DELETE FROM lesson_state WHERE slug=?').run(r.slug)
      console.log('removed lesson not in files:', r.slug)
    }
  })()
  console.log(`内容管线: ${lessons.length} 课 · 卡片 +${stat.add} -${stat.del} ~${stat.upd} · 高亮 ${nHl} 条`)
}
