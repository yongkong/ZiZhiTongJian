// 锚解析纯函数 (词汇见 CONTEXT.md: 锚 anchor / 语料 corpus / 解析 resolve)。
// 输入段落列表与锚, 输出 {volume|section, seqs}; 失败抛中文错误, 由调用方附上课·块上下文。
// 单测: resolve.test.mjs (不依赖数据库)。

export const MIN_ANCHOR = 6

function checkAnchor(anchor) {
  if (typeof anchor !== 'string' || anchor.trim().length < MIN_ANCHOR)
    throw new Error(`锚至少需 ${MIN_ANCHOR} 字: ${JSON.stringify(anchor)}`)
}

// 前缀命中且唯一; 返回 {paras 中的下标, 段落}
function uniquePrefix(paras, anchor) {
  const idx = paras.findIndex((p) => p.text.startsWith(anchor))
  if (idx < 0) throw new Error(`锚未命中任何段落: 「${anchor}」`)
  const second = paras.findIndex((p, i) => i > idx && p.text.startsWith(anchor))
  if (second >= 0) throw new Error(`锚命中多处 (段 ${paras[idx].seq} 与 段 ${paras[second].seq}): 「${anchor}」, 请加长锚文本`)
  return idx
}

function checkSpan(span, i, side) {
  if (span === undefined) return 1
  if (!Number.isInteger(span) || span < 1) throw new Error(`${side}[${i}] span 需为正整数: ${JSON.stringify(span)}`)
  return span
}

// 原文侧: segments [{volume, anchor, span}] → {volume, seqs}
// getParas(volumeNum) → [{seq, text}] (text 为去胡注后的 plain), 同卷约束。
export function resolveOrig(segments, getParas) {
  if (!Array.isArray(segments) || segments.length === 0) throw new Error('orig 需为非空锚数组')
  const seqs = new Set()
  let volume = null
  for (const [i, seg] of segments.entries()) {
    if (!Number.isInteger(seg?.volume) || seg.volume < 1) throw new Error(`orig[${i}] volume 需为正整数`)
    if (volume === null) volume = seg.volume
    else if (seg.volume !== volume) throw new Error(`orig[${i}] 引用卷 ${seg.volume}, 与其他段 (卷 ${volume}) 不一致: 一个 passage 的原文须同卷, 跨卷请拆块`)
    checkAnchor(seg.anchor)
    const span = checkSpan(seg.span, i, 'orig')
    const paras = getParas(volume)
    const idx = uniquePrefix(paras, seg.anchor)
    for (let k = 0; k < span; k++) {
      const p = paras[idx + k]
      if (!p) throw new Error(`锚「${seg.anchor}」的 span 超出卷 ${volume} 末尾`)
      seqs.add(p.seq)
    }
  }
  return { volume, seqs: [...seqs].sort((a, b) => a - b) }
}

// 柏杨侧: segments [{book, anchor, span}] → {section, seqs}
// getParas(bookId) → [{section, seq, text}] 按 (section, seq) 排序; 同册同章节约束, span 不得跨章节。
export function resolveBoy(segments, getParas) {
  if (!Array.isArray(segments) || segments.length === 0) throw new Error('boy 需为非空锚数组')
  const seqs = new Set()
  let section = null
  let book = null
  for (const [i, seg] of segments.entries()) {
    if (!Number.isInteger(seg?.book) || seg.book < 1) throw new Error(`boy[${i}] book 需为正整数`)
    if (book === null) book = seg.book
    else if (seg.book !== book) throw new Error(`boy[${i}] 引用册 ${seg.book}, 与其他段 (册 ${book}) 不一致: 一个 passage 的白话须同册`)
    checkAnchor(seg.anchor)
    const span = checkSpan(seg.span, i, 'boy')
    const paras = getParas(book)
    const idx = uniquePrefix(paras, seg.anchor)
    for (let k = 0; k < span; k++) {
      const p = paras[idx + k]
      if (!p) throw new Error(`锚「${seg.anchor}」的 span 超出册 ${book} 末尾`)
      if (p.section !== paras[idx].section) throw new Error(`锚「${seg.anchor}」的 span 跨章节 (章节 ${paras[idx].section} → ${p.section}): 跳段请拆成多条锚`)
      seqs.add(p.seq)
    }
    if (section === null) section = paras[idx].section
    else if (paras[idx].section !== section) throw new Error(`boy[${i}] 解析到章节 ${paras[idx].section}, 与其他段 (章节 ${section}) 不一致: 一个 passage 的白话须同章节, 跨章节请拆块`)
  }
  return { section, seqs: [...seqs].sort((a, b) => a - b) }
}

// 高亮锚: 书内唯一前缀 → section_id (pattern 的涂色匹配在前端 indexOf, 与此处无关)
export function resolveHighlightSection(book, anchor, getParas) {
  checkAnchor(anchor)
  const paras = getParas(book)
  return paras[uniquePrefix(paras, anchor)].section
}
