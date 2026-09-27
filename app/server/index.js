import Database from 'better-sqlite3'
import express from 'express'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'tongjian.db')
const EXTRACT_IMAGES = path.resolve(__dirname, '..', '..', 'extract', 'boyang', 'images')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()

// ---------------------------------------------------------------- 学习状态表 (内容表全局共享, 状态表按 user_id 隔离)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reading_state (
  user_id INTEGER NOT NULL,
  volume_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | done
  last_opened TEXT,
  updated_at TEXT,
  PRIMARY KEY (user_id, volume_id)
);
CREATE TABLE IF NOT EXISTS lessons (
  slug TEXT PRIMARY KEY, seq INTEGER, title TEXT, subtitle TEXT,
  focus TEXT, content TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lesson_state (
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  best_score INTEGER,
  completed_at TEXT,
  PRIMARY KEY (user_id, slug)
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY, lesson_slug TEXT NOT NULL,
  front TEXT NOT NULL, back TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS card_state (
  user_id INTEGER NOT NULL,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  ease REAL DEFAULT 2.5, interval_days REAL DEFAULT 0,
  reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  due TEXT NOT NULL, last_grade INTEGER, updated_at TEXT,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS study_log (
  day TEXT NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY, section_id INTEGER NOT NULL,
  pattern TEXT NOT NULL, note TEXT, kind TEXT NOT NULL DEFAULT 'boy'
);
CREATE INDEX IF NOT EXISTS idx_highlights_sec ON highlights(section_id);
`)

// 老库升级: highlights 无 kind 列时补上
try { db.prepare('SELECT kind FROM highlights LIMIT 1').get() } catch {
  db.exec("ALTER TABLE highlights ADD COLUMN kind TEXT NOT NULL DEFAULT 'boy'")
}

// 老库升级: 单用户状态表并入默认账号 local, 原有学习进度不丢失
{
  const hasUid = (t) => db.prepare(`PRAGMA table_info(${t})`).all().some((c) => c.name === 'user_id')
  if (!hasUid('reading_state')) {
    const uid = db.prepare('INSERT INTO users(name,password_hash,created_at) VALUES(?,?,?)')
      .run('local', bcrypt.hashSync('local1234', 10), now()).lastInsertRowid
    console.log('检测到旧版单用户数据: 已迁移到默认账号 local (密码 local1234), 登录后可继续原进度')
    db.transaction(() => {
      db.exec(`
      CREATE TABLE reading_state_new (user_id INTEGER NOT NULL, volume_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'open', last_opened TEXT, updated_at TEXT,
        PRIMARY KEY (user_id, volume_id));
      INSERT INTO reading_state_new SELECT ${uid}, volume_id, status, last_opened, updated_at FROM reading_state;
      DROP TABLE reading_state;
      ALTER TABLE reading_state_new RENAME TO reading_state;
      CREATE TABLE lesson_state_new (user_id INTEGER NOT NULL, slug TEXT NOT NULL,
        status TEXT DEFAULT 'in_progress', best_score INTEGER, completed_at TEXT,
        PRIMARY KEY (user_id, slug));
      INSERT INTO lesson_state_new SELECT ${uid}, slug, status, best_score, completed_at FROM lesson_state;
      DROP TABLE lesson_state;
      ALTER TABLE lesson_state_new RENAME TO lesson_state;
      CREATE TABLE card_state_new (user_id INTEGER NOT NULL, card_id INTEGER NOT NULL REFERENCES cards(id),
        ease REAL DEFAULT 2.5, interval_days REAL DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
        due TEXT NOT NULL, last_grade INTEGER, updated_at TEXT,
        PRIMARY KEY (user_id, card_id));
      INSERT INTO card_state_new SELECT ${uid}, card_id, ease, interval_days, reps, lapses, due, last_grade, updated_at FROM card_state;
      DROP TABLE card_state;
      ALTER TABLE card_state_new RENAME TO card_state;
      CREATE TABLE study_log_new (day TEXT NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL,
        detail TEXT, created_at TEXT NOT NULL);
      INSERT INTO study_log_new SELECT day, ${uid}, action, detail, created_at FROM study_log;
      DROP TABLE study_log;
      ALTER TABLE study_log_new RENAME TO study_log;
      `)
    })()
  }
}
db.exec(`
CREATE INDEX IF NOT EXISTS idx_study_user_day ON study_log(user_id, day);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)

function log(userId, action, detail = null) {
  if (!userId) return   // 未登录浏览不计入学习日志
  db.prepare('INSERT INTO study_log(day,user_id,action,detail,created_at) VALUES(?,?,?,?,?)')
    .run(today(), userId, action, detail, now())
}

// ---------------------------------------------------------------- 第一课种子
const LESSON_0001 = {
  slug: 'sanjiafenjin',
  seq: 1,
  title: '第 1 课 · 三家分晋与才德之辩',
  subtitle: '全书开篇总纲：司马光为什么从前 403 年讲起',
  focus: '历史脉络 · 决策智慧 · 兴趣修身',
  content: {
    keyPoints: [
      '《通鉴》为什么从前 403 年讲起：周天子册封犯上之臣（三家分晋），是司马光眼中华夏秩序崩坏的临界点——开篇「臣光曰」的名分论，是全 294 卷的总纲。',
      '一个决策故事：智瑶五项才能俱全，只因「刻薄寡恩」而灭族；赵无恤靠三年竹简检验胜出——选人先看德，德要靠时间和情境来检验。',
      '一句传世结论：「聪察强毅之谓才，正直中和之谓德」，才胜德的小人最危险；但柏杨在译本中当场反驳——两种视角对照着读，是这部书最有趣的地方。',
    ],
    intro: [
      '《资治通鉴》记事从公元前 403 年开始——不是从更早的平王东迁，也不是从孔子作《春秋》，而是从一件「天子自己破坏规矩」的事开始：周威烈王姬午下令册封晋国的三位大夫魏斯、赵籍、韩虔为诸侯。三家瓜分晋国，天子不但不讨伐，反而追认。',
      '这一课我们读三样东西：① 司马光借这件事写下的全书总纲「名分论」；② 智、赵两家选继承人的对照故事——全书第一个决策案例；③ 智伯灭亡后司马光的「才德之辩」——全书被引用最多的用人智慧。读完这一课，你就拿到了理解后面 293 卷的钥匙。',
    ],
    blocks: [
      {
        type: 'narration',
        title: '一、天子坏名分：全书为何从这里开始',
        text: '公元前 403 年，晋国早被魏、赵、韩、智四大家族掏空，国君只剩虚名。四家内斗中智氏最强，却被另外三家联手灭亡、瓜分。此时周天子册封三家为诸侯——在司马光看来，礼制的崩坏不在臣子篡权（古已有之），而在天子亲自为犯上者「正名」。所以开篇第一句就是「初命晋大夫魏斯、赵籍、韩虔为诸侯」，紧接着是全书第一篇「臣光曰」。',
      },
      {
        type: 'passage',
        title: '开篇 · 初命三家为诸侯 + 臣光曰（名分论）',
        orig: { volume: 1, seqs: [4, 5] },
        boy: { section: 1006, seqs: [22, 24] },
      },
      {
        type: 'narration',
        title: '二、两个父亲的选择：全书第一个决策案例',
        text: '司马光随即倒叙智氏灭亡的缘由。智宣子选继承人，看中智瑶「五项过人」：仪表堂堂、精于骑射、才艺出众、能写善辩、坚毅果敢。族人智果却反对：他不逮的地方只有一条——不讲仁德。以才胜德，终必灭族。智宣子不听。同一时期，赵简子也在两个儿子中选储，他把训诫写在竹简上交给两个儿子，三年后检查：伯鲁答不出、竹简也丢了；无恤对答如流、竹简随身袖中。赵简子立了无恤。两个用人决策，决定了两个家族的生死。',
      },
      {
        type: 'passage',
        title: '智宣子立嗣 · 智果的警告',
        orig: { volume: 1, seqs: [12, 13] },
        boy: { section: 1006, seqs: [40, 41] },
      },
      {
        type: 'narration',
        title: '三、骄横的代价：晋阳之围',
        text: '智瑶掌权后骄横日甚：蓝台宴上戏弄韩虎、侮辱段规；索地于韩、魏得逞后，又向赵无恤索地被拒，于是率韩魏攻赵、水灌晋阳。谋士絺疵提醒「韩魏必反」，智瑶不察；赵无恤派张孟谈夜缒出城，以「唇亡齿寒」说动韩魏，三家反手灭智。智瑶的头骨被漆成酒器。选错继承人的代价，在这里清算完毕。',
      },
      {
        type: 'passage',
        title: '水灌晋阳 · 唇亡齿寒',
        orig: { volume: 1, seqs: [15, 19] },
        boy: { section: 1006, seqs: [45, 46, 47, 48, 49, 50] },
      },
      {
        type: 'narration',
        title: '四、才德之辩：全书最著名的用人论',
        text: '事件讲完，司马光写下第二篇「臣光曰」：智伯之亡，才胜德也。他给出定义——聪察强毅之谓才，正直中和之谓德；才者德之资，德者才之帅。并按才德组合把人分为四等：德才全尽是圣人，德兼才缺是君子，才胜德是「小人」中最危险的一类，因为才有余足以遂其奸。柏杨在译本中对此提出了尖锐反驳（柏杨曰），两种视角对照读，正是这部书最有趣的地方。',
      },
      {
        type: 'passage',
        title: '臣光曰 · 智伯之亡，才胜德也 + 柏杨曰（反方观点）',
        orig: { volume: 1, seqs: [20] },
        boy: { section: 1006, seqs: [52, 54] },
      },
      {
        type: 'insight',
        title: '五、带走什么：这一课与现代生活的联结',
        groups: [
          {
            tag: '管理',
            title: '晋升业务最强的人，是「智瑶陷阱」',
            text: '智瑶五项全能——仪表、骑射、才艺、文采、坚毅，智果反对的理由只有一条：甚不仁。团队里技术最强、最能说的人升任经理后把团队带散，是每个组织都经历过的「才胜德」。提拔管理者前，把评估重心从「他有多强」换成「他在利益冲突时怎么选」：抢功还是让功？出错时先找借口还是先补锅？对地位不如他的人是什么态度？司马光的排序至今成立——德者，才之帅也。',
          },
          {
            tag: '管理',
            title: '别惩罚带来坏消息的人',
            text: '晋阳城破前，谋臣絺疵两次提醒「韩魏必反」，智伯不仅不听，还故意把他的判断泄露给韩魏二人。此后组织的规律从未变过：报忧者被嘲讽一次，坏消息就开始绕道而行。管理者要做的不是挂一块「开放沟通」的牌子，而是让带来坏消息的人得到公开感谢——坏消息传得越快，代价越小。智伯真正的失败不是没听到警告，而是让警告者闭了嘴。',
          },
          {
            tag: '工作',
            title: '跨团队协作：唇亡齿寒',
            text: '张孟谈夜里缒出晋阳城说动韩魏倒戈，靠的不是口才而是一个冷静判断：智伯今天用你们的人打我，明天就轮到你们。职场版：看到隔壁团队被不合理地抽调、压榨时，幸灾乐祸是短视——今天的旁观者就是明天的当事者。在会上为邻团队的合理边界说一句公道话，是最便宜的自我保险。',
          },
          {
            tag: '工作',
            title: '名分与边界：先问「谁拍板」',
            text: '司马光说「惟名与器，不可以假人」——组织里的 title、签字权、决策权就是现代「名器」。模糊的口头授权（「这事你先看着办」）与不清的职责边界，是协作混乱的总根源。接手一个项目或接受一个 offer 之前，先确认三件事：我的决策边界在哪、出问题谁拍板、资源谁说了算。名分清则上下相保，名分乱则推诿扯皮——这一条在周威烈王和现代公司里同样成立。',
          },
          {
            tag: '生活',
            title: '择偶择友：找「那一条缺点」',
            text: '智果评估智瑶的方式值得学：不列优点清单（优点是明摆着的），而是找那一条不能接受的缺点。选长期关系的伙伴时反过来问：这个人最差的那一面是什么？压力大时怎么对待身边人？利益冲突时选谁？——五项优点加一条致命缺点，等于那条致命缺点。',
          },
          {
            tag: '生活',
            title: '无原则退让，会喂养索取',
            text: '智伯向韩家索地，韩家给了；向魏家索地，魏家也给了——每一次退让都让下一次索取更大，直到晋阳被水灌。亲戚借钱、朋友托办超出能力的事，同理：值得帮，但边界要事先说清。用司马光的话说：不是不能给，是「名分」要先定——哪些可以给、哪些是底线，事前讲明白，事后才不伤感情。',
          },
          {
            tag: '学习',
            title: '先读总纲，再进细节',
            text: '司马光把全书的「使用说明书」（名分论）放在第一页，把最典型的用人案例（智伯之亡）作为第一个故事——这是刻意的课程设计。学任何东西都一样：先找这门学科的「臣光曰」——总纲和最有代表性的案例，再进细节。否则读了一年，还不知道这本书为什么这样写。',
          },
          {
            tag: '学习',
            title: '把经历整理成自己的案例库',
            text: '司马光的功夫，是把一千三百六十二年的兴衰整理成「遇到类似局面该怎么判断」的案例库。你的决策日志同理：把工作中的选择（谁升职、要不要接这个项目）与结果记下来，隔段时间回看。本站的复习卡片就是这个方法的机械版——判断力来自被反复提取的案例，不来自读过的页数。',
          },
        ],
      },
    ],
    quiz: [
      {
        q: '《资治通鉴》的记事从哪一年开始？',
        options: ['公元前 403 年，三家分晋', '公元前 770 年，平王东迁', '公元前 221 年，秦灭六国', '公元前 841 年，共和行政'],
        answer: 0,
        explain: '全书开篇即「初命晋大夫魏斯、赵籍、韩虔为诸侯」——前 403 年天子册封三家为诸侯。',
      },
      {
        q: '司马光认为，天子之职最重要的是什么？',
        options: ['开疆拓土，威服四方', '维护礼制，严守名分', '任用贤能，广纳谏言', '休养生息，轻徭薄赋'],
        answer: 1,
        explain: '「天子之职莫大于礼，礼莫大于分，分莫大于名」——这是全书的总纲。',
      },
      {
        q: '智果反对立智瑶为继承人的核心理由是什么？',
        options: ['智瑶缺乏治军的能力', '智瑶年纪太轻威望不足', '智瑶不孝敬家族长辈', '智瑶才有余而德不足'],
        answer: 3,
        explain: '五项长处皆有，唯独「甚不仁」——以才胜德，力有余而德不制，必覆宗族。',
      },
      {
        q: '赵简子用什么方法在两个儿子中选定了继承人？',
        options: ['让朝中重臣集体评议', '观察他们日常饮酒表现', '三年竹简训诫的检验', '比较两人战场上的军功'],
        answer: 2,
        explain: '训诫写在竹简上，三年后伯鲁丢失竹简答不出，无恤对答如流且随身携带竹简。',
      },
      {
        q: '晋阳之战的转折点是哪件事？',
        options: ['智瑶听信谗言自毁长城', '楚国出兵救援晋阳守军', '张孟谈夜出说动韩魏倒戈', '秦国切断智军粮道退兵'],
        answer: 2,
        explain: '张孟谈以「唇亡则齿寒」说动韩魏，三家里应外合，反手灭智。',
      },
      {
        q: '司马光对「才」与「德」的定义是哪一组？',
        options: ['博学为才，忠诚为德', '聪察强毅为才，正直中和为德', '勇决为才，宽厚为德', '权变为才，守拙为德'],
        answer: 1,
        explain: '「夫聪察强毅之谓才，正直中和之谓德。才者，德之资也；德者，才之帅也。」',
      },
    ],
    resources: [
      { title: '姜鹏《资治通鉴》导读（复旦通识课，学堂在线）', url: 'https://www.xuetangx.com/' },
      { title: '《百家讲坛》姜鹏品读《资治通鉴》', url: 'https://tv.cctv.com/lm/bjjt/' },
      { title: '维基文库《资治通鉴》原文（校对参考）', url: 'https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91' },
    ],
  },
}

function seed() {
  // 课程内容以代码为准: 每次启动同步覆盖
  db.prepare(`INSERT INTO lessons(slug,seq,title,subtitle,focus,content) VALUES(?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET seq=excluded.seq, title=excluded.title,
      subtitle=excluded.subtitle, focus=excluded.focus, content=excluded.content`)
    .run(LESSON_0001.slug, LESSON_0001.seq, LESSON_0001.title, LESSON_0001.subtitle,
      LESSON_0001.focus, JSON.stringify(LESSON_0001.content))
  const card = db.prepare('INSERT INTO cards(lesson_slug,front,back) VALUES(?,?,?)')
  const hasCards = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE lesson_slug=?').get(LESSON_0001.slug)
  if (hasCards.n === 0) {
    for (const q of LESSON_0001.content.quiz) {
      card.run(LESSON_0001.slug, q.q, q.options[q.answer] + '——' + q.explain)
    }
    console.log('seeded cards for lesson 1')
  }
}
seed()

// ---------------------------------------------------------------- 高亮重点句 (逐字匹配, boy=柏杨白话 / orig=文言原文)
const HIGHLIGHTS_1006_BOY = [
  // 三家分晋 · 名分论
  ['下令擢升三大家族族长', '天子亲手为犯上者正名——全书批判的起点'],
  ['天子最重要的责任，莫过于维护礼教', '臣光曰总纲：礼→分→名，三层递进'],
  ['才能是品德的基础，品德是才能的主宰', '才者德之资，德者才之帅'],
  // 智瑶选嗣
  ['智瑶有五项超人的优点，只有一项缺点', '评估人先看缺点那条短线, 不是优点清单'],
  ['胸襟狭窄，刻薄寡恩', '一条致命缺点压倒五项优点'],
  ['五种才干加上毫无容人之量，谁能跟他和平相处', '智果的核心逻辑：才高德薄者必树敌'],
  ['如果要智瑶做你继承人的话，智姓家族一定覆灭', '一语成谶——智果是全书第一位「先见者」'],
  // 蓝台之辱
  ['激怒对方而不防备报复，灾难必然临头', '智国的警告: 情绪化树的靶, 自己忘了个干净'],
  ['我就是灾难，我不给别人灾难，已算运气了，谁敢给我灾难', '全书最经典的狂言——覆亡前夜的自负'],
  // 晋阳之围
  ['大人物能在小事情上谨慎，才能避免大的忧患', '黄蜂蚂蚁都能害人, 何况兵团首领'],
  ['唇亡则齿寒，赵家覆灭之后，接着就是你们', '张孟谈的说服核心: 共同威胁重于眼前利益'],
  ['谋略出于二位主上之口，入于我张孟谈一人之耳', '保密闭环——大事成于密'],
  // 才德之辩
  ['智瑶之所以覆亡，在于他的才能胜过他的品德', '第二篇臣光曰的开篇判词'],
  ['与其用「小人」，还不如用「愚人」', '愚人作恶力不足, 小人作恶如虎添翼'],
  ['品德使人尊敬，才能使人喜爱', '尊敬易疏远、喜爱易亲信——权柄者常被才所蔽'],
]

const HIGHLIGHTS_1006_ORIG = [
  ['初命晋大夫魏斯、赵籍、韩虔为诸侯', '全书第一句: 一个「初命」字字千钧——坏礼自天子始'],
  ['天子之职莫大于礼，礼莫大于分，分莫大于名', '总纲二十字，值得背下来'],
  ['瑶之贤于人者五，其不逮者一也', '文言版「五项优点一条缺点」，重音在「一」'],
  ['乃书训戒之辞于二简', '赵简子「延时情境测试」的开局动作'],
  ['三年而问之，伯鲁不能举其辞', '检验德性需要给时间——三年为期'],
  ['唇亡则齿寒', '四个字的说服框架: 把对方的利益绑进来'],
  ['谋出二主之口，入臣之耳，何伤也', '保密闭环的文言原句'],
  ['聪察强毅之谓才，正直中和之谓德', '才与德的原始定义'],
  ['才者，德之资也，德者，才之帅也', '「资」「帅」二字是全段眼目'],
  ['德胜才谓之“君子”，才胜德谓之“小人”', '四象限判词'],
  ['与其得小人，不若得愚人', '取人术最惊世的结论，理解它就读懂了本篇'],
]

function seedHighlights() {
  const ins = db.prepare('INSERT INTO highlights(section_id,pattern,note,kind) VALUES(?,?,?,?)')
  const cnt = db.prepare('SELECT COUNT(*) AS c FROM highlights WHERE section_id=1006 AND kind=?')
  if (cnt.get('boy').c === 0) {
    for (const [p, note] of HIGHLIGHTS_1006_BOY) ins.run(1006, p, note, 'boy')
    console.log('seeded boy highlights for section 1006')
  }
  if (cnt.get('orig').c === 0) {
    for (const [p, note] of HIGHLIGHTS_1006_ORIG) ins.run(1006, p, note, 'orig')
    console.log('seeded orig highlights for section 1006')
  }
}
seedHighlights()

// ---------------------------------------------------------------- API
const app = express()
app.use(express.json())
// 柏杨版地图图片(直接挂载解包目录, 不复制)
app.use('/boyang-img', express.static(EXTRACT_IMAGES))

// ---------------------------------------------------------------- 认证: 注册/登录/会话 (cookie tj_session)
const COOKIE = 'tj_session'
const SESSION_DAYS = 30
app.use(cookieParser())

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
  db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)')
    .run(token, userId, now(), expires.toISOString())
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', expires })
}

