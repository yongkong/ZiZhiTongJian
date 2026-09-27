// 课程生产辅助工具 (只读): 帮课程作者在语料里定位锚文本、校验高亮 pattern。
// 匹配逻辑与 server/content/resolve.js 完全一致: 锚 = 前缀 startsWith 且 卷/册内唯一。
// 用法: node scripts/lesson-tools.cjs <命令> [参数]
// 命令:
//   vols [a] [b]              卷列表: num | era_group | 标题
//   secs <book>               柏杨册的章节列表: 章节id | kind | 标题
//   fo <volume> <关键词>       在某卷原文(plain, 去胡注)中找含关键词的段落
//   foa <关键词>               在全部 294 卷原文中找 (用于不知卷号时)
//   fb <book> <关键词>         在某柏杨册白话中找含关键词的段落
//   fba <关键词>               在全部 72 册白话中找 (用于不知册号时)
//   para <volume> <seq> [n]   从某卷某段起连续看 n 段原文 (选 span / 挑 pattern)
//   bpara <book> <anchor> [n] 从某册锚段起连续看 n 段白话 (选 span / 挑 pattern)
//   uo <volume> <锚>           校验原文锚: 该卷内唯一前缀命中则 OK
//   ub <book> <锚>             校验白话锚: 该册内唯一前缀命中则 OK
//   ps <章节id> <pattern>      校验 boy 高亮: pattern 逐字存在于该章节
//   pv <volume> <pattern>      校验 orig 高亮: pattern 逐字存在于该卷原文
//   sp <章节id> [关键词]        展示某章节段落全文头 120 字 (挑高亮句)

const path = require('node:path')
const Database = require('better-sqlite3')
const db = new Database(path.join(__dirname, '..', 'data', 'tongjian.db'), { readonly: true })

const clip = (s, n = 60) => (s.length > n ? s.slice(0, n) + '…' : s)
const origParas = (v) =>
  db.prepare('SELECT seq, plain AS text FROM paragraphs WHERE volume_id=? ORDER BY seq').all(v)
const bookParas = (b) =>
  db.prepare(`SELECT s.id AS section, s.title AS stitle, s.kind AS skind, p.seq, p.text
    FROM boyang_paragraphs p JOIN boyang_sections s ON s.id = p.section_id
    WHERE s.book_id=? ORDER BY s.id, p.seq`).all(b)
const secParas = (sid) =>
  db.prepare('SELECT seq, text FROM boyang_paragraphs WHERE section_id=? ORDER BY seq').all(sid)

// 与 resolve.js uniquePrefix 一致: 首个命中 + 检查唯一
function uniqPrefix(paras, anchor, label) {
  const idx = paras.findIndex((p) => p.text.startsWith(anchor))
  if (idx < 0) { console.log(`✗ ${label} 锚未命中任何段落: 「${anchor}」`); return -1 }
  const second = paras.findIndex((p, i) => i > idx && p.text.startsWith(anchor))
  if (second >= 0) {
    console.log(`✗ ${label} 锚命中多处 (第 ${idx + 1} 段与第 ${second + 1} 段): 「${anchor}」, 请加长锚文本`)
    return -1
  }
  return idx
}

const [cmd, ...args] = process.argv.slice(2)
const need = (n) => { if (args.length < n) { console.log('参数不足, 见文件头注释'); process.exit(1) } }

