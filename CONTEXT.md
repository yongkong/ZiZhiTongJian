# CONTEXT — 领域与架构词汇

> 架构评审（improve-codebase-architecture）与后续开发共用的词汇事实源。
> 架构词汇依据 codebase-design：module / interface / depth / seam / locality / leverage / deletion test。

## 学习域（业务）

> 2026-09-30 起为**纯学习内容站**：无登录、无学习进度记录、无多用户。测验与复习为即时练习，不落任何存储。

- **课程 (lesson)**：一个紧凑学习单元 = 三点速览 → 故事 → 文白对照 → 讲解 → 联结 → 测验。`slug` 唯一标识，`seq` 定序（唯一，校验）。
- **文白对照 (passage)**：课程块的一种，原文段与柏杨白话段并列显示，三种阅读模式，胡注可展开。
- **测验 (quiz) / 复习卡片 (card)**：测验即时判分；测验题导出为复习卡片，练习模式随机抽卡（无 SM-2 排期）。
- **原文通读 (reader)**：胡三省音注版 294 卷浏览。
- **柏杨白话 (Boyang)**：72 册白话译本，按年代章节浏览。
- **胡注**：〔〕内的胡三省注释，切分为独立注释段。
- **高亮 (highlight)**：重点句的逐字 pattern + 点评，前端 indexOf 匹配渲染。

## 内容生产域（2026-09 架构评审 A→B 确定；2026-09-30 转纯静态导出）

- **语料 (corpus)**：`scripts/ingest.py` 从两套 EPUB 解析出的 volumes / paragraphs / boyang_* 表。
  位置 ID（段落 `seq`、`section_id = book_id*1000+章节序号`）是**解析顺序的产物，不承诺稳定**——ingest 任何解析修复都可能使其漂移。
- **锚 (anchor)**：课程文件中引用语料的**段落前缀文本**（≥6 字，卷内/书内唯一命中）。
  课程文件（`content-src/lessons/<slug>/`）是事实源；导出的 `content/` 只存解析结果。
- **内容管线 (content pipeline)**：`content-src/` 深模块。窄接口：`checkLessons(corpus)`（读盘 → 校验 → 解析锚），
  由 `scripts/export-content.mjs` 调用（CLI：`npm run content:check` 只校验不写盘）。
- **导出 (export)**：`npm run content:export` = 校验 + 锚解析 + 把语料与课程一并写成 `content/` 静态 JSON；
  课程的文白段落包（原文段 / 白话段 / 两路批注）在此步**烘焙**进课程 JSON，站点运行期不再查语料。
  `content/` 提交进仓库，`next build` 只依赖它（无需 SQLite / Python）。
- **解析 (resolve)**：锚 → seqs / section_id 的过程，导出时执行；失败 = 中文报错（哪课·哪块·哪锚·为什么）+ fail fast（exit 1）。
  每次导出 re-resolve，即每次导出自动检测语料漂移。