// 每个请求解析当前用户: q.user = { id, name } | null
app.use((q, _s, next) => {
  const token = q.cookies?.[COOKIE]
  q.user = token
    ? db.prepare(`SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?`).get(token, now()) || null
    : null
  next()
})

const requireUser = (q, s, next) => (q.user ? next() : s.status(401).json({ error: 'unauthorized' }))

app.post('/api/auth/register', async (q, s) => {
  const name = String(q.body?.name || '').trim()
  const password = String(q.body?.password || '')
  if (!name || name.length > 30) return s.status(400).json({ error: '用户名需 1-30 个字符' })
  if (password.length < 6) return s.status(400).json({ error: '密码至少 6 位' })
  if (db.prepare('SELECT id FROM users WHERE name=?').get(name))
    return s.status(409).json({ error: '用户名已被占用' })
  const hash = await bcrypt.hash(password, 10)
  const info = db.prepare('INSERT INTO users(name,password_hash,created_at) VALUES(?,?,?)').run(name, hash, now())
  startSession(s, info.lastInsertRowid)
  s.json({ id: info.lastInsertRowid, name })
})

app.post('/api/auth/login', async (q, s) => {
  const name = String(q.body?.name || '').trim()
  const u = db.prepare('SELECT * FROM users WHERE name=?').get(name)
  if (!u || !(await bcrypt.compare(String(q.body?.password || ''), u.password_hash)))
    return s.status(401).json({ error: '用户名或密码错误' })
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now())
  startSession(s, u.id)
  s.json({ id: u.id, name: u.name })
})

