import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveOrig, resolveBoy, resolveHighlightSection, MIN_ANCHOR } from './resolve.js'

// 语料夹具: 一卷原文 (plain), 一册柏杨 (三个章节)
const vol1 = [
  { seq: 4, text: '初命晋大夫魏斯、赵籍、韩虔为诸侯。' },
  { seq: 5, text: '臣光曰：臣闻天子之职莫大于礼，礼莫大于分。' },
  { seq: 12, text: '初，智宣子将以瑶为后，智果曰：不如宵也。' },
  { seq: 13, text: '赵简子之子，长曰伯鲁，幼曰无恤。' },
]
const book1 = [
  { section: 1005, seq: 1, text: '前一章的段落甲。' },
  { section: 1006, seq: 22, text: '晋国长期以来，在魏、赵、韩三大家族……' },
  { section: 1006, seq: 23, text: '司马光曰：' },
  { section: 1006, seq: 24, text: '天子最重要的责任，莫过于维护礼教。' },
  { section: 1007, seq: 1, text: '下一章的段落乙。' },
]
const getVol = () => vol1
const getBook = () => book1

test('resolveOrig: 单段 + span 展开', () => {
  assert.deepEqual(
    resolveOrig([{ volume: 1, anchor: '初命晋大夫魏斯、赵籍、韩虔为诸侯', span: 2 }], getVol),
    { volume: 1, seqs: [4, 5] },
  )
})

test('resolveOrig: 跳段 = 多段条目, seqs 排序去重', () => {
  assert.deepEqual(
    resolveOrig([
      { volume: 1, anchor: '初，智宣子将以瑶为后', span: 1 },
      { volume: 1, anchor: '赵简子之子，长曰伯鲁', span: 1 },
    ], getVol),
    { volume: 1, seqs: [12, 13] },
  )
})

test('resolveOrig: span 默认 1', () => {
  assert.deepEqual(resolveOrig([{ volume: 1, anchor: '初命晋大夫魏斯' }], getVol), { volume: 1, seqs: [4] })
})

test('resolveOrig: 锚过短报错', () => {
  assert.throws(() => resolveOrig([{ volume: 1, anchor: '初命晋大夫' }], getVol), /至少需 6 字/)
})

test('resolveOrig: 未命中报错', () => {
  assert.throws(() => resolveOrig([{ volume: 1, anchor: '这一段根本不存在于卷中' }], getVol), /未命中任何段落/)
})

test('resolveOrig: 多处命中报错并给出段号', () => {
  const vol = [
    { seq: 1, text: '赵简子之子，长曰伯鲁。' },
    { seq: 2, text: '赵简子之子，幼曰无恤。' },
  ]
  assert.throws(() => resolveOrig([{ volume: 1, anchor: '赵简子之子，' }], () => vol), /命中多处/)
})

test('resolveOrig: 不同卷混用报错', () => {
  assert.throws(() => resolveOrig([
    { volume: 1, anchor: '初命晋大夫魏斯', span: 1 },
    { volume: 2, anchor: '初命晋大夫魏斯', span: 1 },
  ], getVol), /须同卷/)
})

test('resolveOrig: span 超出卷末尾报错', () => {
  assert.throws(() => resolveOrig([{ volume: 1, anchor: '赵简子之子，长曰伯鲁', span: 5 }], getVol), /超出卷/)
})

test('resolveBoy: 跨段 span 同章节', () => {
  assert.deepEqual(
    resolveBoy([{ book: 1, anchor: '晋国长期以来', span: 3 }], getBook),
    { section: 1006, seqs: [22, 23, 24] },
  )
})

test('resolveBoy: 跳段多段条目 (跳过司马光曰标记)', () => {
  assert.deepEqual(
    resolveBoy([
      { book: 1, anchor: '晋国长期以来', span: 1 },
      { book: 1, anchor: '天子最重要的责任', span: 1 },
    ], getBook),
    { section: 1006, seqs: [22, 24] },
  )
})

test('resolveBoy: span 跨章节报错', () => {
  assert.throws(() => resolveBoy([{ book: 1, anchor: '天子最重要的责任', span: 2 }], getBook), /跨章节/)
})

test('resolveBoy: 段落解析到不同章节报错', () => {
  assert.throws(() => resolveBoy([
    { book: 1, anchor: '前一章的段落甲', span: 1 },
    { book: 1, anchor: '下一章的段落乙', span: 1 },
  ], getBook), /须同章节/)
})

test('resolveBoy: 不同册混用报错', () => {
  assert.throws(() => resolveBoy([
    { book: 1, anchor: '晋国长期以来', span: 1 },
    { book: 2, anchor: '晋国长期以来', span: 1 },
  ], getBook), /须同册/)
})

test('resolveHighlightSection: 书内唯一前缀 → section_id', () => {
  assert.equal(resolveHighlightSection(1, '天子最重要的责任', getBook), 1006)
  assert.throws(() => resolveHighlightSection(1, '根本不存在的锚文本内容', getBook), /未命中/)
})

test('MIN_ANCHOR ≥ 6', () => assert.ok(MIN_ANCHOR >= 6))
