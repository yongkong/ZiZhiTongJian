// 静态导出后处理: 修正 Next 16 段预取载荷的路径错位。
// 现象: next build (output: 'export') 把段缓存写成嵌套目录
//   <page>/__next.<seg1>/<seg2>/__PAGE__.txt
// 而浏览器路由器按点号平铺 URL 预取
//   <page>/__next.<seg1>.<seg2>.__PAGE__.txt
// 纯静态托管 (Cloudflare Pages 等) 不做改写 → 预取 404、客户端导航退化为整页加载。
// 本脚本把嵌套形式复制为点号形式并删除嵌套目录; 幂等, next build 后运行。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out')
if (!fs.existsSync(OUT)) {
  console.error('out/ 不存在, 先运行 next build')
  process.exit(1)
}

let copied = 0
let removedDirs = 0

// 收集 out/ 下所有名为 __next.* 的目录
const dirs = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith('__next.')) dirs.push(path.join(dir, e.name))
      else walk(path.join(dir, e.name))
    }
  }
}
walk(OUT)

for (const dir of dirs) {
  // 目录内文件的相对路径 (seg/seg/NAME.txt) → 点号平铺文件名 (__next.<dir>seg.seg.NAME.txt)
  const files = []
  const collect = (d, prefix) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) collect(path.join(d, e.name), `${prefix}${e.name}.`)
      else files.push({ flat: prefix + e.name, abs: path.join(d, e.name) })
    }
  }
  collect(dir, `${path.basename(dir)}.`)
  for (const f of files) {
    const flatPath = path.join(path.dirname(dir), f.flat)
    fs.copyFileSync(f.abs, flatPath)
    copied += 1
  }
  fs.rmSync(dir, { recursive: true })
  removedDirs += 1
}

console.log(`✓ 段预取载荷平铺: ${copied} 个文件 · 移除嵌套目录 ${removedDirs} 处 → out/`)