app.post('/api/auth/logout', (q, s) => {
  const token = q.cookies?.[COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token)
  s.clearCookie(COOKIE)
  s.json({ ok: true })
})

app.get('/api/auth/me', (q, s) => s.json({ user: q.user }))

const J = (s) => JSON.parse(s)

app.get('/api/health', (_q, s) => s.json({ ok: true }))

// --- 卷列表(按纪分组) + 阅读状态
app.get('/api/volumes', (q, s) => {
  const rows = db.prepare(`
    SELECT v.id, v.num, v.title, v.era, v.era_group, v.range_text,
           COALESCE(r.status,'') AS status
    FROM volumes v LEFT JOIN reading_state r ON r.volume_id = v.id AND r.user_id = ?
    ORDER BY v.num`).all(q.user?.id ?? -1)
  s.json(rows)
})

app.get('/api/volumes/:num', (q, s) => {
  const vol = db.prepare('SELECT * FROM volumes WHERE num=?').get(q.params.num)
  if (!vol) return s.status(404).json({ error: 'not found' })
  const paras = db.prepare(`
    SELECT seq, kind, segments, plain, tj_year FROM paragraphs
    WHERE volume_id=? ORDER BY seq`).all(vol.id)
  if (q.user) {
    db.prepare(`INSERT INTO reading_state(user_id,volume_id,status,last_opened,updated_at)
      VALUES(?,?,COALESCE((SELECT status FROM reading_state WHERE user_id=? AND volume_id=?),'open'),?,?)
      ON CONFLICT(user_id,volume_id) DO UPDATE SET last_opened=excluded.last_opened, updated_at=excluded.updated_at`)
      .run(q.user.id, vol.id, q.user.id, vol.id, today(), now())
  }
  log(q.user?.id, 'open_volume', String(vol.num))
  s.json({ volume: vol, paragraphs: paras.map((p) => ({ ...p, segments: J(p.segments) })) })
})

