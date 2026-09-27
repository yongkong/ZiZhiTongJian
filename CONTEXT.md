# CONTEXT — 领域与架构词汇

> 架构评审（improve-codebase-architecture）与后续开发共用的词汇事实源。
> 架构词汇依据 codebase-design：module / interface / depth / seam / locality / leverage / deletion test。

## 学习域（业务）

- **课程 (lesson)**：一个紧凑学习单元 = 三点速览 → 故事 → 文白对照 → 讲解 → 联结 → 测验。`slug` 唯一标识，`seq` 定序（唯一，校验）。
- **文白对照 (passage)**：课程块的一种，原文段与柏杨白话段并列显示，三种阅读模式，胡注可展开。
- **测验 (quiz) / 复习卡片 (card)**：测验题自动生成复习卡，进入 SM-2 简化版间隔重复队列。
- **原文通读 (reader)**：胡三省音注版 294 卷浏览，标记已读计入进度。
- **柏杨白话 (Boyang)**：72 册白话译本，按年代章节浏览。
- **胡注**：〔〕内的胡三省注释，切分为独立注释段。
- **高亮 (highlight)**：重点句的逐字 pattern + 点评，前端 indexOf 匹配渲染。

## 内容生产域（2026-09 架构评审 A→B 确定）

- **语料 (corpus)**：`scripts/ingest.py` 从两套 EPUB 解析出的 volumes / paragraphs / boyang_* 表。
  位置 ID（段落 `seq`、`section_id = book_id*1000+章节序号`）是**解析顺序的产物，不承诺稳定**——ingest 任何解析修复都可能使其漂移。
- **锚 (anchor)**：课程文件中引用语料的**段落前缀文本**（≥6 字，卷内/书内唯一命中）。
  课程文件（`server/content/lessons/<slug>/`）是事实源；DB 里的 content 只存解析结果。
- **内容管线 (content pipeline)**：`server/content/` 深模块。窄接口：`loadContent(db)`（读盘 → 校验 → 解析锚 → 播种）与 `check(db)`（CLI：`npm run content:check`，不启服务器的全量校验报告）。
  播种覆盖课程、复习卡片（按 front 三向同步，保学习进度）、高亮（全量重建）。
- **解析 (resolve)**：锚 → seqs / section_id 的过程，seed 时执行；失败 = 中文报错（哪课·哪块·哪锚·为什么）+ fail fast（exit 1）。每次启动 re-resolve，即每次启动自动检测语料漂移。
