// 内容管线 (深模块, 见 CONTEXT.md): 读盘 → 校验 → 解析锚。
// 窄接口: checkLessons(corpus) 供 scripts/export-content.mjs 调用, 失败汇总报告。
// 课程目录: content-src/lessons/<slug>/{lesson.json, highlights.json} — 文件是事实源, 导出只存解析结果。
// corpus: { getVol(volumeId) → [{seq, text}], getBook(bookId) → [{section, seq, text}], getSec(sectionId) → [{seq, text}] }

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
  if (dirs.length === 0) out.errors.push({ where: '目录', message: 'content-src/lessons/ 下没有任何课程目录' })
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

// ---------- 校验 + 解析 (不落盘)
export function checkLessons(corpus) {
  const { getVol, getBook, getSec } = corpus
  const { lessons, errors } = readSources()
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