app.post('/api/reading/:num', requireUser, (q, s) => {
  const { status } = q.body || {}
  if (!['open', 'done'].includes(status)) return s.status(400).json({ error: 'bad status' })
  const vol = db.prepare('SELECT id FROM volumes WHERE num=?').get(q.params.num)
  if (!vol) return s.status(404).json({ error: 'not found' })
  db.prepare(`INSERT INTO reading_state(user_id,volume_id,status,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(user_id,volume_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`)
    .run(q.user.id, vol.id, status, now())
  log(q.user.id, 'volume_' + status, String(q.params.num))
  s.json({ ok: true })
})

// --- 柏杨版
app.get('/api/boyang/books', (_q, s) => {
  s.json(db.prepare('SELECT id,title,box FROM boyang_books WHERE id>0 ORDER BY id').all())
})
app.get('/api/boyang/books/:id', (q, s) => {
  const book = db.prepare('SELECT * FROM boyang_books WHERE id=?').get(q.params.id)
  if (!book) return s.status(404).json({ error: 'not found' })
  const sections = db.prepare(
    'SELECT id,kind,title,seq,y0,y1 FROM boyang_sections WHERE book_id=? ORDER BY seq').all(book.id)
  s.json({ book, sections })
})
app.get('/api/boyang/sections/:id', (q, s) => {
  const sec = db.prepare('SELECT * FROM boyang_sections WHERE id=?').get(q.params.id)
  if (!sec) return s.status(404).json({ error: 'not found' })
  const paras = db.prepare(
    'SELECT seq,kind,text,by_year,file FROM boyang_paragraphs WHERE section_id=? ORDER BY seq').all(sec.id)
  const highlights = db.prepare(
    'SELECT pattern,note FROM highlights WHERE section_id=?').all(sec.id)
  s.json({ section: sec, paragraphs: paras, highlights })
})
// 按年份找柏杨章节(阅读器「看白话」跳转用)
app.get('/api/boyang/by-year/:year', (q, s) => {
  const y = Number(q.params.year)
  const rows = db.prepare(`
    SELECT s.id, s.title, b.title AS book_title FROM boyang_sections s
    JOIN boyang_books b ON b.id = s.book_id
    WHERE s.y0 <= ? AND ? <= s.y1 ORDER BY s.id LIMIT 3`).all(y, y)
  s.json(rows)
})

