# 资治通鉴 · 学堂

个人《资治通鉴》学习网站，**纯静态内容站**：以「胡三省音注版」为原文底本、「柏杨白话版（全 72 册）」
为对照译文，配合 48 课结构化课程、测验与卡片练习。全部内容免费浏览，无登录、无进度记录，
`next build` 一次导出 650+ 个预渲染页面，可部署到任意静态托管（Cloudflare Pages 等）。

## 快速开始

```bash
cd app
npm install
npm run dev        # 开发模式: http://localhost:3000
```

生产构建与本地预览：

```bash
npm run build      # next build (静态导出) + 预取载荷平铺后处理 → out/
npm run preview    # 本地起静态服务器看 out/ 产物 (npx serve)
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run build` | 全站静态导出到 `out/`（构建期从 `content/` 读全部数据） |
| `npm run content:export` | SQLite 语料 → `content/` 静态 JSON（含课程锚解析与段落包烘焙，出错即中止） |
| `npm run content:check` | 只校验课程源文件（结构 · 锚解析 · pattern 落地），不写任何文件 |
| `npm run ingest` | 重新解析 EPUB 并重建 `data/tongjian.db`（需先解包 EPUB 到 `../extract/`） |
| `npm run deploy:img` | 压缩柏杨插图到 `public/boyang-img/`（仅语料引用到的文件） |
| `npm test` | node:test 单元测试（锚解析器 / 课程校验器纯函数） |
| `npm run lint` | oxlint |

## 内容管线（数据事实源）

```
book/ EPUB ──ingest.py──▶ data/tongjian.db ──export-content.mjs──▶ content/（静态 JSON, 提交进仓库）
                                                      ▲                    │
content-src/lessons/<slug>/{lesson.json, highlights.json}（课程源, 文件事实源）┘    next build 构建期读取
```

- **语料**（294 卷原文 / 72 册白话 / 段落 / 年份）只在导出时读一次 SQLite；站点运行期不碰数据库。
- **课程**引用语料用**锚文本**（段落前缀 ≥6 字、卷/书内唯一、跳段写多条），不手写段落序号——
  ingest 重建导致的序号漂移会在导出/校验时显式报错，而不是静默显示错误段落。
- 课程的文白对照段落与两路批注在导出时**烘焙**进 `content/lessons/<slug>.json`，
  页面运行期零额外请求。
- `content/` 提交进仓库：静态站构建只依赖它（CI / Cloudflare 构建无需 SQLite 与 Python）。

做一节新课：在 `content-src/lessons/<slug>/` 放 `lesson.json` + `highlights.json`，
`npm run content:check` 全绿后 `npm run content:export && npm run build`。
字段结构与生产清单见仓库根 `NOTES.md`。

## 功能

- **首页**：第一课入口、卡片练习、通读/白话导航
- **课程（48）**：三点速览 → 故事 → 文白对照选段（原文/白话/对照三模式，胡注可展开，藤黄批注悬停点评）→ 决策启示 → 测验（即时判分与解析）
- **原文通读（294 卷）**：按纪分组；公元年份锚点分段；胡三省注折叠；一键跳到对应柏杨白话章节
- **柏杨白话（72 册 / 231 章节）**：年份表头、各国纪年对照、司马光曰（朱线引文）、柏杨曰（底色块）分区排版；重点句藤黄批注
- **复习**：288 张卡片随机抽 20 张练习（提取练习，无排期记录）

## 技术栈

- Next.js 16（App Router，`output: 'export'` 全静态导出）+ React 19 + Tailwind CSS 4 + shadcn/ui（radix）
- 构建期数据：`src/lib/content.ts` 直读 `content/` JSON；交互组件（文白对照 Tabs / 胡注展开 / 测验 / 抽卡 / 目录抽屉）为客户端组件
- 数据管线：Python 标准库解析 EPUB（`scripts/ingest.py`）+ Node 导出（`scripts/export-content.mjs`）
  - 胡三省注版：294 卷 / 32,725 段，〔〕注切分为独立注释，从注中提取公元年份锚点（1,290 处）
  - 柏杨版：72 册 / 231 章节 / 55,571 段，年份表头 / 纪年 / 司马光曰 / 柏杨曰分类标记（1,360 处年份锚点）

## 目录结构

```
app/
├── content-src/               # 课程源（事实源）
│   ├── lessons/<slug>/        #   每课一夹: lesson.json + highlights.json
│   ├── read.js                #   读盘 → 校验 → 解析锚（深模块窄接口 checkLessons）
│   ├── resolve.js             #   锚 → 段落序号 纯函数解析器（含单测）
│   └── validate.js            #   lesson.json / highlights.json 结构校验（含单测）
├── content/                   # 导出的静态 JSON（提交进仓库; build 只依赖它）
│   ├── volumes/ · boyang/ · lessons/ · cards.json
├── scripts/
│   ├── ingest.py              # EPUB → SQLite（语料）
│   ├── export-content.mjs     # SQLite + 课程源 → content/（锚解析 + 段落包烘焙）
│   ├── postprocess-export.mjs # 静态导出后处理: 段预取载荷嵌套目录 → 点号平铺
│   └── compress-boyang-img.py # 柏杨插图压缩 → public/boyang-img/
├── src/
│   ├── app/                   # App Router 页面（全部 SSG 预渲染）
│   ├── components/            # 段落渲染 / 文白对照 / 测验 / 抽卡 / 导航组件
│   └── lib/content.ts         # 构建期数据访问层
└── data/tongjian.db           # SQLite 语料（gitignore; 仅 ingest/export 使用）
```

## 部署到 Cloudflare Pages

`out/` 是纯静态文件。已部署项目：`tongjian-xuetang`（生产域名 `tongjian-xuetang.pages.dev`，
自定义域名 `zztj.yongkong.dev`）。

**wrangler CLI（本项目实际使用的方式）**

```bash
cd app && npm run build
npx wrangler login                                        # 首次: 浏览器授权
npx wrangler pages project create tongjian-xuetang --production-branch=main   # 仅首次
npx wrangler pages deploy out --project-name=tongjian-xuetang --branch=main   # 每次更新
```

绑定自定义域名（zone 在同一账号时会自动创建 CNAME）：dashboard → Workers & Pages →
`tongjian-xuetang` → Custom domains → Set up a custom domain → 输入域名 → Activate。

**Git 集成（自动构建，可选）**

1. 仓库推送 GitHub 后，Cloudflare Pages → Connect to Git 选择仓库
2. 构建配置：Root directory `app`，Build command `npm run build`，Output directory `out`
3. 首次部署前先本地跑一次 `npm run deploy:img` 并提交 `public/boyang-img/`（图片默认 gitignore，
   否则 CI 构建缺图）

> 图片目录 `public/boyang-img/`（约 126MB / 1498 张）默认不入库：本地构建天然包含；
> 走 Git 集成时需临时放开 gitignore 提交一次，或改用 R2/图床。
> 限额参考：Pages 单文件 ≤ 25MB、每项目 ≤ 20,000 文件——本站 4,700+ 文件，富余充足。
> 另：大陆直连 `*.pages.dev` 常受 TLS 干扰，绑自定义域名更稳。

## 数据来源与版权

两本 EPUB 为用户自购电子书，解析文本仅限个人学习使用，不得分发。
