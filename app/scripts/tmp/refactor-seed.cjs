const fs = require('node:fs')
const p = 'server/index.js'
const src = fs.readFileSync(p, 'utf8')
const startMark = '// ---------------------------------------------------------------- 第一课种子'
const endMark = 'seedHighlights()'
const a = src.indexOf(startMark)
const b = src.indexOf(endMark) + endMark.length
if (a < 0 || b < endMark.length) { console.error('marker not found', a, b); process.exit(1) }
const replacement = `// ---------------------------------------------------------------- 课程种子 (server/lessons/*.json 为准, 每次启动同步)
const LESSONS_DIR = path.join(__dirname, 'lessons')
const HIGHLIGHTS_DIR = path.join(__dirname, 'highlights')

function seed() {
  const files = fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) throw new Error(\`server/lessons/ 目录为空: \${LESSONS_DIR}\`)
  const seen = new Set()
  for (const f of files) {
    const l = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'))
    if (!l.slug || !l.content?.quiz?.length) throw new Error(\`课程文件非法: \${f}\`)
    seen.add(l.slug)
    db.prepare(\`INSERT INTO lessons(slug,seq,title,subtitle,focus,content) VALUES(?,?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET seq=excluded.seq, title=excluded.title,
        subtitle=excluded.subtitle, focus=excluded.focus, content=excluded.content\`)
      .run(l.slug, l.seq, l.title, l.subtitle, l.focus, JSON.stringify(l.content))
    const hasCards = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE lesson_slug=?').get(l.slug)
    if (hasCards.n === 0) {
      const card = db.prepare('INSERT INTO cards(lesson_slug,front,back) VALUES(?,?,?)')
      for (const q of l.content.quiz) card.run(l.slug, q.q, q.options[q.answer] + '——' + q.explain)
      console.log('seeded cards for', l.slug)
    }
  }
  const stale = db.prepare('SELECT slug FROM lessons').all().filter((r) => !seen.has(r.slug))
  for (const r of stale) {
    db.prepare('DELETE FROM lessons WHERE slug=?').run(r.slug)
    db.prepare('DELETE FROM cards WHERE lesson_slug=?').run(r.slug)
    db.prepare('DELETE FROM lesson_state WHERE slug=?').run(r.slug)
    console.log('removed lesson not in files:', r.slug)
  }
  console.log(\`seeded \${files.length} lessons\`)
}
seed()

// 高亮重点句种子 (server/highlights/*.json): 按 section+kind+pattern 幂等插入
function seedHighlights() {
  const files = fs.readdirSync(HIGHLIGHTS_DIR).filter((f) => f.endsWith('.json'))
  const ins = db.prepare(\`INSERT INTO highlights(section_id,pattern,note,kind)
    SELECT ?,?,?,? WHERE NOT EXISTS
      (SELECT 1 FROM highlights WHERE section_id=? AND kind=? AND pattern=?)\`)
  let n = 0
  for (const f of files) {
    for (const h of JSON.parse(fs.readFileSync(path.join(HIGHLIGHTS_DIR, f), 'utf8'))) {
      const info = ins.run(h.section_id, h.pattern, h.note, h.kind, h.section_id, h.kind, h.pattern)
      n += info.changes
    }
  }
  if (n) console.log(\`seeded \${n} highlights\`)
}
seedHighlights()
`
fs.writeFileSync(p, src.slice(0, a) + replacement + src.slice(b))
console.log('refactored, new length:', (src.slice(0, a) + replacement + src.slice(b)).length)