// --- 课程
app.get('/api/lessons', (q, s) => {
  const rows = db.prepare(`
    SELECT l.slug, l.seq, l.title, l.subtitle, l.focus,
           COALESCE(st.status,'new') AS status, st.best_score
    FROM lessons l LEFT JOIN lesson_state st ON st.slug = l.slug AND st.user_id = ?
    ORDER BY l.seq`).all(q.user?.id ?? -1)
  s.json(rows)
})
app.get('/api/lessons/:slug', (q, s) => {
  const l = db.prepare('SELECT * FROM lessons WHERE slug=?').get(q.params.slug)
  if (!l) return s.status(404).json({ error: 'not found' })
  const st = db.prepare('SELECT * FROM lesson_state WHERE slug=? AND user_id=?').get(l.slug, q.user?.id ?? -1)
  s.json({ ...l, content: J(l.content), state: st || null })
})
// 文白对照段落包(课程页用)
app.post('/api/passage', (q, s) => {
  const { volume, seqs, section } = q.body || {}
  const orig = db.prepare(`
    SELECT seq, kind, segments, plain FROM paragraphs
    WHERE volume_id=? AND seq IN (${(seqs || []).map(() => '?').join(',') || "''"})
    ORDER BY seq`).all(volume, ...(seqs || []))
  const boy = db.prepare(`
    SELECT seq, kind, text FROM boyang_paragraphs
    WHERE section_id=? AND seq IN (${(q.body.bseqs || []).map(() => '?').join(',') || "''"})
    ORDER BY seq`).all(section, ...(q.body.bseqs || []))
  const highlights = db.prepare(
    "SELECT pattern,note FROM highlights WHERE section_id=? AND kind='boy'").all(section)
  const origHighlights = db.prepare(
    "SELECT pattern,note FROM highlights WHERE section_id=? AND kind='orig'").all(section)
  s.json({
    orig: orig.map((p) => ({ ...p, segments: J(p.segments) })),
    boy,
    highlights,
    origHighlights,
  })
})
app.post('/api/lessons/:slug/complete', requireUser, (q, s) => {
  const { score } = q.body || {}
  const l = db.prepare('SELECT slug FROM lessons WHERE slug=?').get(q.params.slug)
  if (!l) return s.status(404).json({ error: 'not found' })
  db.prepare(`INSERT INTO lesson_state(user_id,slug,status,best_score,completed_at) VALUES(?,?,?,?,?)
    ON CONFLICT(user_id,slug) DO UPDATE SET status='done', best_score=MAX(best_score,excluded.best_score), completed_at=excluded.completed_at`)
    .run(q.user.id, l.slug, 'done', score ?? 0, now())
  log(q.user.id, 'lesson_done', `${l.slug}:${score ?? 0}`)
  s.json({ ok: true })
})

