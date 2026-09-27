// lesson.json / highlights.json 的结构校验 (纯函数, 不查库)。
// 校验失败的课会在 check() 汇入报告; 未知块类型在这里显式报错, 而不是渲染时静默落错分支。

export const BLOCK_TYPES = ['narration', 'passage', 'insight']
const HIGHLIGHT_KINDS = new Set(['boy', 'orig'])

const isStr = (v) => typeof v === 'string' && v.trim().length > 0

const strArr = (v, name, min, errs) => {
  if (!Array.isArray(v) || v.length < min || !v.every(isStr))
    errs.push(`${name} 需为 ≥${min} 条非空字符串数组`)
}

export function validateLesson(slug, l) {
  const e = []
  if (!l || typeof l !== 'object') return ['lesson.json 顶层需为对象']
  if (l.slug !== slug) e.push(`slug (${JSON.stringify(l.slug)}) 与目录名 (${slug}) 不一致`)
  if (!Number.isInteger(l.seq) || l.seq < 1) e.push('seq 需为正整数')
  for (const f of ['title', 'subtitle', 'focus']) if (!isStr(l[f])) e.push(`${f} 不能为空`)
  const c = l.content
  if (!c || typeof c !== 'object') { e.push('content 缺失'); return e }
  if (c.keyPoints !== undefined) strArr(c.keyPoints, 'keyPoints', 1, e)
  strArr(c.intro, 'intro', 1, e)
  if (!Array.isArray(c.blocks) || c.blocks.length === 0) e.push('blocks 需为非空数组')
  else c.blocks.forEach((b, i) => {
    if (!b || typeof b !== 'object') { e.push(`blocks[${i}] 需为对象`); return }
    if (!BLOCK_TYPES.includes(b.type)) {
      e.push(`blocks[${i}] 未知块类型 ${JSON.stringify(b.type)} (支持: ${BLOCK_TYPES.join(' / ')})`)
      return
    }
    if (!isStr(b.title)) e.push(`blocks[${i}] title 不能为空`)
    if (b.type === 'narration' && !isStr(b.text)) e.push(`blocks[${i}] (narration) text 不能为空`)
    if (b.type === 'passage') {
      for (const side of ['orig', 'boy']) {
        const segs = b[side]
        const locKey = side === 'orig' ? 'volume' : 'book'
        if (!Array.isArray(segs) || segs.length === 0) { e.push(`blocks[${i}] (passage) ${side} 需为非空锚数组`); continue }
        segs.forEach((s, j) => {
          if (!Number.isInteger(s?.[locKey]) || s[locKey] < 1) e.push(`blocks[${i}] ${side}[${j}] ${locKey} 需为正整数`)
          if (typeof s?.anchor !== 'string' || s.anchor.trim().length < 6) e.push(`blocks[${i}] ${side}[${j}] anchor 需 ≥6 字`)
          if (s?.span !== undefined && (!Number.isInteger(s.span) || s.span < 1)) e.push(`blocks[${i}] ${side}[${j}] span 需为正整数`)
        })
      }
    }
    if (b.type === 'insight') {
      const hasGroups = Array.isArray(b.groups) && b.groups.length > 0
      const hasItems = Array.isArray(b.items) && b.items.length > 0
      if (!hasGroups && !hasItems) e.push(`blocks[${i}] (insight) 需提供 groups 或 items`)
      if (hasGroups && !b.groups.every((g) => isStr(g?.tag) && isStr(g?.title) && isStr(g?.text)))
        e.push(`blocks[${i}] (insight) groups 条目需含 tag/title/text`)
    }
  })
  if (!Array.isArray(c.quiz) || c.quiz.length === 0) e.push('quiz 需为非空数组')
  else c.quiz.forEach((q, i) => {
    if (!isStr(q?.q)) e.push(`quiz[${i}] q 不能为空`)
    if (!Array.isArray(q?.options) || q.options.length < 2 || !q.options.every(isStr)) e.push(`quiz[${i}] options 需为 ≥2 个非空选项`)
    if (!Number.isInteger(q?.answer) || q?.answer < 0 || q?.answer >= (q.options?.length ?? 0)) e.push(`quiz[${i}] answer 超出选项范围`)
    if (!isStr(q?.explain)) e.push(`quiz[${i}] explain 不能为空`)
  })
  if (!Array.isArray(c.resources)) e.push('resources 需为数组')
  else c.resources.forEach((r, i) => { if (!isStr(r?.title) || !isStr(r?.url)) e.push(`resources[${i}] 需含 title/url`) })
  return e
}

export function validateHighlightEntry(h) {
  const e = []
  if (!Number.isInteger(h?.book) || h.book < 1) e.push('book 需为正整数')
  if (typeof h?.anchor !== 'string' || h.anchor.trim().length < 6) e.push('anchor 需 ≥6 字')
  if (h?.pattern !== undefined && (typeof h.pattern !== 'string' || h.pattern.length === 0)) e.push('pattern 若提供需为非空字符串')
  if (!HIGHLIGHT_KINDS.has(h?.kind)) e.push(`kind 需为 boy/orig, 得到 ${JSON.stringify(h?.kind)}`)
  return e
}
