const fs = require('node:fs')
const path = require('node:path')
const db = require('better-sqlite3')(path.join(__dirname, '..', '..', 'data', 'tongjian.db'))
const lesson = db.prepare('SELECT slug,seq,title,subtitle,focus,content FROM lessons WHERE slug=?').get('sanjiafenjin')
const dir = path.join(__dirname, '..', '..', 'server', 'lessons')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, '0001-sanjiafenjin.json'), JSON.stringify({
  slug: lesson.slug, seq: lesson.seq, title: lesson.title, subtitle: lesson.subtitle, focus: lesson.focus,
  content: JSON.parse(lesson.content),
}, null, 2) + '\n')
const hls = db.prepare('SELECT section_id,pattern,note,kind FROM highlights WHERE section_id=1006').all()
const hdir = path.join(__dirname, '..', '..', 'server', 'highlights')
fs.mkdirSync(hdir, { recursive: true })
fs.writeFileSync(path.join(hdir, '0001-sanjiafenjin.json'), JSON.stringify(hls, null, 2) + '\n')
console.log('lesson1:', fs.existsSync(path.join(dir, '0001-sanjiafenjin.json')), 'highlights:', hls.length)
