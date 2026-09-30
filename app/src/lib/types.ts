// 共享内容类型: content/ 静态 JSON 的形状 (由 scripts/export-content.mjs 生成)

export interface VolumeMeta {
  num: number
  title: string
  era: string
  era_group: string
  range_text: string
}

export interface Segment {
  t?: string
  n?: string
}

export interface OrigPara {
  seq: number
  kind: string
  segments: Segment[]
  plain: string
  tj_year: number | null
}

export interface BoyPara {
  seq: number
  kind: string
  text: string
  by_year: number | null
  file?: string | null
}

export interface BookMeta {
  id: number
  title: string
  box: string
}

export interface BoySectionMeta {
  id: number
  kind: string
  title: string
  seq: number
  y0: number | null
  y1: number | null
}

export interface YearRangeEntry {
  id: number
  title: string
  book_title: string
  y0: number
  y1: number
}

export interface Highlight {
  pattern: string
  note: string
}

export interface LessonMeta {
  slug: string
  seq: number
  title: string
  subtitle: string
  focus: string
}

export interface QuizItem {
  q: string
  options: string[]
  answer: number
  explain: string
}

// 课程 passage 块: 导出时已把文白段落与两路批注烘焙进来, 页面无需再查语料
export interface PassageBlock {
  type: 'passage'
  title: string
  orig: { volume: number; seqs: number[]; paras: OrigPara[] }
  boy: { section: number; seqs: number[]; paras: BoyPara[] }
  highlights: Highlight[]
  origHighlights: Highlight[]
}

export interface LessonContent {
  keyPoints?: string[]
  intro: string[]
  blocks: Array<
    | { type: 'narration'; title: string; text: string }
    | PassageBlock
    | { type: 'insight'; title: string; items?: string[]; groups?: Array<{ tag: string; title: string; text: string }> }
  >
  quiz: QuizItem[]
  resources: Array<{ title: string; url: string }>
}

export interface LessonData extends LessonMeta {
  content: LessonContent
}

export interface Card {
  id: number
  lesson_slug: string
  front: string
  back: string
}

export function fmtYear(y: number): string {
  return y < 0 ? `前 ${-y}` : `${y}`
}
