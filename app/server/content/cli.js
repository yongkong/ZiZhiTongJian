// npm run content:check — 不启服务器的全量内容校验报告
import { db } from '../db.js'
import { check, LESSONS_DIR } from './index.js'

const { lessons, errors } = check(db)
console.log(`课程目录: ${LESSONS_DIR}`)
console.log(`读到 ${lessons.length} 课`)
if (errors.length) {
  console.error(`\n✗ 校验失败 ${errors.length} 处:`)
  for (const e of errors) console.error(`  - [${e.where}] ${e.message}`)
  process.exit(1)
}
console.log('✓ 全部通过: 结构 · 锚解析 · 卡片可同步')