// --- 复习 (简化 SM-2) — 队列对游客开放(练习模式), 作答排期仍需登录
app.get('/api/review/queue', (q, s) => {
  const rows = db.prepare(`
    SELECT c.id, c.front, c.back, cs.due, cs.reps, cs.interval_days
    FROM cards c LEFT JOIN card_state cs ON cs.card_id = c.id AND cs.user_id = ?
    WHERE COALESCE(cs.due,'0') <= ?
    ORDER BY COALESCE(cs.reps,0), c.id LIMIT 20`).all(q.user?.id ?? -1, today())
  s.json(rows)
})
app.post('/api/review/answer', requireUser, (q, s) => {
  const { cardId, grade } = q.body || {}   // grade: 0 again / 1 good / 2 easy
  let cs = db.prepare('SELECT * FROM card_state WHERE user_id=? AND card_id=?').get(q.user.id, cardId)
  if (!cs) {   // 新卡首次作答: 建立该用户的卡片状态
    db.prepare('INSERT INTO card_state(user_id,card_id,due) VALUES(?,?,?)').run(q.user.id, cardId, today())
    cs = db.prepare('SELECT * FROM card_state WHERE user_id=? AND card_id=?').get(q.user.id, cardId)
  }
  let { ease, interval_days, reps, lapses } = cs
  if (grade === 0) {
    ease = Math.max(1.3, ease - 0.2)
    interval_days = 0
    reps = 0
    lapses += 1
  } else {
    if (grade === 2) ease = Math.min(3.2, ease + 0.1)
    if (reps === 0) interval_days = grade === 2 ? 3 : 1
    else if (reps === 1) interval_days = grade === 2 ? 8 : 3
    else interval_days = Math.round(interval_days * ease * (grade === 2 ? 1.4 : 1))
    reps += 1
  }
  const due = new Date(Date.now() + interval_days * 86400000).toISOString().slice(0, 10)
  db.prepare(`UPDATE card_state SET ease=?,interval_days=?,reps=?,lapses=?,due=?,last_grade=?,updated_at=?
    WHERE user_id=? AND card_id=?`)
    .run(ease, interval_days, reps, lapses, due, grade, now(), q.user.id, cardId)
  log(q.user.id, 'review', String(cardId))
  s.json({ ok: true, next_due: due, interval_days })
})

