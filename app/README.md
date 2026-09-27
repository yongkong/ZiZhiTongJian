# 资治通鉴 · 学堂

个人《资治通鉴》学习网站。以「胡三省音注版」为原文底本、「柏杨白话版（全 72 册）」为对照译文，
配合结构化课程、测验与间隔重复复习，支撑「从头通读 294 卷」的长期学习计划。

## 快速开始

```bash
cd app
npm run build   # 首次需要构建前端
npm start       # 生产模式: http://localhost:3001
```

开发模式（热更新）:

```bash
npm run dev      # http://localhost:5173, /api 代理到 3001
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm start` | 启动网站（Express，端口 3001；启动时内容管线校验+播种，课程文件有错则拒绝启动） |
| `npm run build` | 构建前端到 `dist/` |
| `npm run ingest` | 重新解析 EPUB 并重建 `data/tongjian.db`（需先解包 EPUB 到 `../extract/`） |
| `npm run content:check` | 不启服务器，全量校验课程文件（结构 · 锚解析 · pattern 落地），做出错报告 |
| `npm test` | node:test 单元测试（锚解析器 / 课程校验器纯函数） |
| `npm run dev` | Vite 开发服务器 |

## 做一节新课

课程全部是数据，加课零代码：在 `server/content/lessons/<slug>/` 放 `lesson.json` + `highlights.json`，
跑 `npm run content:check` 全绿后启动即可。语料引用用**锚文本**（段落前缀 ≥6 字、卷/书内唯一、跳段写多条），
不手写段落序号——ingest 重建导致的序号漂移会在启动/校验时显式报错，而不是静默显示错误段落。
字段结构与生产清单见仓库根 `NOTES.md`。

## 功能

- **仪表盘**：下一课入口、今日复习数、连续学习天数、通读进度
- **课程**：每课 = 故事讲解 + 文白对照选段（原文/柏杨白话/对照三种模式，胡注可展开）+ 决策启示 + 测验
- **原文通读**：294 卷浏览，按纪分组；公元年份锚点分段；胡三省注折叠显示；一键跳到对应柏杨白话章节；「标记已读」计入进度
- **柏杨白话**：72 册 → 年代章节浏览；年份表头、各国纪年对照、司马光曰（朱线引文）、柏杨曰（底色块）分区排版
- **复习**：SM-2 简化版间隔重复；课程测验的卡片自动进入复习队列（忘了/记得/很简单 三档评分）
- 学习进度、复习排期全部存 SQLite（`data/tongjian.db`）

## 技术栈

- 前端：React 19 + Vite + Tailwind CSS 4 + shadcn/ui（radix）+ react-router
- 后端：Node + Express 5
- 存储：SQLite（better-sqlite3）
- 数据管线：Python 标准库解析 EPUB（`scripts/ingest.py`）
  - 胡三省注版：294 卷 / 32,725 段，〔〕注切分为独立注释，从注中提取公元年份锚点（1,290 处）
  - 柏杨版：72 册 / 231 章节 / 55,571 段，按 toc.ncx 划分，年份表头 / 纪年 / 司马光曰 / 柏杨曰分类标记（1,360 处年份锚点）

## 目录结构

```
app/
├── server/
│   ├── index.js           # Express 后端（API + 静态托管）
│   ├── db.js              # SQLite 连接 + schema + 老库迁移（服务与 CLI 共用）
│   └── content/           # 内容管线（深模块）: 读盘 → 校验 → 解析锚 → 播种
│       ├── index.js       #   loadContent(db) / check(db)
│       ├── resolve.js     #   锚 → 段落序号 的纯函数解析器（含单测）
│       ├── validate.js    #   lesson.json / highlights.json 结构校验（含单测）
│       ├── cli.js         #   npm run content:check 入口
│       └── lessons/
│           └── <slug>/    #   每课一夹: lesson.json + highlights.json（事实源）
├── scripts/ingest.py      # EPUB → SQLite 解析入库（语料）
├── src/                   # React 前端
│   ├── pages/             # 仪表盘 / 课程 / 阅读器 / 柏杨 / 复习
│   └── components/        # 段落渲染 / 文白对照 / 测验组件
└── data/tongjian.db       # SQLite（语料 + 课程解析结果 + 学习状态）
```

## 数据来源与版权

两本 EPUB 为用户自购电子书，解析文本仅限个人学习使用，不得分发。
