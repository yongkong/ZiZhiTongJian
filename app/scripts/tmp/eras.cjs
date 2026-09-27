const path = require('node:path')
const db = require('better-sqlite3')(path.join(__dirname, '..', '..', 'data', 'tongjian.db'));
console.log('=== era_group ===');
for (const r of db.prepare(`
  SELECT v.era_group g, COUNT(DISTINCT v.num) n, MIN(v.num) a, MAX(v.num) b,
         MIN(p.tj_year) y0, MAX(p.tj_year) y1
  FROM volumes v LEFT JOIN paragraphs p ON p.volume_id=v.num AND p.tj_year IS NOT NULL
  GROUP BY v.era_group ORDER BY a`).all())
  console.log(String(r.g).padEnd(6), 'vols', String(r.n).padStart(3), '[' + r.a + '-' + r.b + ']', 'years', r.y0, '..', r.y1);
console.log('\n=== 每纪起始卷 ===');
for (const r of db.prepare(`
  SELECT num, era_group, title FROM volumes WHERE num IN
  (SELECT MIN(num) FROM volumes GROUP BY era_group) ORDER BY num`).all())
  console.log(String(r.num).padStart(3), r.era_group, r.title.slice(0, 44));
