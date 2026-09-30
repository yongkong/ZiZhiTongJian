import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateLesson, validateHighlightEntry } from './validate.js'

const base = {
  slug: 'demo', seq: 1, title: '第 1 课', subtitle: '副题', focus: '重点',
  content: {
    keyPoints: ['要点一'], intro: ['导语'],
    blocks: [
      { type: 'narration', title: '讲解', text: '正文' },
      { type: 'passage', title: '选段', orig: [{ volume: 1, anchor: '初命晋大夫魏斯', span: 2 }], boy: [{ book: 1, anchor: '晋国长期以来', span: 1 }] },
      { type: 'insight', title: '启示', groups: [{ tag: '管理', title: 't', text: 'x' }] },
    ],
    quiz: [{ q: '问题', options: ['甲', '乙'], answer: 0, explain: '解析' }],
    resources: [{ title: '资源', url: 'https://example.com' }],
  },
}

const invalid = (patch) => {
  const deep = structuredClone(base)
  const { set, ...rest } = patch
  if (set) for (const [path_, value] of Object.entries(set)) {
    const keys = path_.split('.')
    let o = deep
    for (const k of keys.slice(0, -1)) o = o[k]
    o[keys[keys.length - 1]] = value
  }
  return [deep, rest]
}

test('完整合法的课程通过', () => assert.deepEqual(validateLesson('demo', base), []))

test('slug 与目录名不一致报错', () => {
  const [l] = invalid({ set: { 'slug': 'other' } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('目录名')))
})

test('未知块类型显式报错', () => {
  const [l] = invalid({ set: { 'content.blocks.2': { type: 'timeline', title: '时间线' } } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('未知块类型')))
})

test('passage 锚过短报错', () => {
  const [l] = invalid({ set: { 'content.blocks.1.orig': [{ volume: 1, anchor: '太短' }] } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('anchor 需 ≥6 字')))
})

test('quiz answer 超出选项范围报错', () => {
  const [l] = invalid({ set: { 'content.quiz.0.answer': 2 } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('answer 超出选项范围')))
})

test('insight 缺 groups 和 items 报错', () => {
  const [l] = invalid({ set: { 'content.blocks.2': { type: 'insight', title: '空' } } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('groups 或 items')))
})

test('非正整数 seq 报错', () => {
  const [l] = invalid({ set: { 'seq': 0 } })
  assert.ok(validateLesson('demo', l).some((e) => e.includes('seq 需为正整数')))
})

test('高亮条目: 合法 / kind 非法 / 锚过短', () => {
  assert.deepEqual(validateHighlightEntry({ book: 1, anchor: '天子最重要的责任', pattern: '礼教', note: 'n', kind: 'boy' }), [])
  assert.ok(validateHighlightEntry({ book: 1, anchor: '天子最重要的责任', kind: 'x' }).some((e) => e.includes('kind')))
  assert.ok(validateHighlightEntry({ book: 1, anchor: '短', kind: 'boy' }).some((e) => e.includes('≥6 字')))
})
