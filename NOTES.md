# Notes

## 用户偏好
- 界面与课程语言：中文
- 文言水平：基本靠白话 → 阅读界面以柏杨白话为主、原文对照为辅，渐进过渡
- 投入：每天 30–60 分钟，从头通读，重视长期保留（需要复习机制/间隔重复）
- 目标三合一：兴趣修身 + 打通历史脉络 + 汲取决策管理智慧
- 技术栈：React + shadcn/ui + Tailwind 前端；Node(Express) + SQLite 后端（用户确认 shadcn 而非 daisyUI）
- 已购电子书（book/）：胡三省注版（原文+注，294 卷，注为〔〕内嵌）、柏杨白话版全 72 册百年纪念版 EPUB
- 交付形态：学习网站（app/ 目录），teach 技能的课件/测验/复习理念融入网站

## 教学备注
- 第一课定为「三家分晋」：既是全书开篇总纲（臣光曰名分论），又含全书第一个决策案例（智宣子选储、才德之辩），完美贴合用户三重目标
- 每课结构：三点速览(keyPoints) → 故事 → 文白对照原文 → 讲解 → 与工作的联结(管理/工作/生活/学习四组) → 测验（检索练习）
- **每课生产清单**（做新课时逐项完成）：
  1. content.keyPoints 三条速览
  2. 选 3-5 组文白对照 passage（注意核对柏杨段落 seq，插图的章节段落号会后移！以 DB 实查为准）
  3. 为所选柏杨章节配 highlights：boy（白话句）+ orig（文言句）各 8-12 条，点评一句话
  4. insight 四场景组（管理/工作/生活/学习）各 2 条
  5. quiz 6 题 → 自动生成复习卡片
- 复习用简化 SM-2 间隔重复，测验答错自动进复习队列
- 高亮机制：highlights 表按 section_id + kind('boy'/'orig') 绑定，逐字匹配（无正则）；用户喜欢黄色高亮 + 悬停点评的形式

## 多用户改造（2026-09-27）
- 学习进度全面按用户隔离：reading_state/lesson_state/card_state 主键改为 (user_id, 内容id)，study_log 加 user_id；内容表（volumes/paragraphs/lessons/cards/boyang_*/highlights）仍全局共享
- 认证：users + sessions 表，bcryptjs 密码哈希，httpOnly cookie `tj_session`（30 天）；接口 POST /api/auth/register|login|logout、GET /api/auth/me
- 写接口与统计接口 requireUser 保护；内容 GET 保持公开（未登录 volumes/lessons 状态显示为空/'new'）
- 旧单用户数据自动迁移到默认账号 local（密码 local1234），启动时检测旧 schema 自动重建表，见 server/index.js 迁移块
- 前端：src/lib/auth.tsx（AuthProvider/RequireAuth 路由守卫）+ /login 页（登录/注册二合一 Tab）；头部显示用户名和退出按钮
- 复习卡片 card_state 按用户懒创建：首次答题时插入该用户的卡片状态，种子不再写全局 card_state
- **免费学习模式（用户明确要求）**：游客无需注册即可浏览/试学全部内容（课程、阅读器、柏杨版、测验、复习卡练习）；stats 与复习队列对游客公开（返回全 0 进度/可练卡片）；仅写进度接口（标记已读、保存成绩、复习排期）需登录。前端各写入点对游客降级为"本地生效+轻提示"（toast/提示条），绝不挡路；注册只为保存进度