switch (cmd) {
  case 'vols': {
    const [a = 1, b = 294] = args.map(Number)
    for (const r of db.prepare('SELECT num, era_group, title FROM volumes WHERE num>=? AND num<=? ORDER BY num').all(a, b))
      console.log(String(r.num).padStart(3), r.era_group.padEnd(5), clip(r.title, 66))
    break
  }
  case 'secs': {
    need(1)
    for (const r of db.prepare('SELECT id, kind, title, seq FROM boyang_sections WHERE book_id=? ORDER BY seq').all(+args[0]))
      console.log(String(r.id).padStart(4), r.kind.padEnd(8), r.title)
    break
  }
  case 'fo': {
    need(2)
    for (const p of origParas(+args[0]).filter((p) => p.text.includes(args[1])).slice(0, 10))
      console.log('seq', String(p.seq).padStart(4), clip(p.text, 70))
    break
  }
  case 'foa': {
    need(1)
    const rows = db.prepare('SELECT volume_id, seq, plain AS text FROM paragraphs WHERE instr(plain, ?)>0 LIMIT 15').all(args[0])
    for (const r of rows) console.log('vol', String(r.volume_id).padStart(3), 'seq', String(r.seq).padStart(4), clip(r.text, 66))
    break
  }
  case 'fb': {
    need(2)
    for (const p of bookParas(+args[0]).filter((p) => p.text.includes(args[1])).slice(0, 10))
      console.log('sec', String(p.section).padStart(4), p.skind.padEnd(8), 'seq', String(p.seq).padStart(3), clip(p.text, 60))
    break
  }
  case 'fba': {
    need(1)
    const rows = db.prepare(`SELECT s.book_id b, s.id sec, s.title st, p.seq, p.text FROM boyang_paragraphs p
      JOIN boyang_sections s ON s.id=p.section_id WHERE instr(p.text, ?)>0 ORDER BY s.book_id, s.seq, p.seq LIMIT 15`).all(args[0])
    for (const r of rows) console.log('book', String(r.b).padStart(2), 'sec', String(r.sec).padStart(4), r.st.slice(0, 14).padEnd(14), 'seq', String(r.seq).padStart(3), clip(r.text, 46))
    break
  }
  case 'para': {
    need(2)
    const [v, s, n = 3] = args.map(Number)
    for (const p of origParas(v).filter((p) => p.seq >= s).slice(0, n))
      console.log('seq', String(p.seq).padStart(4), clip(p.text, 160))
    break
  }
  case 'bpara': {
    need(2)
    const n = Number(args[2] ?? 3)
    const paras = bookParas(+args[0])
    const idx = uniqPrefix(paras, args[1], 'bpara')
    if (idx < 0) break
    for (const p of paras.slice(idx, idx + n))
      console.log('sec', String(p.section).padStart(4), 'seq', String(p.seq).padStart(3), clip(p.text, 160))
    break
  }
  case 'uo': {
    need(2)
    const idx = uniqPrefix(origParas(+args[0]), args[1], 'uo')
    if (idx >= 0) console.log(`✓ 唯一命中 vol ${args[0]} seq ${origParas(+args[0])[idx].seq}:`, clip(origParas(+args[0])[idx].text, 100))
    break
  }
  case 'ub': {
    need(2)
    const paras = bookParas(+args[0])
    const idx = uniqPrefix(paras, args[1], 'ub')
    if (idx >= 0) console.log(`✓ 唯一命中 book ${args[0]} section ${paras[idx].section} seq ${paras[idx].seq}:`, clip(paras[idx].text, 100))
    break
  }
  case 'ps': {
    need(2)
    const hit = secParas(+args[0]).some((p) => p.text.includes(args[1]))
    console.log(hit ? `✓ pattern 在章节 ${args[0]} 中逐字存在` : `✗ pattern 未在章节 ${args[0]} 中出现: 「${args[1]}」`)
    break
  }
  case 'pv': {
    need(2)
    const hit = origParas(+args[0]).some((p) => p.text.includes(args[1]))
    console.log(hit ? `✓ pattern 在卷 ${args[0]} 原文中逐字存在` : `✗ pattern 未在卷 ${args[0]} 原文中出现: 「${args[1]}」`)
    break
  }
  case 'sp': {
    need(1)
    const kw = args[1]
    for (const p of secParas(+args[0]).filter((p) => !kw || p.text.includes(kw)).slice(0, 12))
      console.log('seq', String(p.seq).padStart(3), clip(p.text, 120))
    break
  }
  default:
    console.log('未知命令:', cmd, '— 见文件头注释')
}
