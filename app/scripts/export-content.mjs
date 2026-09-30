// SQLite 语料 → content/ 静态 JSON (纯内容站的事实源生成器)。
// 用法: node scripts/export-content.mjs [--check]
//   --check 只做课程校验与锚解析, 不写任何文件
// 产物 (全部 UTF-8 JSON, 提交进仓库, 静态站构建只依赖 content/):
//   content/volumes/index.json               卷目录 [{num,title,era,era_group,range_text}]
//   content/volumes/<num>.json               卷正文 {volume, paragraphs}
//   content/boyang/books.json                72 册 [{id,title,box}]
//   content/boyang/books/<id>.json           册 {book, sections}
//   content/boyang/sections/<id>.json        章节 {section, paragraphs, highlights}
//   content/boyang/year-index.json           年份→章节索引 (阅读器「看白话」跳转)
//   content/lessons/index.json               课程目录 [{slug,seq,title,subtitle,focus}]
//   content/lessons/<slug>.json              课程全文 (passage 块已烘焙文白段落与批注)
//   content/cards.json                       复习卡片 [{id,lesson_slug,front,back}]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { checkLessons } from '../content-src/read.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'content')
const CHECK_ONLY = process.argv.includes('--check')

const db = new Database(path.join(ROOT, 'data', 'tongjian.db'), { readonly: true, fileMustExist: true })

// 语料读取 (校验期内缓存; 与锚解析约定一致: 卷号即 volumes.id)
if (db.prepare('SELECT COUNT(*) n FROM volumes WHERE id != num').get().n > 0)
  throw new Error('volumes.id 与 num 不一致, 锚解析语义被破坏, 请先修复 ingest')
const corpusGetters = () => {
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

// ---------- 1. 课程源校验 + 锚解析 (失败即中止)
const { lessons, errors } = checkLessons(corpusGetters())
if (errors.length) {
  console.error(`\n✗ 内容校验失败 ${errors.length} 处:`)
  for (const e of errors) console.error(`  - [${e.where}] ${e.message}`)
  process.exit(1)
}
console.log(`✓ 课程源校验通过: ${lessons.length} 课`)
if (CHECK_ONLY) process.exit(0)

// ---------- 2. 写盘
fs.rmSync(OUT, { recursive: true, force: true })
const wrote = []
const write = (rel, data) => {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data))
  wrote.push(rel)
}

// 卷: 目录 + 正文
const vols = db.prepare('SELECT num, title, era, era_group, range_text FROM volumes ORDER BY num').all()
write('volumes/index.json', vols)
const volParas = db.prepare(`SELECT seq, kind, segments, plain, tj_year FROM paragraphs WHERE volume_id=? ORDER BY seq`)
for (const v of vols) {
  const paragraphs = volParas.all(v.num).map((p) => ({ ...p, segments: JSON.parse(p.segments) }))
  write(`volumes/${v.num}.json`, { volume: v, paragraphs })
}

// 柏杨: 册 / 章节 / 年份索引
const books = db.prepare('SELECT id, title, box FROM boyang_books WHERE id>0 ORDER BY id').all()
write('boyang/books.json', books)
const bookSecs = db.prepare('SELECT id, kind, title, seq, y0, y1 FROM boyang_sections WHERE book_id=? ORDER BY seq')
const secParas = db.prepare('SELECT seq, kind, text, by_year, file FROM boyang_paragraphs WHERE section_id=? ORDER BY seq')

// 高亮按章节聚合 (章节页展示本章节全部批注; 课程 passage 页按 kind 分流, 见下方烘焙)
const hlBySec = new Map()
for (const { highlights } of lessons)
  for (const h of highlights) {
    if (!hlBySec.has(h.section_id)) hlBySec.set(h.section_id, [])
    hlBySec.get(h.section_id).push(h)
  }

const yearRows = []
let nSections = 0
for (const b of books) {
  const sections = bookSecs.all(b.id)
  write(`boyang/books/${b.id}.json`, { book: b, sections })
  for (const s of sections) {
    nSections += 1
    write(`boyang/sections/${s.id}.json`, {
      section: { id: s.id, title: s.title, book_id: b.id },
      paragraphs: secParas.all(s.id),
      highlights: (hlBySec.get(s.id) ?? []).map(({ pattern, note }) => ({ pattern, note })),
    })
    if (s.y0 != null && s.y1 != null) yearRows.push({ id: s.id, title: s.title, book_title: b.title, y0: s.y0, y1: s.y1 })
  }
}
write('boyang/year-index.json', yearRows)

// 课程: 目录 + 全文 (passage 块烘焙文白段落与两路批注, 站点运行期不再需要语料)
const lessonsIndex = []
for (const { slug, lesson } of lessons) {
  lessonsIndex.push({ slug, seq: lesson.seq, title: lesson.title, subtitle: lesson.subtitle, focus: lesson.focus })
  const content = structuredClone(lesson.content)
  for (const b of content?.blocks ?? []) {
    if (b?.type !== 'passage' || !b.orig?.seqs || !b.boy?.seqs) continue
    const inVol = b.orig.seqs.map(() => '?').join(',')
    b.orig.paras = db.prepare(`SELECT seq, kind, segments, plain, tj_year FROM paragraphs
      WHERE volume_id=? AND seq IN (${inVol}) ORDER BY seq`).all(b.orig.volume, ...b.orig.seqs)
      .map((p) => ({ ...p, segments: JSON.parse(p.segments) }))
    const inSec = b.boy.seqs.map(() => '?').join(',')
    b.boy.paras = db.prepare(`SELECT seq, kind, text, by_year, file FROM boyang_paragraphs
      WHERE section_id=? AND seq IN (${inSec}) ORDER BY seq`).all(b.boy.section, ...b.boy.seqs)
    const hls = hlBySec.get(b.boy.section) ?? []
    b.highlights = hls.filter((h) => h.kind === 'boy').map(({ pattern, note }) => ({ pattern, note }))
    b.origHighlights = hls.filter((h) => h.kind === 'orig').map(({ pattern, note }) => ({ pattern, note }))
  }
  write(`lessons/${slug}.json`, {
    slug, seq: lesson.seq, title: lesson.title, subtitle: lesson.subtitle, focus: lesson.focus,
    content,
  })
}
write('lessons/index.json', lessonsIndex)

// 复习卡片 (练习模式: 站点端随机抽卡, 无排期)
write('cards.json', db.prepare('SELECT id, lesson_slug, front, back FROM cards ORDER BY id').all())

// ---------- 3. 报告
let bytes = 0
for (const rel of wrote) bytes += fs.statSync(path.join(OUT, rel)).size
console.log(`✓ 导出 ${wrote.length} 个文件 · ${(bytes / 1024 / 1024).toFixed(1)} MB → content/`)
console.log(`  卷 ${vols.length} · 册 ${books.length} · 章节 ${nSections} · 课程 ${lessons.length} · 卡片 ${wrote.includes('cards.json') ? db.prepare('SELECT COUNT(*) n FROM cards').get().n : 0}`)