// --- 统计 (游客返回全 0 进度, 登录后为个人数据)
app.get('/api/stats', (q, s) => {
  const uid = q.user?.id ?? -1
  const vols = db.prepare('SELECT COUNT(*) n FROM volumes').get().n
  const done = db.prepare("SELECT COUNT(*) n FROM reading_state WHERE user_id=? AND status='done'").get(uid).n
  const lessonsDone = db.prepare("SELECT COUNT(*) n FROM lesson_state WHERE user_id=? AND status='done'").get(uid).n
  const lessonsAll = db.prepare('SELECT COUNT(*) n FROM lessons').get().n
  const due = db.prepare("SELECT COUNT(*) n FROM cards c JOIN card_state cs ON cs.card_id=c.id AND cs.user_id=? WHERE cs.due <= ?").get(uid, today()).n
  // streak: 连续有 study_log 的天数
  const days = new Set(db.prepare('SELECT DISTINCT day FROM study_log WHERE user_id=?').all(uid).map((r) => r.day))
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) { streak += 1; d.setDate(d.getDate() - 1) } else break
  }
  const nextLesson = db.prepare(`
    SELECT l.slug FROM lessons l LEFT JOIN lesson_state st ON st.slug=l.slug AND st.user_id=?
    WHERE st.status IS NULL OR st.status != 'done' ORDER BY l.seq LIMIT 1`).get(uid)
  s.json({ vols, done, lessonsDone, lessonsAll, due, streak, nextLesson: nextLesson?.slug ?? 'sanjiafenjin' })
})

// 生产模式: 服务构建产物
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_q, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = 3001
app.listen(PORT, () => console.log(`tongjian server on http://localhost:${PORT}`))
