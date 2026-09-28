# 资治通鉴 · 学堂

以**胡三省音注版**《资治通鉴》为原文底本、**柏杨白话版（全 72 册）**为对照译文的公共学习网站：
48 节结构化课程贯穿三家分晋到赵宋前夜 1,362 年，配合文白对照阅读器与间隔重复复习。
**游客无需注册即可学习全部内容**——注册只为保存学习进度。

| | |
| --- | --- |
| ![仪表盘](docs/screenshots/dashboard.png) | ![课程](docs/screenshots/lessons-grid.png) |
| ![文白对照](docs/screenshots/lesson-passage.png) | ![测验](docs/screenshots/lesson-quiz.png) |
| ![柏杨白话](docs/screenshots/boyang-section.png) | ![原文通读](docs/screenshots/reader-volume.png) |

## 功能

- **48 节课程**：每课 = 故事讲解 → 文白对照选段 → 决策启示（管理/工作/生活/学习四场景）→ 6 题测验（答错自动进复习队列）
- **文白对照**：原文/柏杨白话/对照三种阅读模式；胡三省〔〕注折叠展开；重点句黄色高亮，悬停看一句话点评
- **原文通读**：294 卷按纪分组浏览，公元年份锚点分段，标记已读计入进度，一键跳到对应柏杨白话章节
- **柏杨白话**：72 册 → 年代章节浏览；年份表头、各国纪年对照、司马光曰（朱线引文）、柏杨曰（底色块）分区排版
- **复习**：SM-2 简化版间隔重复，三档评分（忘了/记得/很简单），复习卡片由课程测验自动生成
- **多用户**：进度、测验成绩、复习排期全部按账号隔离存 SQLite；游客模式各写入点本地生效、绝不挡路

## 快速开始

```bash
cd app
npm install
npm run build     # 构建前端
npm start         # http://localhost:3001
```

- **语料**：`app/data/tongjian.db` 不入库（含用户数据）。需要用自备的两套 EPUB 跑 `npm run ingest` 重建，见 [app/README.md](app/README.md)
- Windows 下 `better-sqlite3` 无预编译二进制时需本地 `node-gyp rebuild`（详见 [app/README.md](app/README.md)）
- 旧单用户数据启动时自动迁入默认账号 `local`（密码 `local1234`），也可直接注册新账号
- 开发热更新：`npm run dev`（5173，/api 代理到 3001）

## 课程体系（48 课）

按时代推进，每课围绕一个决策案例与一组可复用的判断框架：

| 时代 | 课程 | 时代 | 课程 |
| --- | --- | --- | --- |
| 战国 | 1–4（三家分晋 · 商鞅变法 · 合纵连横 · 长平之战） | 三国 | 20–25（官渡 · 赤壁 · 入蜀 · 北伐 · 高平陵 · 归晋） |
| 秦 | 5–6（帝制奠基 · 沙丘与大泽乡） | 西晋 | 26–28（贾后 · 八王 · 南渡） |
| 楚汉 | 7–8（巨鹿鸿门 · 楚汉决胜） | 东晋十六国 | 29–31（门阀 · 石勒 · 淝水） |
| 西汉 | 9–14（汉初 · 文景 · 武帝 · 昭宣 · 王莽） | 南北朝 | 32–36（刘裕 · 孝文帝 · 六镇 · 双雄 · 侯景） |
| 东汉 | 15–19（光武 · 班超 · 外戚 · 党锢 · 黄巾） | 隋 | 37–38（开皇 · 大运河） |
| | | 唐 / 五代 | 39–48（贞观 · 武则天 · 开元 · 安史 · 元和 · 甘露 · 黄巢 · 唐末 · 五代 · 柴荣） |

完整清单（slug / 语料定位 / 主题）见 [`app/server/content/curriculum.md`](app/server/content/curriculum.md)。

## 内容管线：加一课 = 加一个目录

课程不是代码，是**数据**。每课一个目录 `app/server/content/lessons/<slug>/`：

```
lesson.json      # 速览 / 讲解块 / 文白对照选段 / 启示 / 测验
highlights.json  # 重点句高亮 + 点评
```

语料引用使用**锚文本寻址**：段落前缀 ≥6 字、卷/册内唯一，启动时解析为段落序号——
ingest 重建导致的序号漂移会在启动时显式报错（fail fast），而不是静默显示错误段落。
写好课程文件后跑 `npm run content:check` 全绿即可上线；复习卡片按题面三向同步，改题不丢进度。

## 技术栈

React 19 + Vite + Tailwind CSS 4 + shadcn/ui ｜ Node + Express 5 ｜ SQLite (better-sqlite3) ｜ Python 标准库解析 EPUB（294 卷 / 32,725 段 + 72 册 / 55,571 段语料）

架构与目录结构详情见 [app/README.md](app/README.md)。

## 数据来源与版权

两本 EPUB 为自购电子书，解析文本仅限学习用途，不得分发。
